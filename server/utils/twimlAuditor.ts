import { storage } from '../storage';
import { userTwilioCache } from '../userTwilioService';
import { generateWebhookToken } from '../routes';

interface AuditResult {
  userId: number;
  username: string;
  twimlAppSid: string | null;
  status: 'ok' | 'fixed' | 'error' | 'no_twiml_app';
  message: string;
  webhookUrls?: {
    before?: {
      voiceUrl: string | null;
      statusCallback: string | null;
    };
    after?: {
      voiceUrl: string;
      statusCallback: string;
    };
  };
}

interface AuditSummary {
  totalUsers: number;
  usersChecked: number;
  usersOk: number;
  usersFixed: number;
  usersWithErrors: number;
  usersWithoutTwiML: number;
  results: AuditResult[];
}

export class TwiMLAuditor {
  private getBaseUrl(): string {
    if (process.env.REPLIT_DOMAINS) {
      return `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
    }
    if (process.env.REPLIT_DEV_DOMAIN) {
      return `https://${process.env.REPLIT_DEV_DOMAIN}`;
    }
    return 'https://localhost:5000';
  }

  private getExpectedUrls(userId: number) {
    const baseUrl = this.getBaseUrl();
    const token = generateWebhookToken(userId);
    return {
      voiceUrl: `${baseUrl}/api/twilio/voice?token=${encodeURIComponent(token)}`,
      statusCallback: `${baseUrl}/api/twilio/status?token=${encodeURIComponent(token)}`,
    };
  }

  public async auditUser(userId: number): Promise<AuditResult> {
    const user = await storage.getUser(userId);
    
    if (!user) {
      return {
        userId,
        username: 'Unknown',
        twimlAppSid: null,
        status: 'error',
        message: 'User not found'
      };
    }

    // Check if user has Twilio configured
    const dbCredentials = await storage.getUserTwilioCredentials(userId);
    if (!dbCredentials || !dbCredentials.twilioConfigured) {
      return {
        userId,
        username: user.username,
        twimlAppSid: null,
        status: 'no_twiml_app',
        message: 'Twilio not configured for this user'
      };
    }

    // Check if user has a TwiML App SID
    if (!dbCredentials.twilioTwimlAppSid) {
      return {
        userId,
        username: user.username,
        twimlAppSid: null,
        status: 'no_twiml_app',
        message: 'No TwiML App SID found (will be auto-created on first use)'
      };
    }

    try {
      // Get Twilio client for this user
      const { client, credentials } = await userTwilioCache.getTwilioClient(userId);
      
      // Fetch the TwiML App
      const twimlApp = await client.applications(credentials.twimlAppSid!).fetch();
      
      const expected = this.getExpectedUrls(userId);
      const currentVoiceUrl = twimlApp.voiceUrl || '';
      const currentStatusCallback = twimlApp.statusCallback || '';
      
      // Check if webhooks are correct
      const needsUpdate = 
        currentVoiceUrl !== expected.voiceUrl ||
        currentStatusCallback !== expected.statusCallback ||
        twimlApp.voiceMethod !== 'POST' ||
        twimlApp.statusCallbackMethod !== 'POST';

      if (!needsUpdate) {
        return {
          userId,
          username: user.username,
          twimlAppSid: credentials.twimlAppSid!,
          status: 'ok',
          message: 'TwiML App webhooks are correctly configured',
          webhookUrls: {
            after: expected
          }
        };
      }

      // Update the TwiML App
      console.log(`🔧 Fixing TwiML App webhooks for user ${userId} (${user.username})...`);
      
      const updatedApp = await client.applications(credentials.twimlAppSid!).update({
        voiceUrl: expected.voiceUrl,
        voiceMethod: 'POST',
        statusCallback: expected.statusCallback,
        statusCallbackMethod: 'POST'
      });

      return {
        userId,
        username: user.username,
        twimlAppSid: credentials.twimlAppSid!,
        status: 'fixed',
        message: 'TwiML App webhooks have been corrected',
        webhookUrls: {
          before: {
            voiceUrl: currentVoiceUrl,
            statusCallback: currentStatusCallback
          },
          after: expected
        }
      };
    } catch (error: any) {
      return {
        userId,
        username: user.username,
        twimlAppSid: dbCredentials.twilioTwimlAppSid,
        status: 'error',
        message: `Failed to audit/fix TwiML App: ${error.message}`
      };
    }
  }

  public async auditAllUsers(): Promise<AuditSummary> {
    console.log('🔍 Starting TwiML App webhook audit for all users...');
    
    // Get all users with Twilio configured
    const allUsers = await storage.getAllUsers();
    const usersWithTwilio = allUsers.filter(u => u.twilioConfigured);
    
    console.log(`Found ${usersWithTwilio.length} users with Twilio configured out of ${allUsers.length} total users`);
    
    const results: AuditResult[] = [];
    
    for (const user of usersWithTwilio) {
      console.log(`\n📋 Auditing user ${user.id} (${user.username})...`);
      const result = await this.auditUser(user.id);
      results.push(result);
      
      // Log result
      const statusEmoji = {
        'ok': '✅',
        'fixed': '🔧',
        'error': '❌',
        'no_twiml_app': '⚠️'
      }[result.status];
      
      console.log(`${statusEmoji} User ${user.id} (${user.username}): ${result.message}`);
    }
    
    const summary: AuditSummary = {
      totalUsers: allUsers.length,
      usersChecked: usersWithTwilio.length,
      usersOk: results.filter(r => r.status === 'ok').length,
      usersFixed: results.filter(r => r.status === 'fixed').length,
      usersWithErrors: results.filter(r => r.status === 'error').length,
      usersWithoutTwiML: results.filter(r => r.status === 'no_twiml_app').length,
      results
    };
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 AUDIT SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total users in system: ${summary.totalUsers}`);
    console.log(`Users with Twilio configured: ${summary.usersChecked}`);
    console.log(`✅ Already correct: ${summary.usersOk}`);
    console.log(`🔧 Fixed automatically: ${summary.usersFixed}`);
    console.log(`❌ Errors encountered: ${summary.usersWithErrors}`);
    console.log(`⚠️  No TwiML App yet: ${summary.usersWithoutTwiML}`);
    console.log('='.repeat(80));
    
    return summary;
  }

  public async createOrFixTwiMLApp(userId: number): Promise<AuditResult> {
    const user = await storage.getUser(userId);
    
    if (!user) {
      return {
        userId,
        username: 'Unknown',
        twimlAppSid: null,
        status: 'error',
        message: 'User not found'
      };
    }

    const baseUrl = this.getBaseUrl();
    
    try {
      // This will create a new TwiML App or fix existing one
      const application = await userTwilioCache.createTwiMLApplication(userId, baseUrl);
      
      return {
        userId,
        username: user.username,
        twimlAppSid: application.sid,
        status: 'fixed',
        message: 'TwiML App created/updated successfully',
        webhookUrls: {
          after: this.getExpectedUrls(userId)
        }
      };
    } catch (error: any) {
      return {
        userId,
        username: user.username,
        twimlAppSid: null,
        status: 'error',
        message: `Failed to create/fix TwiML App: ${error.message}`
      };
    }
  }
}

export const twimlAuditor = new TwiMLAuditor();
