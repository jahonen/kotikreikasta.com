# Content Marketing Pipeline - Implementation Plan

## Project Overview

**Branch:** `feat/content-marketing`  
**MVP Platform:** Bluesky  
**V2 Platforms:** X (Twitter), Facebook, Threads  
**Email:** Separate implementation (weekly digest)

---

## Phase 1: Foundation & Schema Updates

### 1.1 Update Schedule Templates ✓
**Files:**
- `samplecode/schedule_template_bluesky.json`
- `samplecode/schedule_template_x.json`

**Add delay configuration:**
```json
{
  "publishDelay": {
    "enabled": true,
    "blogPosts": {
      "minHours": 12,
      "maxHours": 24
    },
    "listings": {
      "minHours": 3,
      "maxHours": 6
    },
    "strategy": "random_within_range"
  }
}
```

### 1.2 Update Firestore Schema
**Collections to modify:**

#### `publication_queue` (enhanced)
```typescript
{
  id: string;                    // Auto-generated
  contentType: 'blog_post' | 'listing';
  contentId: string;             // Reference to blog_posts or listings doc
  platforms: string[];           // ['bluesky', 'x', 'facebook', 'threads']
  status: 'pending' | 'published' | 'failed';
  createdAt: Timestamp;
  publishAfter: Timestamp;       // NEW: createdAt + delay
  delayHours: number;            // NEW: Actual delay used (for analytics)
  publishedAt?: Timestamp;
  error?: string;
  retryCount?: number;           // NEW: Track retry attempts
}
```

#### `blog_posts` (add socialSharing field)
```typescript
{
  // ... existing fields
  socialSharing?: {
    totalShares: number;
    platforms: {
      [platform: string]: {
        shareCount: number;
        lastShared: Timestamp;
        shares: Array<{
          sharedAt: Timestamp;
          postId?: string;        // External platform post ID
          queueId?: string;       // Link to publication_queue doc
        }>;
      };
    };
  };
}
```

#### `listings` (add socialSharing field)
Same structure as blog_posts.

### 1.3 Create TypeScript Types
**File:** `functions/src/types/social.ts`

```typescript
export interface PublicationQueueItem {
  id?: string;
  contentType: 'blog_post' | 'listing';
  contentId: string;
  platforms: string[];
  status: 'pending' | 'published' | 'failed';
  createdAt: FirebaseFirestore.Timestamp;
  publishAfter: FirebaseFirestore.Timestamp;
  delayHours: number;
  publishedAt?: FirebaseFirestore.Timestamp;
  error?: string;
  retryCount?: number;
}

export interface SocialShare {
  sharedAt: FirebaseFirestore.Timestamp;
  postId?: string;
  queueId?: string;
}

export interface PlatformSharing {
  shareCount: number;
  lastShared: FirebaseFirestore.Timestamp;
  shares: SocialShare[];
}

export interface SocialSharingTracking {
  totalShares: number;
  platforms: {
    [platform: string]: PlatformSharing;
  };
}

export interface ScheduleWindow {
  window: string;  // "07:00–08:30"
  tz: string;      // "EEST"
}

export interface ScheduleDay {
  day: string;
  primary: ScheduleWindow;
  secondary?: ScheduleWindow;
}

export interface EvergreenRules {
  minDaysBetweenShares: number;
  maxSharesPerContent: number;
  prioritizeNew: boolean;
  minContentAge: number;
  enabled: boolean;
}

export interface PublishDelay {
  enabled: boolean;
  blogPosts: {
    minHours: number;
    maxHours: number;
  };
  listings: {
    minHours: number;
    maxHours: number;
  };
  strategy: 'random_within_range';
}

export interface PlatformSchedule {
  platform: string;
  schedule: ScheduleDay[];
  evergreenRules: EvergreenRules;
  publishDelay: PublishDelay;
  postingBehavior: {
    randomizeWithinWindow: boolean;
    minMinutesBetweenPosts: number;
    retryOnFailure: boolean;
    maxRetries: number;
    retryDelayMinutes: number;
  };
  contentPreferences: {
    preferredTypes: string[];
    maxCharacters: number;
    includeHashtags: boolean;
    includeEmojis: boolean;
    includeImages: boolean;
    maxImages: number;
  };
}
```

