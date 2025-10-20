import axios from 'axios';
import crypto from 'crypto';
import { storage } from '../storage';

interface BunnyCDNConfig {
  apiKey: string;
  storageZone: string;
  storagePassword: string;
  region: string;
  pullZoneUrl: string;
  tokenAuthKey: string;
}

interface UploadResult {
  success: boolean;
  cdnUrl?: string;
  fileName?: string;
  error?: string;
}

interface SignedUrlOptions {
  expiresIn?: number; // Seconds until expiry (default: 3600 = 1 hour)
  ipAddress?: string; // Optional IP restriction
  userAgent?: string; // Optional User-Agent restriction
}

class BunnyCDNService {
  private config: BunnyCDNConfig;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds
  private readonly DEFAULT_URL_EXPIRY = 3600; // 1 hour

  constructor() {
    this.config = {
      apiKey: process.env.bunny_api_key || process.env.BUNNYCDN_API_KEY || '',
      storageZone: process.env.BUNNYCDN_STORAGE_ZONE || '',
      storagePassword: process.env.BUNNYCDN_STORAGE_PASSWORD || '',
      region: process.env.BUNNYCDN_REGION || '',
      pullZoneUrl: process.env.BUNNYCDN_PULL_ZONE_URL || '',
      tokenAuthKey: process.env.BUNNYCDN_TOKEN_AUTH_KEY || ''
    };
  }

  private validateConfig(): void {
    if (!this.config.apiKey || !this.config.storageZone || !this.config.storagePassword) {
      throw new Error('BunnyCDN credentials not configured. Please set BUNNYCDN_API_KEY, BUNNYCDN_STORAGE_ZONE, and BUNNYCDN_STORAGE_PASSWORD environment variables.');
    }
  }

  private getStorageEndpoint(): string {
    // Fix region if it's the full URL instead of just the region code
    let regionPrefix = '';
    if (this.config.region && !this.config.region.includes('storage.bunnycdn.com')) {
      regionPrefix = `${this.config.region}.`;
    }
    return `https://${regionPrefix}storage.bunnycdn.com/${this.config.storageZone}`;
  }

