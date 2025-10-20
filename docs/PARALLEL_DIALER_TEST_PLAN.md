# Parallel Dialer Testing Plan

## Overview
This document outlines the comprehensive testing strategy for the updated parallel dialer system, focusing on WebRTC session management, audio quality, call bridging, and agent availability handling.

## Testing Objectives

### 1. WebRTC Session Reuse
**Requirement**: Incoming calls must use the existing WebRTC session without creating new connections.

**Current Implementation**:
- Uses `answerOnBridge="true"` in TwiML Dial verb (line 3895 in server/routes.ts)
- WebRTC device managed by `useTwilioDeviceV2` hook (singleton pattern)
- Agent identity passed via `<Client>` element with custom parameters

**Test Scenarios**:
- [ ] **TS-01**: Verify single WebRTC device instance across multiple parallel calls
- [ ] **TS-02**: Confirm no duplicate device registration on incoming calls
- [ ] **TS-03**: Validate WebRTC connection state remains stable during parallel dialing
- [ ] **TS-04**: Monitor WebRTC statistics (RTCPeerConnection.getStats()) for connection reuse
- [ ] **TS-05**: High-concurrency test - 10+ simultaneous parallel calls on same device
- [ ] **TS-06**: Token refresh during active calls - verify seamless re-authentication
- [ ] **TS-07**: Token expiration failure - validate graceful degradation and recovery
- [ ] **TS-08**: Device teardown during active calls - test cleanup and reconnection
- [ ] **TS-09**: Simultaneous connect/disconnect race conditions across lines
- [ ] **TS-10**: Device re-registration after network interruption with active calls

**Expected Behavior**:
- Only one Twilio Device instance should exist per user session
- Device.on('incoming') events should fire for each call without re-registration
- WebSocket connection to Twilio should remain persistent
- Token refresh (every 50 minutes) should not interrupt active calls
- Device handles 10+ concurrent calls without degradation
- Failed token refresh triggers alert but maintains existing calls until expiry

### 2. Pre-Recorded Media Playback
**Requirement**: Pre-recorded media should play correctly before the agent joins the call.

**Current Implementation Status**:
- ❌ NOT IMPLEMENTED - Current TwiML directly connects to agent without greeting
- Location: Line 3917-3928 in server/routes.ts (parallel-call-voice webhook)

**Proposed Implementation**:
```xml
<Response>
  <Play>https://your-cdn.com/greeting.mp3</Play>
  <Dial answerOnBridge="true" ...>
    <Client>...</Client>
  </Dial>
</Response>
```

**Test Scenarios**:
- [ ] **TS-11**: Verify greeting plays immediately when customer answers (< 200ms)
- [ ] **TS-12**: Confirm agent connection timing after greeting completion
- [ ] **TS-13**: Validate no audio gaps between greeting end and agent connection (< 50ms)
- [ ] **TS-14**: Test greeting abortion - agent unavailable during playback
- [ ] **TS-15**: Mid-greeting abort - customer hangs up during playback
- [ ] **TS-16**: Mixed line outcomes - greeting plays on line 1, fails on line 2
- [ ] **TS-17**: Greeting buffer underrun - test slow network conditions
- [ ] **TS-18**: Monitor media playback latency and buffer times

**Success Metrics (Measurable Thresholds)**:
- Greeting start delay: < 200ms (PASS), 200-500ms (WARN), > 500ms (FAIL)
- Greeting-to-agent gap: < 50ms (PASS), 50-150ms (WARN), > 150ms (FAIL)
- Greeting completion rate: > 95% (PASS), 90-95% (WARN), < 90% (FAIL)
- Agent hears first 100ms of greeting: 0% of calls (PASS), any % (FAIL)
- Mid-greeting abort recovery: < 1s (PASS), 1-2s (WARN), > 2s (FAIL)

**Expected Behavior**:
- Customer hears greeting within 200ms of answering
- Agent connection occurs seamlessly after greeting completes (< 50ms gap)
- No echo or audio loop of greeting to agent
- If agent unavailable during greeting: Abort to voicemail with < 1s transition
- If customer hangs up mid-greeting: Immediate call termination, no orphaned media

