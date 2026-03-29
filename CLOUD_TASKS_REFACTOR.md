# Cloud Tasks Refactor - Technical Plan

## Executive Summary

Refactor social media publishing system from Pub/Sub-based architecture to Cloud Tasks-based architecture to eliminate duplicate posts, improve reliability, and simplify the codebase.

## Current Architecture Problems

### Issues Identified
1. **Duplicate Posts**: Same content posted multiple times (e.g., Facebook post 23 minutes apart)
2. **Race Conditions**: Scheduler runs every 23 minutes, can select same content before previous publish completes
3. **No Deduplication**: Pub/Sub provides at-least-once delivery, no built-in deduplication
4. **Complex Flow**: Scheduler → Pub/Sub → 5 separate publisher functions
5. **Poor Observability**: Hard to see what's queued, what failed, what's pending

### Current Flow
```
Cloud Scheduler (every 23 min)
    ↓
socialMediaScheduler (HTTP Function)
    ↓
Pub/Sub topic "social-media-publishing"
    ↓
5 Publisher Functions (instagramPublisher, facebookPublisher, etc.)
```

## New Architecture Design

### Core Principles
1. **Exactly-once delivery** via Cloud Tasks named tasks
2. **Atomic deduplication** using task names and socialShares collection
3. **Scheduled execution** with randomization within posting windows
4. **Single publisher** handling all platforms
5. **Observable queue** via Cloud Tasks console

### New Flow
```
Cloud Scheduler (every hour: 0 * * * *)
    ↓
socialMediaScheduler (Scheduled Function)
    ↓
For each platform:
    1. Check if within posting window
    2. Check last post time (minMinutesBetweenPosts)
    3. Check window limit (maxPostsPerWindow)
    4. Select next unpublished content (excluding recently posted)
    5. Create Cloud Task with unique name
    ↓
Cloud Tasks Queue "social-media-publishing"
    ↓
socialMediaPublisher (HTTP Function)
    ↓
1. Validate request
2. Check if already posted (idempotency)
3. Generate content with Vertex AI
4. Post to platform API
5. Update Firestore (socialMediaStatus + socialShares)
```

## Implementation Plan

### Phase 1: Infrastructure Setup

#### 1.1 Create Cloud Tasks Queue
```bash
gcloud tasks queues create social-media-publishing \
  --location=europe-west1 \
  --max-dispatches-per-second=1 \
  --max-concurrent-dispatches=5 \
  --max-attempts=3 \
  --min-backoff=60s \
  --max-backoff=3600s
```

#### 1.2 Add Dependencies
```json
{
  "@google-cloud/tasks": "^5.0.0"
}
```

### Phase 2: Refactor Scheduler

#### 2.1 New Scheduler Logic
**File**: `functions/src/schedulers/social-media-scheduler-v2.ts`

**Key Changes**:
- Run every hour instead of every 23 minutes
- Query `socialShares` collection to check recent posts
- Implement `minMinutesBetweenPosts` check
- Implement `maxPostsPerWindow` check
- Create Cloud Tasks instead of Pub/Sub messages
- Use task names for deduplication: `{contentId}-{platform}-{windowStart}`

**Functions**:
```typescript
async function canPostToPlatform(platform: string, schedule: Schedule): Promise<boolean>
async function getLastPostTime(platform: string): Promise<Date | null>
async function getPostsInCurrentWindow(platform: string, windowStart: Date): Promise<number>
async function getNextContent(platform: string, schedule: Schedule): Promise<Content | null>
async function createPublishTask(content: Content, platform: string, scheduleTime: Date): Promise<void>
```

#### 2.2 Deduplication Strategy

**Task Name Format**: `{contentId}-{platform}-{windowStartTimestamp}`

Example: `Jc3W4tQJXDeyiQAZCwk9-facebook-1711699200000`

**Why this works**:
- Same content + platform + window = same task name
- Cloud Tasks rejects duplicate task names
- Window changes → new task name allowed
- Natural deduplication without database queries

### Phase 3: Unified Publisher

