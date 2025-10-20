import { userTwilioCache } from "../userTwilioService";
import { storage } from "../storage";
import { insertRecordingSchema } from "@shared/schema";
import { z } from "zod";
import fs from "fs/promises";
import * as fsSync from "fs";
import path from "path";
import axios from "axios";
import crypto from "crypto";
import { wsService } from "../websocketService";

export interface TwilioRecording {
  sid: string;
  accountSid: string;
  callSid: string;
  uri: string;
  status: string;
  duration: string;
  dateCreated: string;
  dateUpdated: string;
  source: string;
  channels: number;
  startTime?: string;
  price?: string;
  priceUnit?: string;
}

export interface RecordingSyncOptions {
  forceRefresh?: boolean;
  downloadToLocal?: boolean;
  generateTranscription?: boolean;
  syncAll?: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

class RecordingService {
  private readonly RECORDINGS_DIR = path.join(process.cwd(), 'recordings');
  private readonly MAX_CONCURRENT_DOWNLOADS = 3;
  private readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks

  constructor() {
    this.ensureRecordingsDirectory();
  }

  private async ensureRecordingsDirectory() {
    try {
      await fs.mkdir(this.RECORDINGS_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create recordings directory:', error);
    }
  }

  /**
   * Sync recordings from Twilio API to local database
   */
  async syncRecordingsFromTwilio(userId: number, options: RecordingSyncOptions = {}): Promise<{
    synced: number;
    downloaded: number;
    errors: string[];
  }> {
    const result = {
      synced: 0,
      downloaded: 0,
      errors: [] as string[]
    };

    try {
      console.log(`🔄 Starting Twilio recordings sync for user ${userId}...`);
      
      // Get Twilio client for this user
      const { client: twilioClient } = await userTwilioCache.getTwilioClient(userId);
      if (!twilioClient) {
        throw new Error(`Twilio client not configured for user ${userId}`);
      }

      // Fetch recordings from Twilio
      let recordingsQuery = twilioClient.recordings.list({
        limit: options.syncAll ? undefined : 100,
        ...(options.dateRange && {
          dateCreatedAfter: options.dateRange.startDate,
          dateCreatedBefore: options.dateRange.endDate
        })
      });

      const twilioRecordings = await recordingsQuery;
      console.log(`📊 Found ${twilioRecordings.length} recordings in Twilio`);

      // Process recordings in batches
      const batchSize = 10;
      for (let i = 0; i < twilioRecordings.length; i += batchSize) {
        const batch = twilioRecordings.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (twilioRecording) => {
            try {
              await this.processRecording(userId, twilioRecording, options);
              result.synced++;
              
              if (options.downloadToLocal) {
                await this.downloadRecording(userId, twilioRecording.sid);
                result.downloaded++;
              }
            } catch (error: any) {
              console.error(`Error processing recording ${twilioRecording.sid}:`, error);
              result.errors.push(`Recording ${twilioRecording.sid}: ${error.message}`);
            }
          })
        );
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < twilioRecordings.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Sync completed: ${result.synced} synced, ${result.downloaded} downloaded`);
      return result;

    } catch (error: any) {
      console.error('❌ Recording sync failed:', error);
      result.errors.push(`Sync failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Process individual recording from Twilio
   */
  private async processRecording(userId: number, twilioRecording: any, options: RecordingSyncOptions) {
    try {
      // Check if recording already exists
      const existingRecording = await storage.getRecordingByTwilioSid(userId, twilioRecording.sid);
      
      if (existingRecording && !options.forceRefresh) {
        console.log(`⏭️ Recording ${twilioRecording.sid} already exists, skipping`);
        return existingRecording;
      }

      // Get call information if available
      const callInfo = await this.getCallInfo(userId, twilioRecording.callSid);
      
      // Prepare recording data
      const recordingData = {
        twilioRecordingSid: twilioRecording.sid,
        twilioCallSid: twilioRecording.callSid,
        twilioAccountSid: twilioRecording.accountSid,
        userId: callInfo?.userId || userId,
        phone: callInfo?.phone || 'Unknown',
        direction: this.mapTwilioDirection(twilioRecording.source),
        duration: parseInt(twilioRecording.duration) || 0,
        twilioUrl: `https://api.twilio.com${twilioRecording.uri.replace('.json', '.mp3')}`,
        audioCodec: 'mp3',
        channels: twilioRecording.channels || 1,
        status: this.mapTwilioStatus(twilioRecording.status),
        recordingSource: twilioRecording.source,
        recordingStartTime: new Date(twilioRecording.dateCreated),
        metadata: {
          originalTwilioData: twilioRecording,
          price: twilioRecording.price,
          priceUnit: twilioRecording.priceUnit
        },
        ...callInfo
      };

      if (existingRecording) {
        // Update existing recording
        const updated = await storage.updateRecording(userId, existingRecording.id, recordingData);
        wsService.broadcastRecordingUpdate(userId, updated);
        return updated;
      } else {
        // Create new recording
        const created = await storage.createRecording(userId, recordingData);
        wsService.broadcastNewRecording(userId, created);
        return created;
      }

    } catch (error) {
      console.error(`Failed to process recording ${twilioRecording.sid}:`, error);
      throw error;
    }
  }

  /**
   * Download recording and upload to BunnyCDN (no local storage to reduce server load)
   */
  async downloadRecording(userId: number, twilioRecordingSid: string): Promise<string> {
    try {
      console.log(`📥 Downloading recording ${twilioRecordingSid} for user ${userId}...`);
      
      const recording = await storage.getRecordingByTwilioSid(userId, twilioRecordingSid);
      if (!recording) {
        throw new Error('Recording not found in database');
      }

      // Check if already uploaded to BunnyCDN
      if (recording.bunnycdnUrl) {
        console.log(`📁 Recording ${twilioRecordingSid} already on BunnyCDN: ${recording.bunnycdnUrl}`);
        return recording.bunnycdnUrl;
      }

      const { client: twilioClient, credentials } = await userTwilioCache.getTwilioClient(userId);
      if (!credentials) {
        throw new Error(`Twilio credentials not configured for user ${userId}`);
      }

      // Download to memory (Buffer) instead of disk to reduce server load
      const response = await axios({
        method: 'GET',
        url: recording.twilioUrl!,
        auth: {
          username: credentials.accountSid,
          password: credentials.authToken
        },
        responseType: 'arraybuffer'
      });

      const audioBuffer = Buffer.from(response.data);
      const downloadedBytes = audioBuffer.length;
      
      console.log(`✅ Downloaded ${(downloadedBytes/1024/1024).toFixed(2)}MB from Twilio`);

      // Upload to BunnyCDN if configured
      const { bunnycdnService } = await import('./bunnycdnService');
      
      if (bunnycdnService.isConfigured()) {
        // Upload using the Buffer we just downloaded (no re-download)
        const uploadResult = await bunnycdnService.uploadRecording(
          userId,
          recording.id,
          audioBuffer,
          `${twilioRecordingSid}.mp3`
        );

        if (uploadResult.success && uploadResult.cdnUrl) {
          console.log(`✅ Recording ${twilioRecordingSid} uploaded to BunnyCDN: ${uploadResult.cdnUrl}`);
          
          // Delete from Twilio to save costs
          try {
            await bunnycdnService.deleteTwilioRecording(
              userId,
              recording.id,
              twilioRecordingSid,
              twilioClient
            );
            console.log(`✅ Recording ${twilioRecordingSid} deleted from Twilio`);
          } catch (deleteError: any) {
            console.warn(`⚠️ Failed to delete recording from Twilio: ${deleteError.message}`);
          }
          
          return uploadResult.cdnUrl;
        }
      } else {
        console.log(`⏭️ BunnyCDN not configured, skipping upload`);
      }

      // Fallback: Update recording status if BunnyCDN upload failed
      if (recording.userId !== null) {
        await storage.updateRecording(recording.userId, recording.id, {
          fileSize: downloadedBytes,
          downloadedAt: new Date(),
          status: 'ready'
        });
      }

      return recording.twilioUrl || '';

    } catch (error: any) {
      console.error(`❌ Failed to download recording ${twilioRecordingSid}:`, error);
      
      // Update status to error
      const recording = await storage.getRecordingByTwilioSid(userId, twilioRecordingSid);
      if (recording && recording.userId !== null) {
        await storage.updateRecording(recording.userId, recording.id, { status: 'error' });
      }
      
      throw error;
    }
  }

  /**
   * Generate transcript for recording using AI
   */
  async generateTranscript(userId: number, recordingId: number): Promise<string> {
    try {
      const recording = await storage.getRecording(userId, recordingId);
      if (!recording) {
        throw new Error('Recording not found');
      }

      if (recording.transcript) {
        return recording.transcript;
      }

      // Update status to transcribing
      if (recording.userId !== null) {
        await storage.updateRecording(recording.userId, recordingId, {
          transcriptionStatus: 'processing'
        });
      }

      // Simulate AI transcription (replace with actual AI service)
      const transcript = `[AI Transcript] Call transcript for recording ${recording.twilioRecordingSid}. Duration: ${recording.duration}s. This is a placeholder transcript that would be generated by an AI service like OpenAI Whisper, Google Speech-to-Text, or similar.`;

      // Update with transcript
      if (recording.userId !== null) {
        await storage.updateRecording(recording.userId, recordingId, {
          transcript,
          transcriptionStatus: 'completed',
          transcriptionAccuracy: "95.50",
          processedAt: new Date()
        });
      }

      return transcript;

    } catch (error: any) {
      console.error(`Failed to generate transcript:`, error);
      
      // Update status to error  
      const recording = await storage.getRecording(userId, recordingId);
      if (recording && recording.userId !== null) {
        await storage.updateRecording(recording.userId, recordingId, {
          transcriptionStatus: 'failed'
        });
      }
      
      throw error;
    }
  }

  /**
   * Analyze recording with AI for insights
   */
  async analyzeRecording(userId: number, recordingId: number): Promise<void> {
    try {
      const recording = await storage.getRecording(userId, recordingId);
      if (!recording) {
        throw new Error('Recording not found');
      }

      // Ensure we have a transcript first
      let transcript = recording.transcript;
      if (!transcript && recording.userId !== null) {
        transcript = await this.generateTranscript(recording.userId, recordingId);
      }

      // Simulate AI analysis (replace with actual AI service)
      const analysis = {
        summary: `Call summary for ${recording.phone}: Discussed product features and pricing. Customer showed interest in premium plan.`,
        sentiment: 'positive',
        sentimentScore: "0.75",
        keywords: ['product', 'pricing', 'premium', 'features', 'interested'],
        topics: ['product demo', 'pricing discussion', 'sales qualification'],
        actionItems: [
          { task: 'Send pricing proposal', priority: 'high', dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) },
          { task: 'Schedule follow-up call', priority: 'medium', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) }
        ]
      };

      // Update recording with analysis
      if (recording.userId !== null) {
        await storage.updateRecording(recording.userId, recordingId, analysis);
      }

    } catch (error) {
      console.error(`Failed to analyze recording:`, error);
      throw error;
    }
  }