### 3. Seamless Call Bridging
**Requirement**: Calls must bridge to the agent without extra call setup or double ringing.

**Current Implementation**:
- `answerOnBridge="true"` ensures customer doesn't hear ringback (line 3893 comment)
- Custom parameters passed to client for auto-accept (lines 3922-3925)
- WebSocket events trigger UI updates (ParallelDialerPage.tsx lines 374-386)

**Test Scenarios**:
- [ ] **TS-19**: Verify customer never hears agent's phone ringing (100% of calls)
- [ ] **TS-20**: Confirm single "connected" event fires (no duplicate state transitions)
- [ ] **TS-21**: Validate agent auto-accepts without manual interaction
- [ ] **TS-22**: Test call bridging time (answer → connected) with measurable thresholds
- [ ] **TS-23**: Monitor for duplicate TwiML responses or webhook calls
- [ ] **TS-24**: Simultaneous line bridging - multiple calls connecting at once
- [ ] **TS-25**: Mixed outcomes - one line bridges, another times out
- [ ] **TS-26**: Race condition - line disconnect during bridge establishment

**Success Metrics (Measurable Thresholds)**:
- Bridge time (answer → connected): < 300ms (PASS), 300-500ms (WARN), > 500ms (FAIL)
- Ringback elimination: 100% (PASS), > 0% (FAIL)
- Duplicate events: 0 duplicates (PASS), any duplicates (FAIL)
- Auto-accept success rate: > 99% (PASS), 95-99% (WARN), < 95% (FAIL)
- Simultaneous bridge handling: All lines bridge independently without interference (PASS)

**Expected Behavior**:
- Customer experience: Answer → Greeting (optional) → Agent (immediate)
- No ringback tone to customer (answerOnBridge enforced)
- Agent UI shows "connected" without "ringing" state for parallel calls
- WebSocket `parallel_call_connected` event fires exactly once per call
- Multiple lines can bridge simultaneously without contention
- Failed bridges on one line don't affect successful bridges on others

### 4. Audio Quality & Latency
**Requirement**: No audio gaps, minimal latency, clear audio quality.

**Test Scenarios**:
- [ ] **TS-27**: Measure audio latency using echo test methodology
- [ ] **TS-28**: Check for audio gaps during greeting → agent transition (< 50ms)
- [ ] **TS-29**: Test audio quality with various network conditions (throttled, lossy)
- [ ] **TS-30**: Monitor jitter buffer and packet loss metrics across all lines
- [ ] **TS-31**: Validate bidirectional audio flow (customer ↔ agent) on each line
- [ ] **TS-32**: Simultaneous calls audio isolation - no crosstalk between lines
- [ ] **TS-33**: Audio quality degradation under high load (10+ concurrent calls)

**Success Metrics (Measurable Thresholds)**:
- RTT (Round Trip Time): < 100ms (PASS), 100-150ms (WARN), > 150ms (FAIL)
- Jitter: < 20ms (PASS), 20-30ms (WARN), > 30ms (FAIL)
- Packet Loss: < 0.5% (PASS), 0.5-1% (WARN), > 1% (FAIL)
- MOS (Mean Opinion Score): > 4.2 (PASS), 4.0-4.2 (WARN), < 4.0 (FAIL)
- Audio gaps: 0 gaps > 50ms (PASS), 1-3 gaps (WARN), > 3 gaps (FAIL)
- Connection establishment: < 300ms (PASS), 300-500ms (WARN), > 500ms (FAIL)
- Crosstalk incidents: 0 (PASS), any (FAIL)

### 5. Agent Unavailability Handling
**Requirement**: Proper handling if the agent is unavailable or doesn't answer.

**Current Implementation**:
- Timeout set to 30 seconds in Dial verb (line 3895)
- No explicit unavailable/offline detection before dialing