#### 3.1 Create Single Publisher Function
**File**: `functions/src/publishers/social-media-publisher.ts`

**Responsibilities**:
1. Receive HTTP request from Cloud Tasks
2. Validate payload (contentId, platform, contentType)
3. Check `socialShares` for duplicate (idempotency)
4. Route to platform-specific handler
5. Track result in `socialShares` collection

**Platform Handlers** (extract from existing publishers):
- `publishToFacebook(content, metadata)`
- `publishToInstagram(content, metadata)`
- `publishToX(content, metadata)`
- `publishToBluesky(content, metadata)`
- `publishToThreads(content, metadata)`

#### 3.2 Idempotency Check
```typescript
async function isAlreadyPosted(contentId: string, platform: string, windowStart: Date): Promise<boolean> {
  const shares = await db.collection('blog_posts')
    .doc(contentId)
    .collection('socialShares')
    .where('platform', '==', platform)
    .where('sharedAt', '>=', Timestamp.fromDate(windowStart))
    .where('success', '==', true)
    .limit(1)
    .get();
  
  return !shares.empty;
}
```

### Phase 4: Data Model Updates

#### 4.1 socialShares Document Structure
```typescript
{
  platform: 'facebook' | 'instagram' | 'x' | 'bluesky' | 'threads',
  sharedAt: Timestamp,
  success: boolean,
  postId: string | null,
  postUrl: string | null,
  error: string | null,
  windowStart: Timestamp,  // NEW: Track posting window
  windowEnd: Timestamp,    // NEW: Track posting window
  contentSnapshot: {       // NEW: For analytics
    title: string,
    type: 'blog' | 'listing',
    url: string
  },
  metadata: {              // NEW: Platform-specific metadata
    characterCount?: number,
    imageCount?: number,
    hashtagCount?: number
  }
}
```

#### 4.2 Query Optimization

**Create Composite Index**:
```
Collection: socialShares (collection group)
Fields:
  - platform (Ascending)
  - success (Ascending)
  - sharedAt (Descending)
```

### Phase 5: Migration Strategy

#### 5.1 Parallel Deployment
1. Deploy new `socialMediaSchedulerV2` alongside old scheduler
2. Deploy new `socialMediaPublisher` function
3. Monitor both systems for 24 hours
4. Verify no duplicates with new system
5. Disable old scheduler
6. Remove old Pub/Sub publishers after 7 days

#### 5.2 Rollback Plan
- Keep old functions deployed
- Re-enable old scheduler via Cloud Scheduler console
- Disable new scheduler
- No data migration needed (both use same Firestore collections)

### Phase 6: Configuration Updates

#### 6.1 Schedule Enhancements
Add to all platform schedules:
```json
{
  "postingBehavior": {
    "randomizeWithinWindow": true,
    "minMinutesBetweenPosts": 180,
    "maxPostsPerWindow": 2,
    "retryOnFailure": true,
    "maxRetries": 3,
    "retryDelayMinutes": 15
  }
}
```

#### 6.2 Cloud Scheduler Configuration
```yaml
name: social-media-scheduler-v2
schedule: "0 * * * *"  # Every hour
timezone: Europe/Helsinki
target:
  type: pubsub
  topic: projects/kotikreikasta/topics/scheduler-trigger
```

## Testing Plan

### Unit Tests
- [ ] `canPostToPlatform()` respects minMinutesBetweenPosts
- [ ] `canPostToPlatform()` respects maxPostsPerWindow
- [ ] `getNextContent()` excludes recently posted content
- [ ] Task name generation is deterministic
- [ ] Idempotency check works correctly

### Integration Tests
- [ ] Scheduler creates tasks successfully
- [ ] Publisher receives and processes tasks
- [ ] Duplicate task names are rejected
- [ ] socialShares documents are created correctly
- [ ] Platform APIs receive correct payloads

### End-to-End Tests
1. Queue 3 pieces of content for Facebook
2. Run scheduler
3. Verify only 1 task created (respecting minMinutesBetweenPosts)
4. Wait for task execution
5. Verify post appears on Facebook
6. Run scheduler again immediately
7. Verify no duplicate task created
8. Wait 3+ hours
9. Run scheduler again
10. Verify second post is queued