---

## Phase 2: Admin Workflow Updates

### 2.1 Update Blog Publish API
**File:** `admin/app/api/blogs/publish/route.ts`

**Changes:**
1. Calculate delay based on content type
2. Add `publishAfter` timestamp
3. Add `platforms` array
4. Add `delayHours` for analytics

```typescript
// After setting blog status to 'published'
const delay = calculatePublishDelay('blog_post');
const publishAfter = new Timestamp(
  now.seconds + (delay * 3600),
  now.nanoseconds
);

await db.collection('publication_queue').add({
  contentType: 'blog_post',
  contentId: id,
  platforms: ['bluesky', 'x'],  // MVP: Bluesky + X
  status: 'pending',
  createdAt: FieldValue.serverTimestamp(),
  publishAfter,
  delayHours: delay
});
```

### 2.2 Create Listing Publish Workflow
**File:** `admin/app/api/listings/publish/route.ts` (NEW)

Similar to blog publish, but:
- Different delay calculation (3-6 hours vs 12-24 hours)
- Different platform selection (all platforms for listings)

---

## Phase 3: Bluesky Consumer Implementation

### 3.1 Create Consumer Cloud Function
**File:** `functions/src/consumers/bluesky.ts`

**Core functionality:**
1. Fetch schedule from Secret Manager (`BSKY_SCHEDULE`)
2. Check if current time matches a posting window
3. Query for new content (publishAfter <= now, status = pending)
4. If queue empty, query for evergreen content
5. Format post for Bluesky (300 chars, hashtags, emojis)
6. Post to Bluesky API
7. Update socialSharing tracking
8. Mark queue item as published

**Key functions:**
- `fetchSchedule()` - Get schedule from Secret Manager
- `isWithinPostingWindow()` - Check if now is within a scheduled window
- `getNextNewContent()` - Query publication_queue
- `getNextEvergreenContent()` - Query blog_posts/listings with evergreen rules
- `formatBlueskyPost()` - Create post text with URL, hashtags
- `postToBluesky()` - API call to Bluesky
- `updateSharingTracking()` - Update socialSharing field
- `markAsPublished()` - Update queue item status

### 3.2 Bluesky API Integration
**Authentication:** Basic Auth with `BSKY_IDENTIFIER` and `BSKY_APP_PASSWORD`

**Endpoint:** `https://bsky.social/xrpc/com.atproto.repo.createRecord`

**Request:**
```typescript
{
  repo: BSKY_IDENTIFIER,
  collection: "app.bsky.feed.post",
  record: {
    text: formattedPost,
    createdAt: new Date().toISOString()
  }
}
```

### 3.3 Error Handling & Retry Logic
- Retry on transient errors (network, rate limit)
- Max 3 retries with exponential backoff
- Update queue item with error message on final failure
- Log all errors for monitoring

---

## Phase 4: Cloud Scheduler Configuration

### 4.1 Create Scheduler Jobs
**Based on Bluesky schedule:**

