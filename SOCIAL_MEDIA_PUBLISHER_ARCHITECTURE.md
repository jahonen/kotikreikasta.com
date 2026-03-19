# Social Media Publisher Architecture

## Overview

The social media publishing system automatically publishes content to 4 platforms (Bluesky, X, Facebook, Threads) during scheduled posting windows. It uses Firestore for queue management, Vertex AI for Finnish content generation, and tracks all shares with comprehensive analytics.

## Architecture Design (Scheduler-Based)

### Flow
1. **Content Published** → Firestore trigger marks content for social media
2. **Firestore Status Tracking** → Each platform has `queued: true, published: false`
3. **Scheduler Runs** (every 83 minutes) → Checks each platform's posting window
4. **Within Window** → Fetches oldest unpublished content (FIFO)
5. **Publisher Posts** → Generates content, posts, marks as published
6. **One Post Per Window** → Next content published in next window

### Key Features
- ✅ **Scheduled posting** - Content published only during defined time windows
- ✅ **FIFO queue** - Oldest content published first
- ✅ **One post per platform per window** - Gradual distribution
- ✅ **Firestore-based queue** - No message loss
- ✅ **Platform-specific schedules** - Each platform has unique posting times

## Architecture Components

### 1. Content Generation (Vertex AI)
- **Model**: Gemini 1.5 Pro
- **Guide**: `SOCIAL_MEDIA_LLM_GUIDE` secret in Secret Manager
- **Input**: Content metadata (title, description, URL, type, metadata)
- **Output**: Platform-optimized Finnish text within character limits

### 2. Analytics Tracking (UTM Parameters)
Every shared link includes UTM parameters for Google Analytics:
- `utm_source`: Platform name (bluesky, x, facebook, threads)
- `utm_medium`: social
- `utm_campaign`: Content type (listing, blog)
- `utm_content`: Content ID

**Example:**
```
https://kotikreikasta.com/blog/kreikan-kiinteistokauppa?utm_source=bluesky&utm_medium=social&utm_campaign=blog&utm_content=abc123
```

### 3. Firestore Tracking
Each content item tracks publishing status and shares:

#### A. Publishing Status (Parent Document)
```
/blog_posts/{contentId}/socialMediaStatus
/listings/{listingId}/socialMediaStatus
```

**Document structure:**
```typescript
{
  bluesky: {
    queued: boolean,
    queuedAt: Timestamp,
    published: boolean,
    publishedAt?: Timestamp,
    postId?: string,
    postUrl?: string
  },
  x: { ... },
  facebook: { ... },
  threads: { ... }
}
```

#### B. Share Record (Subcollection)
```
/blog_posts/{contentId}/socialShares/{shareId}
/listings/{listingId}/socialShares/{shareId}
```

**Document structure:**
```typescript
{
  platform: 'bluesky' | 'x' | 'facebook' | 'threads',
  sharedAt: Timestamp,
  postId: string,
  postUrl: string,
  text: string,
  characterCount: number,
  success: boolean,
  error?: string
}
```

### 4. Retry Logic
- **Max attempts**: 3
- **Initial delay**: 1 second
- **Max delay**: 10 seconds
- **Backoff multiplier**: 2x
- **Retryable errors**: Network errors, 5xx errors, rate limits (429)
- **Non-retryable errors**: 4xx errors (except 429), authentication errors

### 5. Platform-Specific Formatting

#### Bluesky (300 chars)
- Uses rich text facets for clickable links
- Link detection and automatic facet creation
- Post URL: `https://bsky.app/profile/kotikreikasta.bsky.social/post/{postId}`

#### X/Twitter (280 chars)
- Plain text with URL (t.co shortening applied by platform)
- Character budget reserves 23 chars for link
- Post URL: `https://twitter.com/user/status/{tweetId}`

#### Facebook (5000 chars)
- Longest format allowed
- Automatic OG tag fetching and preview generation
- Post URL: `https://facebook.com/{pageId}/posts/{postId}`

#### Threads (500 chars)
- Two-step process: create container → publish
- Similar to Instagram posting
- Post URL: `https://www.threads.net/@username/post/{threadId}`

## Cloud Functions

### Firestore Triggers

**`onBlogPostPublished`** - Triggered when blog post status changes to 'published'
- Marks content for all 4 platforms in Firestore
- Sets `socialMediaStatus.{platform}.queued = true`
- Stores metadata for content generation

**`onListingPublished`** - Triggered when listing status changes to 'published' or 'active'
- Marks content for all 4 platforms in Firestore
- Generates description from metadata if missing
- Sets `socialMediaStatus.{platform}.queued = true`

### Scheduler

**`socialMediaScheduler`** - HTTP function called by Cloud Scheduler every 83 minutes
- Checks each platform's schedule (from Secret Manager)
- If within posting window → fetches oldest unpublished content
- Publishes 1 content item per platform per window
- Marks content as published in Firestore

**Scheduler URL:** `https://europe-west1-kotikreikasta.cloudfunctions.net/socialMediaScheduler`

### Publishers (Pub/Sub Triggered)