## Deployment Steps

### 1. Install Dependencies
```bash
cd functions
npm install @google-cloud/tasks
npm run build
```

### 2. Create Cloud Tasks Queue
```bash
gcloud tasks queues create social-media-publishing \
  --location=europe-west1 \
  --project=kotikreikasta
```

### 3. Deploy Functions
```bash
firebase deploy --only functions:socialMediaSchedulerV2,functions:socialMediaPublisher
```

### 4. Create Cloud Scheduler Job
```bash
gcloud scheduler jobs create pubsub social-media-scheduler-v2 \
  --location=europe-west1 \
  --schedule="0 * * * *" \
  --topic=scheduler-trigger \
  --message-body='{"trigger":"social-media"}' \
  --time-zone=Europe/Helsinki
```

### 5. Monitor
- Check Cloud Tasks console for queued tasks
- Check Cloud Functions logs for execution
- Check Firestore for socialShares documents
- Check social media platforms for posts

### 6. Disable Old System
```bash
gcloud scheduler jobs pause socialMediaScheduler --location=europe-west1
```

## Success Criteria

- [ ] No duplicate posts for 7 days
- [ ] All platforms respect minMinutesBetweenPosts
- [ ] All platforms respect maxPostsPerWindow
- [ ] Posts appear within configured time windows
- [ ] Failed posts are retried automatically
- [ ] socialShares collection accurately reflects posting history
- [ ] Cloud Tasks queue shows pending/completed tasks
- [ ] Error rate < 1%

## Rollback Criteria

- Duplicate posts detected
- Error rate > 5%
- Posts not appearing on platforms
- Cloud Tasks queue stuck/failing

## Timeline

- **Day 1**: Infrastructure setup, scheduler refactor
- **Day 2**: Publisher implementation, testing
- **Day 3**: Deployment, monitoring
- **Day 4-7**: Parallel operation, validation
- **Day 8**: Disable old system
- **Day 15**: Remove old code

## Files to Create/Modify

### New Files
- `functions/src/schedulers/social-media-scheduler-v2.ts`
- `functions/src/publishers/social-media-publisher.ts`
- `functions/src/utils/cloud-tasks.ts`
- `functions/src/utils/deduplication.ts`

### Modified Files
- `functions/package.json` (add @google-cloud/tasks)
- `functions/src/index.ts` (export new functions)

### Files to Deprecate (after migration)
- `functions/src/schedulers/social-media-scheduler.ts`
- `functions/src/consumers/instagram-pubsub.ts`
- `functions/src/consumers/facebook-pubsub.ts`
- `functions/src/consumers/x-pubsub.ts`
- `functions/src/consumers/bluesky-pubsub.ts`
- `functions/src/consumers/threads-pubsub.ts`

## Risk Mitigation

### Risk: Cloud Tasks quota limits
**Mitigation**: Monitor quota usage, request increase if needed

### Risk: Task execution failures
**Mitigation**: Automatic retries with exponential backoff, dead letter queue

### Risk: Firestore read/write costs
**Mitigation**: Use composite indexes, cache schedule configs

### Risk: Platform API rate limits
**Mitigation**: Respect minMinutesBetweenPosts, implement backoff

### Risk: Content selection logic bugs
**Mitigation**: Extensive testing, gradual rollout, monitoring

## Monitoring & Alerts

### Metrics to Track
- Tasks created per hour
- Tasks executed successfully
- Tasks failed
- Average execution time
- Posts per platform per day
- Duplicate detection rate

### Alerts to Configure
- Error rate > 5%
- No tasks created for 2 hours
- Task queue depth > 50
- Execution time > 60 seconds

## Documentation Updates

- [ ] Update README with new architecture diagram
- [ ] Document Cloud Tasks queue configuration
- [ ] Update deployment guide
- [ ] Create troubleshooting guide
- [ ] Update API documentation