  /**
   * Clean up old recordings based on retention policy
   */
  async cleanupOldRecordings(userId: number): Promise<number> {
    try {
      console.log('🧹 Starting recording cleanup...');
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 365); // Default 365 days retention

      const oldRecordings = await storage.getRecordingsOlderThan(userId, cutoffDate);
      let deletedCount = 0;

      for (const recording of oldRecordings) {
        try {
          // Delete local file if exists
          if (recording.localFilePath && await this.fileExists(recording.localFilePath)) {
            await fs.unlink(recording.localFilePath);
          }

          // Delete from database
          if (recording.userId !== null) {
            await storage.deleteRecording(recording.userId, recording.id);
            deletedCount++;
          }

        } catch (error) {
          console.error(`Failed to delete recording ${recording.id}:`, error);
        }
      }

      console.log(`🗑️ Cleanup completed: ${deletedCount} recordings deleted`);
      return deletedCount;

    } catch (error: any) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }

  // Helper methods
  private async getCallInfo(userId: number, callSid: string): Promise<any> {
    try {
      // Get call information from database or Twilio
      const call = await storage.getCallByTwilioSid?.(callSid);
      // Verify the call belongs to this user
      if (call && call.userId === userId) {
        return {
          callId: call.id,
          contactId: call.contactId,
          phone: call.phone,
          callerName: call.phone,
          direction: call.type
        };
      }
      return null;
    } catch (error) {
      console.error(`Failed to get call info for ${callSid}:`, error);
      return null;
    }
  }

  private mapTwilioDirection(source: string): string {
    switch (source) {
      case 'DialVerb':
      case 'Conference':
      case 'Outbound':
        return 'outbound';
      case 'RecordVerb':
      case 'Inbound':
      default:
        return 'inbound';
    }
  }

  private mapTwilioStatus(status: string): string {
    switch (status) {
      case 'completed':
        return 'ready';
      case 'in-progress':
        return 'processing';
      case 'failed':
        return 'error';
      default:
        return 'processing';
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get recording statistics
   */
  async getRecordingStats(userId: number): Promise<{
    total: number;
    totalDuration: number;
    totalSize: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    recentActivity: any[];
  }> {
    try {
      const stats = await storage.getRecordingStats(userId);
      return stats;
    } catch (error) {
      console.error('Failed to get recording stats:', error);
      throw error;
    }
  }
}

export const recordingService = new RecordingService();