**Test Scenarios**:
- [ ] **TS-34**: Test behavior when agent's browser is closed
- [ ] **TS-35**: Verify timeout handling after 30 seconds
- [ ] **TS-36**: Test when agent WebRTC device is offline
- [ ] **TS-37**: Validate voicemail/fallback after agent timeout
- [ ] **TS-38**: Test agent DND (Do Not Disturb) status handling
- [ ] **TS-39**: Multiple unavailable agents - fallback chain testing

**Success Metrics (Measurable Thresholds)**:
- Agent offline detection: < 100ms (PASS), 100-500ms (WARN), > 500ms (FAIL)
- Timeout accuracy: 30s ± 0.5s (PASS), ± 0.5-2s (WARN), > ±2s (FAIL)
- Fallback transition: < 1s (PASS), 1-2s (WARN), > 2s (FAIL)
- Customer wait time (unavailable): < 5s (PASS), 5-10s (WARN), > 10s (FAIL)

**Expected Behavior**:
- If agent offline: Immediate fallback to voicemail or message (< 100ms detection)
- If agent timeout: After 30s, play "agent unavailable" message
- Call marked as "no-answer" in database with proper metadata
- Customer doesn't wait indefinitely
- Multiple unavailable checks execute in parallel for efficiency

**Proposed Enhancement**:
```javascript
// Check agent status before initiating call
const agentDevice = await getAgentDeviceStatus(userId);
if (!agentDevice.isReady) {
  // Return TwiML with voicemail or message instead
  return voicemailTwiML();
}
```

### 6. Centralized Logging System
**Requirement**: Structured, persistent logging for debugging and performance analysis.

**Current Logging Gaps**:
- ❌ Console-only logging (not persisted, lost on restart)
- ❌ No correlation IDs to track calls across services
- ❌ No retention policy or log rotation
- ❌ No centralized aggregation or querying

**Centralized Logging Strategy**:

#### A. Structured Log Format with Correlation IDs
```typescript
interface ParallelDialerLogEntry {
  // Core identifiers
  correlationId: string;        // Unique ID for entire call session
  callSid: string;              // Twilio Call SID
  userId: number;               // Agent user ID
  lineId: string;               // Parallel dialer line ID
  
  // Event metadata
  eventType: string;            // 'call_initiated' | 'state_change' | 'audio_stats' | etc.
  timestamp: string;            // ISO 8601 timestamp
  severity: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  
  // Call state
  previousState?: string;
  currentState: string;
  duration?: number;            // seconds
  
  // Performance metrics
  audioStats?: {
    rtt: number;                // ms
    jitter: number;             // ms
    packetLoss: number;         // percentage (0-1)
    mos?: number;               // Mean Opinion Score
    audioLevel: number;         // dB
  };
  
  // Context
  metadata: {
    contactId?: number;
    amdResult?: 'human' | 'machine' | 'fax';
    errorDetails?: any;
    requestContext?: any;
  };
  
  // Tracing
  spanId?: string;              // Distributed tracing span ID
  parentSpanId?: string;
}
```

#### B. Persistence Strategy

**Database Schema** (add to shared/schema.ts):
```typescript
export const parallelDialerLogs = pgTable('parallel_dialer_logs', {
  id: serial('id').primaryKey(),
  correlationId: varchar('correlation_id', { length: 255 }).notNull(),
  callSid: varchar('call_sid', { length: 34 }),
  userId: integer('user_id').references(() => users.id),
  lineId: varchar('line_id', { length: 50 }),
  
  eventType: varchar('event_type', { length: 100 }).notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  severity: varchar('severity', { length: 20 }).notNull(),
  
  previousState: varchar('previous_state', { length: 50 }),
  currentState: varchar('current_state', { length: 50 }),
  duration: integer('duration'),
  
  audioStats: jsonb('audio_stats'),
  metadata: jsonb('metadata'),
  
  spanId: varchar('span_id', { length: 255 }),
  parentSpanId: varchar('parent_span_id', { length: 255 }),
  
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Index for fast querying
CREATE INDEX idx_correlation_id ON parallel_dialer_logs(correlation_id);
CREATE INDEX idx_call_sid ON parallel_dialer_logs(call_sid);
CREATE INDEX idx_timestamp ON parallel_dialer_logs(timestamp DESC);
CREATE INDEX idx_severity ON parallel_dialer_logs(severity);
```

