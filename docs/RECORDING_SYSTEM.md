# Multi-Tenant Call Recording System Documentation

## Overview

This document describes the multi-tenant call recording system architecture, security model, and operational workflows. The system ensures complete data isolation between tenants while providing robust recording management capabilities.

## Architecture

### Multi-Tenant Isolation

The recording system implements **strict tenant isolation** at every layer:

#### 1. Database Layer
- All recording queries include `userId` filtering
- Example: `db.select().from(recordings).where(and(eq(recordings.id, id), eq(recordings.userId, userId)))`
- Prevents any cross-tenant data leakage at the database level

#### 2. API Layer
- All routes use `requireAuth` middleware to extract userId from JWT token
- Every recording operation validates the userId matches the authenticated user
- Example: `const userId = getUserIdFromRequest(req);`

#### 3. Storage Layer
- Local recording files are stored in a common directory but access is validated
- Database records link files to specific userIds
- File access always checks userId ownership before serving

## Recording Workflow

### 1. Recording Creation

Recordings are created automatically when calls are made:

```
Call Made → Twilio Records Call → Twilio Webhook → 
Create/Update Recording in DB → Store with userId
```

**Backend Process:**
1. Twilio sends recording status webhook to `/api/twilio/recording-status`
2. System extracts userId from the call record
3. Recording is created/updated with `storage.createRecording(userId, recordingData)`
4. Recording metadata includes:
   - `twilioRecordingSid`: Unique Twilio identifier
   - `userId`: Tenant identifier (ensures isolation)
   - `twilioUrl`: URL to recording in Twilio
   - `localFilePath`: Path to downloaded file (if downloaded)
   - Status, duration, phone number, direction, etc.

### 2. Recording Sync

Users can manually sync recordings from Twilio:

**Frontend:**
- User clicks "Sync from Twilio" button
- Frontend calls `POST /api/recordings/sync` with options

**Backend:**
- Fetches all recordings from Twilio API for the user
- Creates/updates database records for each recording
- Optionally downloads recordings to local storage
- Returns sync results (synced count, errors)

**Key Security Point:** Only syncs recordings for the authenticated user's Twilio account.

### 3. Recording Access

Three ways to access recordings:

#### A. Play Recording (Stream)
```
GET /api/recordings/:id/play
```
- Validates userId ownership
- Supports HTTP range requests for streaming
- Serves local file if available, otherwise redirects to Twilio URL
- Updates play count and last played timestamp

#### B. Download Recording
```
GET /api/recordings/:id/download
```
- Validates userId ownership
- Sets proper content-disposition headers
- Downloads file with descriptive filename
- Updates download count and last downloaded timestamp

#### C. Get Recording Details
```
GET /api/recordings/:id
```
- Returns recording metadata
- Validates userId ownership
- Updates play count

### 4. Recording Management

#### Delete Recording
```
DELETE /api/recordings/:id
```
- Validates userId ownership
- Deletes local file if exists
- Removes database record
- Ensures only owner can delete

#### Update Recording Metadata
```
PUT /api/recordings/:id
```
- Allows updating tags, category, priority, starred, archived status
- Validates userId ownership
- Only allows safe field updates (filtered allow-list)

#### Bulk Operations
```
POST /api/recordings/bulk/:action
```
- Supports bulk star, archive, delete operations
- Validates userId for all recordings in the batch
- Atomic operations with error handling

## Security Measures

### 1. Authentication & Authorization
- ✅ All recording routes require authentication (`requireAuth` middleware)
- ✅ JWT tokens validated using Auth0
- ✅ UserId extracted from authenticated request
- ✅ No ability to access recordings without valid authentication

### 2. Tenant Isolation
- ✅ All database queries filter by userId
- ✅ All API routes validate userId ownership
- ✅ Recording service methods require userId parameter
- ✅ No shared resources between tenants

### 3. Data Leakage Prevention
- ✅ **Fixed**: Recording stats now require userId (was missing before)
- ✅ **Fixed**: Cleanup operations now scoped to userId (was missing before)
- ✅ No global queries that could expose data across tenants
- ✅ All routes log userId for audit trail

### 4. Error Handling
- ✅ Comprehensive try-catch blocks on all routes
- ✅ Detailed logging with userId context
- ✅ User-friendly error messages
- ✅ No sensitive information in error responses

## API Endpoints

### Recording Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/recordings` | List recordings with filtering | ✅ |
| GET | `/api/recordings/stats` | Get recording statistics | ✅ |
| GET | `/api/recordings/:id` | Get recording details | ✅ |
| GET | `/api/recordings/:id/play` | Stream recording audio | ✅ |
| GET | `/api/recordings/:id/download` | Download recording file | ✅ |
| POST | `/api/recordings/sync` | Sync recordings from Twilio | ✅ |
| POST | `/api/recordings/:id/transcript` | Generate transcript | ✅ |
| POST | `/api/recordings/:id/analyze` | Analyze recording with AI | ✅ |
| PUT | `/api/recordings/:id` | Update recording metadata | ✅ |
| DELETE | `/api/recordings/:id` | Delete recording | ✅ |
| POST | `/api/recordings/cleanup` | Cleanup old recordings | ✅ |
| POST | `/api/recordings/bulk/:action` | Bulk operations | ✅ |