  private getCDNUrl(fileName: string): string {
    // Use configured pull zone URL if available, otherwise default to storage zone
    let baseUrl = this.config.pullZoneUrl 
      ? this.config.pullZoneUrl 
      : `https://${this.config.storageZone}.b-cdn.net`;
    
    // Ensure the URL has https:// protocol
    if (baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    return `${baseUrl}/${fileName}`;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate a signed URL for secure access to BunnyCDN content
   * Uses BunnyCDN Token Authentication for URL security
   */
  generateSignedUrl(cdnUrl: string, options: SignedUrlOptions = {}): string {
    // If no token auth key configured, return original URL (public access)
    if (!this.config.tokenAuthKey) {
      console.warn('⚠️ BunnyCDN Token Auth Key not configured - returning public URL');
      return cdnUrl;
    }

    try {
      const expiresIn = options.expiresIn || this.DEFAULT_URL_EXPIRY;
      const expires = Math.floor(Date.now() / 1000) + expiresIn;
      
      // Parse the URL to get the path
      const url = new URL(cdnUrl);
      const path = url.pathname;
      
      // Build the base string for token generation
      let baseString = `${this.config.tokenAuthKey}${path}${expires}`;
      
      // Add optional IP restriction
      if (options.ipAddress) {
        baseString = `${baseString}${options.ipAddress}`;
      }
      
      // Generate the token using MD5 hash (BunnyCDN standard)
      const token = crypto.createHash('md5')
        .update(baseString)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      // Build signed URL with token and expiry
      const signedUrl = new URL(cdnUrl);
      signedUrl.searchParams.set('token', token);
      signedUrl.searchParams.set('expires', expires.toString());
      
      return signedUrl.toString();
    } catch (error: any) {
      console.error('Failed to generate signed URL:', error.message);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Generate a signed URL for a recording by ID
   */
  async generateRecordingSignedUrl(
    userId: number, 
    recordingId: number, 
    options: SignedUrlOptions = {}
  ): Promise<string | null> {
    try {
      const recording = await storage.getRecording(userId, recordingId);
      
      if (!recording || !recording.bunnycdnUrl) {
        return null;
      }
      
      return this.generateSignedUrl(recording.bunnycdnUrl, options);
    } catch (error: any) {
      console.error(`Failed to generate signed URL for recording ${recordingId}:`, error.message);
      return null;
    }
  }

  /**
   * Upload recording file to BunnyCDN with retry mechanism
   */
  async uploadRecording(
    userId: number,
    recordingId: number,
    audioBuffer: Buffer,
    originalFileName: string
  ): Promise<UploadResult> {
    this.validateConfig();

    const recording = await storage.getRecording(userId, recordingId);
    if (!recording) {
      throw new Error(`Recording ${recordingId} not found`);
    }

    // Use original Twilio recording SID as filename to ensure uniqueness
    const fileName = `recordings/${recording.twilioRecordingSid}.mp3`;
    const uploadUrl = `${this.getStorageEndpoint()}/${fileName}`;

    console.log(`📤 Starting BunnyCDN upload for recording ${recording.twilioRecordingSid}...`);
    console.log(`📤 Upload URL: ${uploadUrl}`);
    console.log(`📤 File size: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`📤 Upload attempt ${attempt}/${this.MAX_RETRIES} for ${fileName}`);

        const response = await axios.put(uploadUrl, audioBuffer, {
          headers: {
            'AccessKey': this.config.storagePassword,
            'Content-Type': 'audio/mpeg'
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 300000 // 5 minutes timeout
        });

        if (response.status === 201 || response.status === 200) {
          const cdnUrl = this.getCDNUrl(fileName);
          
          console.log(`✅ BunnyCDN upload successful for ${fileName}`);
          console.log(`✅ CDN URL: ${cdnUrl}`);

          // Update recording with BunnyCDN info
          await storage.updateRecording(userId, recordingId, {
            bunnycdnUrl: cdnUrl,
            bunnycdnFileName: fileName,
            bunnycdnUploadedAt: new Date(),
            status: 'ready'
          });

          return {
            success: true,
            cdnUrl,
            fileName
          };
        } else {
          throw new Error(`Unexpected response status: ${response.status}`);
        }
      } catch (error: any) {
        lastError = error;
        console.error(`❌ BunnyCDN upload attempt ${attempt} failed:`, error.message);

        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY * attempt; // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    const errorMessage = `Failed to upload to BunnyCDN after ${this.MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`;
    console.error(`❌ ${errorMessage}`);

    // Update recording status to error
    await storage.updateRecording(userId, recordingId, {
      status: 'error',
      metadata: {
        ...(recording.metadata as any || {}),
        bunnycdnUploadError: errorMessage,
        bunnycdnUploadFailedAt: new Date().toISOString()
      }
    });

    return {
      success: false,
      error: errorMessage
    };
  }

  /**
   * Delete recording from Twilio storage
   */
  async deleteTwilioRecording(
    userId: number,
    recordingId: number,
    twilioRecordingSid: string,
    twilioClient: any
  ): Promise<boolean> {
    const MAX_DELETE_RETRIES = 3;
    const DELETE_RETRY_DELAY = 2000; // 2 seconds
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_DELETE_RETRIES; attempt++) {
      try {
        console.log(`🗑️ Deleting Twilio recording ${twilioRecordingSid} (attempt ${attempt}/${MAX_DELETE_RETRIES})...`);

        // Delete from Twilio
        await twilioClient.recordings(twilioRecordingSid).remove();

        console.log(`✅ Successfully deleted Twilio recording ${twilioRecordingSid}`);

        // Update recording to mark as deleted from Twilio
        await storage.updateRecording(userId, recordingId, {
          twilioDeletedAt: new Date(),
          twilioUrl: null, // Clear Twilio URL since it's no longer accessible
          metadata: {
            ...(await storage.getRecording(userId, recordingId))?.metadata as any || {},
            twilioDeletedReason: 'automatic_cleanup_after_bunnycdn_upload',
            twilioDeletedAt: new Date().toISOString(),
            twilioDeleteAttempts: attempt
          }
        });

        return true;
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Failed to delete Twilio recording ${twilioRecordingSid} (attempt ${attempt}/${MAX_DELETE_RETRIES}):`, error.message);
        
        // If it's a 404 error, the recording is already deleted - consider it success
        if (error.status === 404 || error.code === 20404) {
          console.log(`✅ Twilio recording ${twilioRecordingSid} already deleted (404 response)`);
          await storage.updateRecording(userId, recordingId, {
            twilioDeletedAt: new Date(),
            twilioUrl: null,
            metadata: {
              ...(await storage.getRecording(userId, recordingId))?.metadata as any || {},
              twilioDeletedReason: 'already_deleted_404',
              twilioDeletedAt: new Date().toISOString()
            }
          });
          return true;
        }

        if (attempt < MAX_DELETE_RETRIES) {
          const delay = DELETE_RETRY_DELAY * attempt; // Exponential backoff
          console.log(`⏳ Retrying deletion in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed - log the error
    console.error(`❌ All ${MAX_DELETE_RETRIES} attempts to delete Twilio recording ${twilioRecordingSid} failed`);
    const recording = await storage.getRecording(userId, recordingId);
    await storage.updateRecording(userId, recordingId, {
      metadata: {
        ...(recording?.metadata as any || {}),
        twilioDeleteError: lastError?.message || 'Unknown error',
        twilioDeleteFailedAt: new Date().toISOString(),
        twilioDeleteAttempts: MAX_DELETE_RETRIES
      }
    });

    return false;
  }

  /**
   * Download recording from Twilio, upload to BunnyCDN, then delete from Twilio
   */
  async migrateRecordingToBunnyCDN(
    userId: number,
    recordingId: number,
    twilioClient: any,
    twilioCredentials: { accountSid: string; authToken: string }
  ): Promise<{ uploaded: boolean; deleted: boolean; cdnUrl?: string }> {
    const recording = await storage.getRecording(userId, recordingId);
    if (!recording) {
      throw new Error(`Recording ${recordingId} not found`);
    }

    // Check if already uploaded to BunnyCDN
    if (recording.bunnycdnUrl && recording.bunnycdnUploadedAt) {
      console.log(`⏭️ Recording ${recording.twilioRecordingSid} already uploaded to BunnyCDN, skipping upload`);
      
      // Still try to delete from Twilio if not already deleted
      if (!recording.twilioDeletedAt && recording.twilioUrl) {
        const deleted = await this.deleteTwilioRecording(userId, recordingId, recording.twilioRecordingSid, twilioClient);
        return {
          uploaded: true,
          deleted,
          cdnUrl: recording.bunnycdnUrl
        };
      }

      return {
        uploaded: true,
        deleted: !!recording.twilioDeletedAt,
        cdnUrl: recording.bunnycdnUrl
      };
    }

    if (!recording.twilioUrl) {
      throw new Error(`Recording ${recording.twilioRecordingSid} has no Twilio URL`);
    }

    if (!twilioCredentials || !twilioCredentials.accountSid || !twilioCredentials.authToken) {
      throw new Error(`Twilio credentials not provided for user ${userId}`);
    }

    try {
      // Step 1: Download from Twilio using provided credentials
      console.log(`📥 Downloading recording ${recording.twilioRecordingSid} from Twilio...`);
      
      const response = await axios.get(recording.twilioUrl, {
        auth: {
          username: twilioCredentials.accountSid,
          password: twilioCredentials.authToken
        },
        responseType: 'arraybuffer',
        timeout: 120000 // 2 minutes
      });

      const audioBuffer = Buffer.from(response.data);
      console.log(`✅ Downloaded ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB from Twilio`);

      // Step 2: Upload to BunnyCDN
      const uploadResult = await this.uploadRecording(
        userId,
        recordingId,
        audioBuffer,
        `${recording.twilioRecordingSid}.mp3`
      );

      if (!uploadResult.success) {
        return {
          uploaded: false,
          deleted: false,
          cdnUrl: undefined
        };
      }

      // Step 3: Delete from Twilio (only if upload was successful)
      console.log(`🗑️ Upload successful, now deleting from Twilio to save storage costs...`);
      const deleted = await this.deleteTwilioRecording(
        userId,
        recordingId,
        recording.twilioRecordingSid,
        twilioClient
      );

      return {
        uploaded: true,
        deleted,
        cdnUrl: uploadResult.cdnUrl
      };

    } catch (error: any) {
      console.error(`❌ Failed to migrate recording ${recording.twilioRecordingSid}:`, error.message);
      
      // Update recording with error
      await storage.updateRecording(userId, recordingId, {
        status: 'error',
        metadata: {
          ...(recording.metadata as any || {}),
          migrationError: error.message,
          migrationFailedAt: new Date().toISOString()
        }
      });

      throw error;
    }
  }

  /**
   * Check if BunnyCDN is configured
   */
  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.storageZone && this.config.storagePassword);
  }

  /**
   * Check if secure token authentication is configured
   */
  isSecureAccessConfigured(): boolean {
    return !!(this.config.tokenAuthKey && this.config.pullZoneUrl);
  }

  /**
   * Get configuration status for diagnostics
   */
  getConfigurationStatus(): {
    isConfigured: boolean;
    hasTokenAuth: boolean;
    hasPullZone: boolean;
    details: {
      apiKey: boolean;
      storageZone: boolean;
      storagePassword: boolean;
      tokenAuthKey: boolean;
      pullZoneUrl: boolean;
    };
  } {
    return {
      isConfigured: this.isConfigured(),
      hasTokenAuth: !!this.config.tokenAuthKey,
      hasPullZone: !!this.config.pullZoneUrl,
      details: {
        apiKey: !!this.config.apiKey,
        storageZone: !!this.config.storageZone,
        storagePassword: !!this.config.storagePassword,
        tokenAuthKey: !!this.config.tokenAuthKey,
        pullZoneUrl: !!this.config.pullZoneUrl
      }
    };
  }

  /**
   * List files in a directory within the storage zone
   */
  async listFiles(path: string = 'recordings/'): Promise<any[]> {
    this.validateConfig();
    
    try {
      const listUrl = `${this.getStorageEndpoint()}/${path}`;
      console.log(`📂 Listing files in BunnyCDN: ${listUrl}`);

      const response = await axios.get(listUrl, {
        headers: {
          'AccessKey': this.config.storagePassword
        }
      });

      console.log(`✅ Listed ${response.data?.length || 0} files/folders`);
      return response.data || [];
    } catch (error: any) {
      console.error(`❌ Failed to list files in ${path}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete a file from BunnyCDN storage
   */
  async deleteFile(fileName: string): Promise<boolean> {
    this.validateConfig();

    try {
      const deleteUrl = `${this.getStorageEndpoint()}/${fileName}`;
      console.log(`🗑️ Deleting file from BunnyCDN: ${deleteUrl}`);

      await axios.delete(deleteUrl, {
        headers: {
          'AccessKey': this.config.storagePassword
        }
      });

      console.log(`✅ Successfully deleted ${fileName} from BunnyCDN`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to delete ${fileName}:`, error.message);
      return false;
    }
  }

  /**
   * Get storage zone information using BunnyCDN API
   */
  async getStorageZoneInfo(): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('BunnyCDN API key not configured');
    }

    try {
      console.log('📊 Fetching storage zone information...');
      
      const response = await axios.get('https://api.bunny.net/storagezone', {
        headers: {
          'AccessKey': this.config.apiKey
        }
      });

      // Find our storage zone
      const zones = response.data || [];
      const ourZone = zones.find((zone: any) => zone.Name === this.config.storageZone);

      if (ourZone) {
        console.log(`✅ Found storage zone: ${ourZone.Name} (ID: ${ourZone.Id})`);
        return ourZone;
      } else {
        console.warn(`⚠️ Storage zone ${this.config.storageZone} not found in API response`);
        return null;
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch storage zone info:', error.message);
      throw error;
    }
  }

  /**
   * Get storage statistics for the zone
   */
  async getStorageStatistics(): Promise<{
    usedStorage: number;
    filesStored: number;
    storageZoneName: string;
    region: string;
  } | null> {
    try {
      const zoneInfo = await this.getStorageZoneInfo();
      
      if (!zoneInfo) {
        return null;
      }

      return {
        usedStorage: zoneInfo.StorageUsed || 0,
        filesStored: zoneInfo.FilesStored || 0,
        storageZoneName: zoneInfo.Name || this.config.storageZone,
        region: zoneInfo.Region || this.config.region
      };
    } catch (error: any) {
      console.error('❌ Failed to get storage statistics:', error.message);
      return null;
    }
  }

  /**
   * Purge CDN cache for a specific file or all files
   */
  async purgeCDNCache(cdnUrl?: string): Promise<boolean> {
    if (!this.config.apiKey) {
      throw new Error('BunnyCDN API key not configured');
    }

    try {
      if (cdnUrl) {
        // Purge specific URL
        console.log(`🔄 Purging CDN cache for: ${cdnUrl}`);
        
        await axios.post(
          'https://api.bunny.net/purge',
          { url: cdnUrl },
          {
            headers: {
              'AccessKey': this.config.apiKey,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`✅ Successfully purged cache for ${cdnUrl}`);
      } else {
        // Get pull zone ID first (need to list pull zones to find it)
        console.log('🔄 Purging entire CDN cache...');
        
        const pullZonesResponse = await axios.get('https://api.bunny.net/pullzone', {
          headers: {
            'AccessKey': this.config.apiKey
          }
        });

        const pullZones = pullZonesResponse.data || [];
        const ourPullZone = pullZones.find((zone: any) => 
          zone.StorageZoneId && zone.StorageZoneName === this.config.storageZone
        );

        if (ourPullZone) {
          await axios.post(
            `https://api.bunny.net/pullzone/${ourPullZone.Id}/purgeCache`,
            {},
            {
              headers: {
                'AccessKey': this.config.apiKey
              }
            }
          );
          console.log(`✅ Successfully purged entire cache for pull zone ${ourPullZone.Name}`);
        } else {
          console.warn('⚠️ Pull zone not found for cache purge');
          return false;
        }
      }

      return true;
    } catch (error: any) {
      console.error('❌ Failed to purge CDN cache:', error.message);
      return false;
    }
  }

  /**
   * Delete recording file from BunnyCDN by recording ID
   */
  async deleteRecordingFile(userId: number, recordingId: number): Promise<boolean> {
    try {
      const recording = await storage.getRecording(userId, recordingId);
      
      if (!recording || !recording.bunnycdnFileName) {
        console.warn(`⚠️ Recording ${recordingId} has no BunnyCDN file name`);
        return false;
      }

      const deleted = await this.deleteFile(recording.bunnycdnFileName);

      if (deleted) {
        // Update recording to mark as deleted from BunnyCDN
        await storage.updateRecording(userId, recordingId, {
          bunnycdnUrl: null,
          bunnycdnFileName: null,
          metadata: {
            ...(recording.metadata as any || {}),
            bunnycdnDeletedAt: new Date().toISOString(),
            bunnycdnDeletedReason: 'manual_deletion'
          }
        });

        console.log(`✅ Deleted recording ${recordingId} from BunnyCDN and updated database`);
      }

      return deleted;
    } catch (error: any) {
      console.error(`❌ Failed to delete recording ${recordingId} from BunnyCDN:`, error.message);
      return false;
    }
  }

  /**
   * Get detailed recording storage information
   */
  async getRecordingStorageInfo(): Promise<{
    totalRecordingsInCDN: number;
    totalSizeBytes: number;
    recordings: Array<{
      name: string;
      size: number;
      lastModified: string;
      path: string;
    }>;
  }> {
    try {
      const files = await this.listFiles('recordings/');
      
      const recordings = files
        .filter((file: any) => file.IsDirectory === false && file.ObjectName.endsWith('.mp3'))
        .map((file: any) => ({
          name: file.ObjectName,
          size: file.Length || 0,
          lastModified: file.LastChanged || '',
          path: `recordings/${file.ObjectName}`
        }));

      const totalSize = recordings.reduce((sum, rec) => sum + rec.size, 0);

      return {
        totalRecordingsInCDN: recordings.length,
        totalSizeBytes: totalSize,
        recordings
      };
    } catch (error: any) {
      console.error('❌ Failed to get recording storage info:', error.message);
      return {
        totalRecordingsInCDN: 0,
        totalSizeBytes: 0,
        recordings: []
      };
    }
  }
}

export const bunnycdnService = new BunnyCDNService();