**Platforms:**
- `blueskyPublisher`
- `xPublisher`
- `facebookPublisher`
- `threadsPublisher`

**Called by scheduler with content data**

**Request Body:**
```json
{
  "contentType": "listing" | "blog",
  "contentId": "abc123",
  "contentCollection": "listings" | "content",
  "title": "Kaunis merenrantakiinteistö Porto Raftissa",
  "description": "Upea 120m² huvila suoraan rannalla...",
  "url": "https://kotikreikasta.com/kohteet/porto-rafti-villa",
  "metadata": {
    "location": "Porto Rafti, Attika",
    "price": 450000,
    "area": 120,
    "bedrooms": 3
  }
}
```

**Response (Success):**
```json
{
  "ok": true,
  "platform": "bluesky",
  "postId": "at://did:plc:xyz/app.bsky.feed.post/abc123",
  "postUrl": "https://bsky.app/profile/kotikreikasta.bsky.social/post/abc123",
  "text": "Porto Rafti on yksi Attikan parhaita...\n\nhttps://kotikreikasta.com/...",
  "characterCount": 285,
  "trackedUrl": "https://kotikreikasta.com/...?utm_source=bluesky&...",
  "duration": 3245
}
```

**Response (Error):**
```json
{
  "error": "publish_failed",
  "detail": "content_generation_failed: ...",
  "duration": 1523
}
```

## Required Secrets

### Platform Credentials
- `BLUESKY_IDENTIFIER` - Bluesky username
- `BLUESKY_PASSWORD` - Bluesky app password
- `X_API_KEY` - X API key
- `X_API_SECRET` - X API secret
- `X_ACCESS_TOKEN` - X access token
- `X_ACCESS_SECRET` - X access token secret
- `FACEBOOK_PAGE_ID` - Facebook Page ID
- `META_SYSTEM_TOKEN` - Meta System User token
- `THREADS_USER_ID` - Threads/Instagram Business Account ID
- `THREADS_ACCESS_TOKEN` - Threads long-lived access token

### Posting Schedules
- `BSKY_SCHEDULE` - Bluesky posting windows by day
- `X_SCHEDULE` - X posting windows by day
- `FACEBOOK_SCHEDULE` - Facebook posting windows by day
- `THREADS_SCHEDULE` - Threads posting windows by day

**Schedule format:**
```json
{
  "platform": "bluesky",
  "schedule": [
    {
      "day": "Monday",
      "primary": { "window": "07:00–08:30", "tz": "EEST" },
      "secondary": null
    }
  ],
  "postingBehavior": {
    "minMinutesBetweenPosts": 60
  }
}
```

### Content Generation
- `SOCIAL_MEDIA_LLM_GUIDE` - Finnish writing guide for Vertex AI
- `GEMINI_COSTOPTIMIZED_MODEL` - Gemini model name

## Character Limits & Link Handling

| Platform | Total Limit | Link Reserve | Text Budget |
|----------|-------------|--------------|-------------|
| Bluesky | 300 | Full URL | 300 - URL length |
| X | 280 | 23 (t.co) | ~257 |
| Facebook | 5000 | Full URL | 5000 - URL length |
| Threads | 500 | Full URL | 500 - URL length |

## OG Tags & Link Previews

All platforms automatically fetch and display OG tags from shared URLs:

**Required OG tags on target pages:**
```html
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:image" content="https://..." />
<meta property="og:url" content="https://..." />
<meta property="og:type" content="website" />
```

**Platform-specific behavior:**
- **Bluesky**: Fetches OG tags, displays card with image
- **X**: Fetches OG tags, displays Twitter Card
- **Facebook**: Fetches OG tags, displays link preview with image
- **Threads**: Fetches OG tags, displays Instagram-style preview

## Usage Examples

### Publish a Listing

```typescript
const response = await fetch(
  'https://europe-west1-kotikreikasta.cloudfunctions.net/publishToBluesky',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      contentType: 'listing',
      contentId: 'listing-123',
      contentCollection: 'listings',
      title: 'Kaunis merenrantakiinteistö Porto Raftissa',
      description: 'Upea 120m² huvila suoraan rannalla, kolme makuuhuonetta...',
      url: 'https://kotikreikasta.com/kohteet/porto-rafti-villa',
      metadata: {
        location: 'Porto Rafti, Attika',
        price: 450000,
        area: 120,
        bedrooms: 3,
      },
    }),
  }
);

const result = await response.json();
console.log('Posted:', result.postUrl);
```

### Publish a Blog Post

```typescript
const response = await fetch(
  'https://europe-west1-kotikreikasta.cloudfunctions.net/publishToFacebook',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      contentType: 'blog',
      contentId: 'blog-kreikan-kiinteistokauppa',
      contentCollection: 'content',
      title: 'Kreikan kiinteistökaupan vaiheet',
      description: 'Kattava opas kreikkalaiseen kiinteistökauppaan...',
      url: 'https://kotikreikasta.com/blog/kreikan-kiinteistokauppa',
    }),
  }
);

const result = await response.json();
console.log('Posted:', result.postUrl);
```