#### C. Retention Policy

```typescript
// Auto-delete logs older than retention period
const LOG_RETENTION_DAYS = {
  debug: 7,      // 7 days for debug logs
  info: 30,      // 30 days for info logs
  warn: 90,      // 90 days for warnings
  error: 365,    // 1 year for errors
  critical: -1   // Never delete critical logs
};

// Scheduled cleanup job (runs daily)
async function cleanupOldLogs() {
  for (const [severity, days] of Object.entries(LOG_RETENTION_DAYS)) {
    if (days === -1) continue;
    
    await db.delete(parallelDialerLogs)
      .where(
        and(
          eq(parallelDialerLogs.severity, severity),
          lt(parallelDialerLogs.timestamp, new Date(Date.now() - days * 24 * 60 * 60 * 1000))
        )
      );
  }
}
```

#### D. Logging Service Implementation

**File: server/services/parallelDialerLogger.ts**
```typescript
import { nanoid } from 'nanoid';
import { storage } from '../storage';

class ParallelDialerLogger {
  private static instance: ParallelDialerLogger;
  
  public static getInstance(): ParallelDialerLogger {
    if (!this.instance) {
      this.instance = new ParallelDialerLogger();
    }
    return this.instance;
  }
  
  // Generate correlation ID for new call session
  generateCorrelationId(): string {
    return `pdialer_${nanoid(21)}`;
  }
  
  // Log event with automatic persistence
  async log(entry: Partial<ParallelDialerLogEntry>) {
    // Console log for development
    const emoji = this.getSeverityEmoji(entry.severity || 'info');
    console.log(`${emoji} [${entry.eventType}]`, entry);
    
    // Persist to database
    try {
      await storage.createParallelDialerLog({
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString(),
        severity: entry.severity || 'info'
      });
    } catch (error) {
      console.error('Failed to persist log:', error);
      // Fallback to file-based logging
      this.fallbackLog(entry);
    }
  }
  
  // Fallback file-based logging when DB unavailable
  private fallbackLog(entry: any) {
    const fs = require('fs');
    const logFile = '/tmp/parallel_dialer_fallback.log';
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  }
  
  private getSeverityEmoji(severity: string): string {
    const emojiMap = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      critical: '🚨'
    };
    return emojiMap[severity] || 'ℹ️';
  }
  
  // Query logs by correlation ID
  async getCallLogs(correlationId: string) {
    return await storage.getParallelDialerLogsByCorrelationId(correlationId);
  }
  
  // Query logs with filters
  async queryLogs(filters: {
    userId?: number;
    callSid?: string;
    eventType?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    return await storage.queryParallelDialerLogs(filters);
  }
}

export const dialerLogger = ParallelDialerLogger.getInstance();
```

#### E. Usage Examples

**Logging call initiation:**
```typescript
const correlationId = dialerLogger.generateCorrelationId();

await dialerLogger.log({
  correlationId,
  callSid: response.callSid,
  userId,
  lineId,
  eventType: 'call_initiated',
  severity: 'info',
  currentState: 'initiating',
  metadata: {
    contactId,
    phone,
    amdEnabled
  }
});
```

**Logging state changes:**
```typescript
await dialerLogger.log({
  correlationId,
  callSid,
  userId,
  lineId,
  eventType: 'call_state_change',
  severity: 'info',
  previousState: 'ringing',
  currentState: 'connected',
  duration: callDuration,
  metadata: { amdResult: 'human' }
});
```