### Query Parameters for GET /api/recordings

```typescript
{
  page?: number;           // Pagination page number
  limit?: number;          // Items per page (max 50)
  search?: string;         // Search by phone number or name
  status?: string;         // Filter by status (ready, processing, error)
  direction?: string;      // Filter by direction (inbound, outbound)
  category?: string;       // Filter by category
  starred?: boolean;       // Filter starred recordings
  archived?: boolean;      // Filter archived recordings
  startDate?: string;      // Filter by date range start
  endDate?: string;        // Filter by date range end
  sortBy?: string;         // Sort field (createdAt, duration, phone)
  sortOrder?: 'asc'|'desc'; // Sort order
}
```

## Real-Time Updates

The frontend implements automatic updates through:

1. **Polling**: Recordings list refetches every 30 seconds
2. **Window Focus**: Refetches when user returns to tab
3. **Manual Sync**: User can trigger manual sync from Twilio
4. **Cache Invalidation**: All mutations invalidate the query cache

```typescript
useQuery({
  queryKey: ["/api/recordings", filters],
  queryFn: fetchRecordings,
  refetchInterval: 30000,              // Poll every 30s
  refetchOnWindowFocus: true,          // Refetch on focus
  refetchIntervalInBackground: false   // Don't poll when hidden
})
```

## Storage Architecture

### Database Storage (PostgreSQL)
- Recording metadata stored in `recordings` table
- Indexed by userId for fast queries
- Includes Twilio metadata and local file references

### Local File Storage
- Files stored in `/recordings` directory
- Filename format: `{twilioRecordingSid}_{timestamp}.mp3`
- Access controlled through database userId validation
- Files can be deleted independently from database records

### Twilio Cloud Storage
- All recordings initially stored in Twilio
- Provides backup if local files are lost
- Authenticated access through user's Twilio credentials

## Monitoring & Logging

### All operations log:
- ✅ User ID (for audit trail)
- ✅ Recording ID
- ✅ Operation type (fetch, play, download, delete)
- ✅ Success/failure status
- ✅ Error details (if applicable)

### Log Examples:
```
📼 Fetching recordings for user 123: page=1, limit=50, filters={"search":"555"}
✅ Successfully fetched 15 recordings for user 123 (total: 45)
▶️ Playing recording 789 for user 123
📥 Downloading recording 789 for user 123
🗑️ Deleting recording 789 for user 123
❌ Failed to fetch recordings for user 123: Database connection error
```

## Error Handling

All recording operations include comprehensive error handling:

```typescript
try {
  const userId = getUserIdFromRequest(req);
  console.log(`📼 Fetching recordings for user ${userId}`);
  
  const recordings = await storage.getRecordings(userId, options);
  
  console.log(`✅ Successfully fetched ${recordings.length} recordings`);
  res.json(recordings);
} catch (error: any) {
  console.error(`❌ Failed to fetch recordings:`, error);
  res.status(500).json({ message: error.message });
}
```

### Error Response Format:
```json
{
  "message": "User-friendly error description"
}
```

## Troubleshooting

### Recording Not Found (404)
**Cause:** User trying to access recording belonging to another user
**Solution:** Verify userId matches the recording owner

### Recordings Not Syncing
**Cause:** Twilio credentials not configured or invalid
**Solution:** Check Twilio configuration in user settings

### Local File Not Found
**Cause:** Recording not downloaded locally
**Solution:** System will fall back to Twilio URL automatically

### Stats Showing Wrong Data
**Cause:** Previously, stats endpoint wasn't filtering by userId (FIXED)
**Solution:** Now properly scoped to authenticated user

## Security Audit Checklist

When reviewing or modifying the recording system, verify:

- [ ] All new routes use `requireAuth` middleware
- [ ] All database queries include userId filtering
- [ ] All service methods accept and use userId parameter
- [ ] No global operations that could affect other tenants
- [ ] All errors are logged with userId context
- [ ] File access validates userId ownership
- [ ] No sensitive data in error responses
- [ ] All mutations invalidate appropriate cache keys

## Recent Security Fixes

### Critical Vulnerabilities Fixed:
1. ✅ **Recording Stats Endpoint** - Added userId filtering to prevent cross-tenant data leakage
2. ✅ **Cleanup Endpoint** - Added userId scoping to prevent deleting other tenants' recordings
3. ✅ **Transcript Generation** - Added userId parameter for proper tenant isolation
4. ✅ **Recording Analysis** - Added userId parameter for proper tenant isolation

## Future Enhancements

Potential improvements to consider:

1. **WebSocket Real-Time Updates** - Push notifications for new recordings
2. **Recording Transcription** - Integrate OpenAI Whisper or similar service
3. **Advanced Search** - Full-text search on transcripts
4. **Recording Sharing** - Secure sharing links with expiration
5. **Storage Optimization** - Automatic compression and archival
6. **Analytics Dashboard** - Advanced recording analytics and insights

## Conclusion

The multi-tenant recording system provides secure, isolated recording management with comprehensive logging, error handling, and real-time updates. All security best practices are implemented and regularly audited.

For questions or concerns, refer to the security audit checklist above or contact the development team.