```yaml
# Tuesday 7:00-8:30 AM EEST (4:00-5:30 AM UTC)
- name: bluesky-tuesday-primary
  schedule: "0 4 * * 2"  # Every Tuesday at 4:00 AM UTC
  timezone: UTC
  httpTarget:
    uri: https://europe-west1-kotikreikasta.cloudfunctions.net/publishToBluesky
    httpMethod: POST

# Wednesday 7:15-8:30 AM EEST (4:15-5:30 AM UTC)
- name: bluesky-wednesday-primary
  schedule: "15 4 * * 3"  # Every Wednesday at 4:15 AM UTC
  timezone: UTC
  httpTarget:
    uri: https://europe-west1-kotikreikasta.cloudfunctions.net/publishToBluesky
    httpMethod: POST

# Thursday 3:30-5:00 PM EEST (12:30-2:00 PM UTC)
- name: bluesky-thursday-primary
  schedule: "30 12 * * 4"  # Every Thursday at 12:30 PM UTC
  timezone: UTC
  httpTarget:
    uri: https://europe-west1-kotikreikasta.cloudfunctions.net/publishToBluesky
    httpMethod: POST

# Friday 7:00-8:15 AM EEST (4:00-5:15 AM UTC)
- name: bluesky-friday-primary
  schedule: "0 4 * * 5"  # Every Friday at 4:00 AM UTC
  timezone: UTC
  httpTarget:
    uri: https://europe-west1-kotikreikasta.cloudfunctions.net/publishToBluesky
    httpMethod: POST

# Friday 2:00-4:00 PM EEST (11:00 AM-1:00 PM UTC)
- name: bluesky-friday-secondary
  schedule: "0 11 * * 5"  # Every Friday at 11:00 AM UTC
  timezone: UTC
  httpTarget:
    uri: https://europe-west1-kotikreikasta.cloudfunctions.net/publishToBluesky
    httpMethod: POST

# Saturday 9:00-11:00 AM EEST (6:00-8:00 AM UTC)
- name: bluesky-saturday-primary
  schedule: "0 6 * * 6"  # Every Saturday at 6:00 AM UTC
  timezone: UTC
  httpTarget:
    uri: https://europe-west1-kotikreikasta.cloudfunctions.net/publishToBluesky
    httpMethod: POST

# Saturday 7:30-9:00 PM EEST (4:30-6:00 PM UTC)
- name: bluesky-saturday-secondary
  schedule: "30 16 * * 6"  # Every Saturday at 4:30 PM UTC
  timezone: UTC
  httpTarget:
    uri: https://europe-west1-kotikreikasta.cloudfunctions.net/publishToBluesky
    httpMethod: POST

# Sunday 9:30-11:30 AM EEST (6:30-8:30 AM UTC)
- name: bluesky-sunday-primary
  schedule: "30 6 * * 0"  # Every Sunday at 6:30 AM UTC
  timezone: UTC
  httpTarget:
    uri: https://europe-west1-kotikreikasta.cloudfunctions.net/publishToBluesky
    httpMethod: POST

# Sunday 3:00-4:30 PM EEST (12:00-1:30 PM UTC)
- name: bluesky-sunday-secondary
  schedule: "0 12 * * 0"  # Every Sunday at 12:00 PM UTC
  timezone: UTC
  httpTarget:
    uri: https://europe-west1-kotikreikasta.cloudfunctions.net/publishToBluesky
    httpMethod: POST
```

**Total:** 9 scheduled jobs for Bluesky (8 posts/week)

### 4.2 Deployment Commands
```bash
# Create each scheduler job
gcloud scheduler jobs create http bluesky-tuesday-primary \
  --schedule="0 4 * * 2" \
  --uri="https://europe-west1-kotikreikasta.cloudfunctions.net/publishToBluesky" \
  --http-method=POST \
  --time-zone=UTC \
  --location=europe-west1

# Repeat for all 9 jobs...
```

---

## Phase 5: Testing & Validation

### 5.1 Unit Tests
**File:** `functions/src/consumers/bluesky.test.ts`

Test cases:
- Schedule parsing
- Window time checking
- Content query logic
- Evergreen filtering
- Post formatting (character limits, hashtags)
- Delay calculation
- Retry logic

### 5.2 Integration Tests
1. Manually trigger Cloud Function
2. Verify queue item is fetched correctly
3. Verify Bluesky post is created
4. Verify socialSharing tracking is updated
5. Verify queue item marked as published

### 5.3 End-to-End Test
1. Publish a blog post in admin
2. Wait for delay period
3. Wait for next scheduled window
4. Verify post appears on Bluesky
5. Check Firestore for updated tracking

---

## Phase 6: Monitoring & Analytics

### 6.1 Cloud Logging
Log all events:
- Schedule checks
- Content queries
- Post attempts
- Successes/failures
- Retry attempts

