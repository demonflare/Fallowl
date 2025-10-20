import { twimlAuditor } from '../utils/twimlAuditor';

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 TwiML Application Webhook Audit & Fix Utility');
  console.log('='.repeat(80) + '\n');
  
  try {
    const summary = await twimlAuditor.auditAllUsers();
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ AUDIT COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    
    if (summary.usersFixed > 0) {
      console.log(`\n🎉 Fixed ${summary.usersFixed} TwiML Application(s) with incorrect webhooks!`);
    }
    
    if (summary.usersWithErrors > 0) {
      console.log(`\n⚠️  ${summary.usersWithErrors} user(s) encountered errors. Check logs above for details.`);
    }
    
    if (summary.usersWithoutTwiML > 0) {
      console.log(`\nℹ️  ${summary.usersWithoutTwiML} user(s) don't have TwiML Apps yet (will be auto-created on first use).`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Audit failed with error:', error);
    process.exit(1);
  }
}

main();