### Check Share Statistics

```typescript
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();
const listingRef = db.collection('listings').doc('listing-123');
const doc = await listingRef.get();
const stats = doc.data()?.socialShareStats;

console.log('Total shares:', stats.totalShares);
console.log('Bluesky shares:', stats.sharesByPlatform.bluesky.count);
console.log('Last shared:', stats.lastSharedAt.toDate());
```

### Get Recent Shares

```typescript
const listingRef = db.collection('listings').doc('listing-123');
const sharesSnapshot = await listingRef
  .collection('socialShares')
  .orderBy('sharedAt', 'desc')
  .limit(10)
  .get();

sharesSnapshot.forEach(doc => {
  const share = doc.data();
  console.log(`${share.platform}: ${share.postUrl}`);
});
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `credentials_fetch_failed` | Secret Manager access denied | Grant secretAccessor role |
| `content_generation_failed` | Vertex AI error | Check LLM guide secret, verify quota |
| `bluesky_session_error_401` | Invalid credentials | Update BLUESKY_PASSWORD |
| `x_api_error_403` | Invalid API keys | Regenerate X API credentials |
| `facebook_api_error_190` | Expired token | Refresh META_SYSTEM_TOKEN |
| `threads_create_error_400` | Invalid token | Refresh THREADS_ACCESS_TOKEN |

### Retry Behavior

```typescript
// Automatic retry with exponential backoff
Attempt 1: Immediate
Attempt 2: Wait 1s
Attempt 3: Wait 2s
// If all fail: throw error
```

## Monitoring & Logs

### View Function Logs

```bash
# All platforms
gcloud logging read 'resource.type=cloud_function AND resource.labels.function_name=~"publishTo"' \
  --limit=50 \
  --project=kotikreikasta

# Specific platform
gcloud logging read 'resource.type=cloud_function AND resource.labels.function_name=publishToBluesky' \
  --limit=20 \
  --project=kotikreikasta
```

### Key Metrics to Monitor

- **Success rate**: Successful posts / total attempts
- **Average duration**: Time from request to post
- **Character usage**: Average text length per platform
- **Retry rate**: Posts requiring retries
- **Platform distribution**: Shares per platform

## Best Practices

### 1. Content Quality
- Ensure OG tags are properly set on all target URLs
- Use high-quality images (1200x630px for OG images)
- Keep titles concise and descriptive
- Provide detailed descriptions for Vertex AI

### 2. Timing
- Avoid posting the same content to all platforms simultaneously
- Space out posts by 5-10 minutes to avoid spam detection
- Consider platform-specific optimal posting times

### 3. Monitoring
- Check Firestore share statistics regularly
- Monitor UTM parameters in Google Analytics
- Review failed shares and retry if needed

### 4. Token Management
- Threads token expires in 60 days (auto-refresh configured)
- X tokens don't expire but can be revoked
- Facebook System User tokens don't expire
- Bluesky app passwords don't expire

## Posting Schedule

### Cloud Scheduler
- **Cron:** `0,23,46 * * * *` (every 83 minutes)
- **Job Name:** `bluesky-hourly-check`
- **Target:** `socialMediaScheduler` HTTP function

### Example Timeline

**Thursday 15:00-16:30 EEST (X window):**
- Scheduler runs at 15:00, 15:23, 15:46, 16:09
- First run: X publishes Blog Post #1
- Subsequent runs: No more content (only 1 per window)

**Thursday 15:30-17:00 EEST (Bluesky window):**
- Scheduler runs at 15:30, 15:53, 16:16, 16:39
- First run: Bluesky publishes Blog Post #1
- Subsequent runs: No more content

**Thursday 16:00-18:00 EEST (Facebook & Threads window):**
- Scheduler runs at 16:00, 16:23, 16:46, 17:09, 17:32
- First run: Facebook publishes Blog Post #1, Threads publishes Blog Post #1
- Subsequent runs: No more content

**Next day (Friday):**
- Each platform publishes Blog Post #2 during their windows
- Content distributed gradually across days

## Content Generation (Vertex AI)

### Token Budget Calculation
- Finnish text: ~1 token = 3.5 characters
- Dynamic token limit based on platform character limit
- 20% safety margin to prevent overruns
- Example: Bluesky (300 chars) → ~54 tokens with safety margin

### Truncation Logic
1. **Sentence boundary** - Prefer complete sentences (within 70% of budget)
2. **Word boundary** - Avoid mid-word cuts (within 50% of budget)
3. **Hard truncate with "..."** - Only as last resort

## Future Enhancements

- [x] Scheduled publishing (Cloud Scheduler integration)
- [x] FIFO queue management
- [x] One post per platform per window
- [ ] Image attachment support
- [ ] Multi-image carousels (Instagram/Facebook)
- [ ] Video support
- [ ] Hashtag optimization
- [ ] A/B testing for post variations
- [ ] Automatic reposting of high-performing content
- [ ] Cross-platform analytics dashboard

---

*Last updated: March 19, 2026*
*Architecture: Scheduler-based with Firestore queue management*