### 6.2 Firestore Analytics Queries
Track:
- Posts per platform per week
- Queue depth over time
- Evergreen vs new content ratio
- Failed posts and reasons
- Average delay between publish and share

### 6.3 Admin Dashboard (Future)
Display:
- Upcoming scheduled posts
- Recent social shares
- Platform performance metrics
- Failed posts requiring attention

---

## Phase 7: Documentation

### 7.1 Update services.md
Document:
- Bluesky consumer service
- Publication queue system
- Social sharing tracking
- Cloud Scheduler jobs

### 7.2 Create Deployment Guide
**File:** `SOCIAL_DEPLOYMENT.md`

Include:
- Secret Manager setup
- Cloud Function deployment
- Cloud Scheduler creation
- Testing procedures
- Troubleshooting guide

### 7.3 Update component.md
Document:
- Admin publish workflow changes
- Social sharing tracking fields

---

## Implementation Order

### Sprint 1: Foundation (Days 1-2)
1. ✅ Create branch `feat/content-marketing`
2. Update schedule templates with delay config
3. Create TypeScript types
4. Update publication_queue schema documentation

### Sprint 2: Admin Integration (Days 3-4)
5. Update blog publish API with delay logic
6. Create listing publish API
7. Test admin workflow locally

### Sprint 3: Bluesky Consumer (Days 5-7)
8. Implement Bluesky consumer function
9. Add Secret Manager integration
10. Implement content query logic
11. Implement evergreen logic
12. Add Bluesky API integration
13. Add error handling and retry

### Sprint 4: Scheduling (Day 8)
14. Create Cloud Scheduler jobs
15. Test scheduled triggers
16. Verify end-to-end flow

### Sprint 5: Testing & Polish (Days 9-10)
17. Write unit tests
18. Run integration tests
19. Update documentation
20. Deploy to preview channel
21. Final testing
22. Merge to main
23. Deploy to production

---

## V2 Roadmap (Future)

### X (Twitter) Consumer
- Similar to Bluesky but with 280 char limit
- OAuth 2.0 authentication
- Different posting schedule (10 posts/week)

### Facebook Consumer
- Graph API integration
- Longer content format
- Different posting schedule (7 posts/week)

### Threads Consumer
- Instagram Graph API
- 500 char limit
- Conversational tone

### Email Newsletter
- Weekly digest format
- SendGrid template integration
- Aggregation logic (2-5 items per digest)

---

## Success Metrics

### MVP (Bluesky)
- ✅ 8 posts per week on Bluesky
- ✅ 100% of new content shared within delay window
- ✅ Evergreen content fills gaps when queue empty
- ✅ <1% failure rate
- ✅ All posts tracked in Firestore

### V2 (All Platforms)
- 35+ social posts per week across all platforms
- Automated content distribution
- Zero manual posting required
- Full analytics dashboard

---

## Risk Mitigation

### Risk 1: API Rate Limits
**Mitigation:** 
- Respect platform rate limits
- Implement exponential backoff
- Monitor API usage

### Risk 2: Queue Starvation
**Mitigation:**
- Evergreen content as fallback
- Alert when queue depth < 3 items
- Admin dashboard shows upcoming posts

### Risk 3: Posting Failures
**Mitigation:**
- Retry logic (3 attempts)
- Error logging
- Failed queue for manual review
- Admin notifications

### Risk 4: Timezone Issues
**Mitigation:**
- All times in UTC internally
- Schedule JSON specifies timezone
- Thorough testing of time conversions

---

## Dependencies

### External Services
- ✅ Google Secret Manager (BSKY_* secrets exist)
- ✅ Bluesky API (public, no approval needed)
- Cloud Scheduler (needs setup)
- Cloud Functions (existing infrastructure)

### Internal Services
- Firestore (existing)
- Firebase Admin SDK (existing)
- Admin UI (needs updates)

---

## Estimated Timeline

**Total:** 10 working days

- Foundation: 2 days
- Admin Integration: 2 days
- Bluesky Consumer: 3 days
- Scheduling: 1 day
- Testing & Deployment: 2 days

**Target Launch:** End of Sprint 5