**Logging audio stats (every 5s):**
```typescript
const stats = await connection.getStats();
await dialerLogger.log({
  correlationId,
  callSid,
  userId,
  lineId,
  eventType: 'audio_stats',
  severity: 'debug',
  currentState: 'connected',
  audioStats: {
    rtt: stats.rtt,
    jitter: stats.jitter,
    packetLoss: stats.packetsLost / stats.packetsReceived,
    mos: calculateMOS(stats),
    audioLevel: stats.audioLevel
  }
});
```

**Logging errors:**
```typescript
await dialerLogger.log({
  correlationId,
  callSid,
  userId,
  lineId,
  eventType: 'call_error',
  severity: 'error',
  currentState: 'failed',
  metadata: {
    errorDetails: {
      message: error.message,
      stack: error.stack,
      code: error.code
    }
  }
});
```

#### F. Test Scenarios
- [ ] **TS-40**: Verify all events are persisted to database
- [ ] **TS-41**: Validate correlation IDs track calls across services
- [ ] **TS-42**: Test log retention policy (auto-deletion after TTL)
- [ ] **TS-43**: Query logs by correlation ID for full call history
- [ ] **TS-44**: Test fallback logging when database unavailable
- [ ] **TS-45**: Verify audio stats logged every 5 seconds during call
- [ ] **TS-46**: Validate error logs include full stack traces

#### G. Monitoring & Alerting

**Real-time alerts based on log severity:**
```typescript
// Alert on critical errors
if (severity === 'critical') {
  await notificationService.alert({
    channel: 'slack',
    message: `🚨 Critical parallel dialer error: ${eventType}`,
    details: metadata
  });
}

// Alert on high error rate
const errorRate = await dialerLogger.getErrorRate({ timeWindow: 300 }); // 5 min
if (errorRate > 0.05) { // > 5% error rate
  await notificationService.alert({
    channel: 'email',
    message: `High error rate detected: ${(errorRate * 100).toFixed(2)}%`
  });
}
```

## Testing Methodology

### Manual Testing
1. **Setup**: Configure Twilio credentials and WebRTC device
2. **Execution**: Initiate parallel dialer with 3 lines
3. **Observation**: Monitor browser console, server logs, and Twilio debugger
4. **Validation**: Verify each test scenario against expected behavior

### Automated Testing
1. **Unit Tests**: Test individual components (TwiML generation, event handlers)
2. **Integration Tests**: Test full call flow end-to-end
3. **Load Tests**: Test with high parallel call volume (10+ simultaneous)

### Performance Monitoring
- Use Twilio Insights for call quality metrics
- Monitor WebRTC statistics via RTCPeerConnection.getStats()
- Track server resource usage during high load
- Analyze WebSocket message frequency and payload size

## Success Criteria

### Critical (Must Pass)
- ✅ Single WebRTC session handles all parallel calls
- ✅ No double ringing or duplicate call setup
- ✅ answerOnBridge works correctly with auto-accept
- ✅ Call events logged with complete metadata

### Important (Should Pass)
- ✅ Audio latency < 500ms
- ✅ Agent unavailability handled gracefully
- ✅ Pre-recorded media plays without gaps
- ✅ Packet loss < 1%

### Nice to Have (Good to Pass)
- ✅ MOS score > 4.0
- ✅ Real-time performance dashboard
- ✅ Automatic quality alerts

## Known Issues & Limitations

1. **Vite WebSocket Warning**: Browser console shows WebSocket connection failures for HMR (Hot Module Reload). This is a development-only issue and doesn't affect production or call functionality.

2. **Pre-recorded Media**: Not currently implemented. Requires TwiML enhancement before testing.

3. **Agent Status Detection**: No real-time agent availability check before initiating parallel calls. Could result in unnecessary attempts to offline agents.

## Next Steps

1. ✅ Fix DATABASE_URL environment issue (COMPLETED)
2. 🔄 Implement pre-recorded greeting feature
3. 🔄 Add comprehensive logging enhancements
4. 🔄 Create agent availability detection
5. 🔄 Build real-time monitoring dashboard
6. 🔄 Execute test scenarios and document results
