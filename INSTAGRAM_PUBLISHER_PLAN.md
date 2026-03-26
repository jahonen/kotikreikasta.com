# Instagram Publisher Implementation Plan

## Overview

Create a new Instagram publisher Cloud Function that follows the existing social media publisher architecture (Facebook, Bluesky, X, Threads) to automatically share blog posts and listings to Instagram.

## Requirements

### Critical Constraints
1. **No link sharing** - Instagram does not support clickable links in posts
2. **CTA format** - Always use "Linkki biossa" (Link in bio) or similar Finnish CTA
3. **Image requirement** - 1:1 (square) aspect ratio required
4. **Auto-crop fallback** - If 1:1 crop doesn't exist, automatically generate and save it
5. **One post per window** - Enforce single Instagram post per schedule window
6. **Target audience** - Finnish, affluent, middle-aged, considering Greek holiday homes

### Google Secrets (Already Created)
- `INSTAGRAM_ACCESS_TOKEN` - User access token
- `INSTAGRAM_APP_ID` - App ID: 1279297020790292
- `INSTAGRAM_APP_NAME` - Kotikreikasta connector-IG
- `INSTAGRAM_APP_SECRET` - App secret
- `INSTAGRAM_SCHEDULE` - Posting schedule configuration

### Access Token Details
- **Type**: User token
- **App-Scoped User ID**: 34363451086631741
- **Expires**: 1779715380 (in about 2 months)
- **Data Access Expires**: 1782307378 (in about 3 months)
- **Scopes**:
  - `instagram_business_basic`
  - `instagram_business_manage_messages`
  - `instagram_business_content_publish`
  - `instagram_business_manage_insights`
  - `instagram_business_manage_comments`

## Architecture Analysis

### Existing Publisher Pattern (from Facebook/Bluesky/X/Threads)

All existing publishers follow this structure:

1. **Pub/Sub Consumer** (`functions/src/consumers/{platform}-pubsub.ts`)
   - Listens to `social-media-publishing` topic
   - Fetches schedule from Secret Manager
   - Checks if within posting window
   - Validates message data
   - Generates content with Vertex AI
   - Posts to platform API
   - Tracks share in Firestore
   - Updates `socialMediaStatus.{platform}` in content document

2. **Scheduler Integration** (`functions/src/schedulers/social-media-scheduler.ts`)
   - Runs every 83 minutes via HTTP trigger
   - Checks all platform schedules
   - Fetches unpublished content (1 item per platform)
   - Calls publisher functions directly

3. **Utilities Used**
   - `social-media-utils.ts` - UTM tracking, retry logic, platform limits
   - `vertex-ai-content.ts` - AI content generation
   - `firestore-tracking.ts` - Social share tracking
   - `image-crop-utils.ts` - Optimal image selection

### Instagram API Specifics

Instagram Graph API for publishing:
1. Create media container (POST to `/{ig-user-id}/media`)
2. Publish container (POST to `/{ig-user-id}/media_publish`)

**Container Creation Parameters**:
- `image_url` - Public URL to image (required)
- `caption` - Post text (max 2200 characters)
- `access_token` - User access token

**No link attachment** - Unlike Threads/Facebook, Instagram doesn't support link previews

## Implementation Plan

### 1. Update Type Definitions

**File**: `functions/src/utils/social-media-utils.ts`

```typescript
export type SocialPlatform = 'bluesky' | 'x' | 'facebook' | 'threads' | 'instagram';

export const PLATFORM_LIMITS: Record<SocialPlatform, number> = {
  bluesky: 300,
  x: 280,
  facebook: 5000,
  threads: 500,
  instagram: 2200, // Instagram caption limit
};
```

**File**: `functions/src/utils/image-crop-utils.ts`

```typescript
export type ImageContext = 'bluesky' | 'threads' | 'facebook' | 'twitter' | 'instagram';

const PLATFORM_ASPECT_RATIOS: Record<ImageContext, keyof NonNullable<FeaturedImage['crops']>> = {
  bluesky: '16:9',
  threads: '1:1',
  facebook: '16:9',
  twitter: '16:9',
  instagram: '1:1', // Already defined
};
```

### 2. Create Instagram Publisher

**File**: `functions/src/consumers/instagram-pubsub.ts`

**Structure** (following Threads pattern as closest match):

```typescript
import * as functions from 'firebase-functions/v1';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { 
  ContentType, 
  buildTrackedURL, 
  retryWithBackoff 
} from '../utils/social-media-utils';
import { 
  ContentInput, 
  generateSocialContent 
} from '../utils/vertex-ai-content';
import { trackSocialShare } from '../utils/firestore-tracking';
import { extractOptimalImage } from '../utils/image-crop-utils';
import { ensureSquareCrop } from '../utils/image-auto-crop';

// Interfaces
interface InstagramCredentials {
  userId: string;
  accessToken: string;
}

interface TimeWindow {
  window: string;
  tz: string;
}

interface DaySchedule {
  day: string;
  primary: TimeWindow;
  secondary?: TimeWindow;
}

interface PlatformSchedule {
  platform: string;
  schedule: DaySchedule[];
  postingBehavior: {
    minMinutesBetweenPosts: number;
    maxPostsPerWindow: number; // Should be 1 for Instagram
  };
}

interface PublishMessage {
  contentType: 'listing' | 'blog';
  contentId: string;
  contentCollection: 'listings' | 'blog_posts';
  title: string;
  description: string;
  url: string;
  featuredImage?: any;
  metadata?: Record<string, any>;
}

// Functions
async function fetchSchedule(): Promise<PlatformSchedule | null>
async function fetchInstagramCredentials(): Promise<InstagramCredentials>
async function checkPostingWindowLimit(schedule: PlatformSchedule): Promise<boolean>
async function postToInstagram(caption: string, imageUrl: string, credentials: InstagramCredentials): Promise<{ postId: string; postUrl?: string }>

export const instagramPublisher = functions
  .runWith({ timeoutSeconds: 120, memory: '512MB' })
  .region('europe-west1')
  .pubsub.topic('social-media-publishing')
  .onPublish(async (message) => {
    // Implementation
  });
```

**Key Differences from Other Publishers**:
1. **No URL in caption** - Use "Linkki biossa" CTA instead
2. **Image required** - Must have 1:1 crop or generate one
3. **Window limit check** - Enforce maxPostsPerWindow=1
4. **Finnish-focused content** - Vertex AI prompt should emphasize Finnish audience

### 3. Create Auto-Crop Utility

**File**: `functions/src/utils/image-auto-crop.ts`

```typescript
import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import sharp from 'sharp';

/**
 * Ensure a 1:1 square crop exists for an image
 * If it doesn't exist, generate it from the original and save to Firebase Storage
 */
export async function ensureSquareCrop(
  featuredImage: any,
  contentCollection: string,
  contentId: string
): Promise<string> {
  // Check if 1:1 crop already exists
  if (featuredImage?.crops?.['1:1']?.full) {
    return featuredImage.crops['1:1'].full;
  }
  
  if (featuredImage?.crops?.['1:1']?.og) {
    return featuredImage.crops['1:1'].og;
  }
  
  // If no 1:1 crop, generate from original
  const originalUrl = featuredImage?.url;
  if (!originalUrl) {
    throw new Error('No original image URL available');
  }
  
  // Fetch original image
  const response = await fetch(originalUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Get image dimensions
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  
  // Calculate center square crop
  const size = Math.min(width, height);
  const left = Math.floor((width - size) / 2);
  const top = Math.floor((height - size) / 2);
  
  // Generate 1:1 crop at 1200px (og size for social media)
  const croppedBuffer = await sharp(buffer)
    .rotate() // Auto-rotate based on EXIF
    .extract({ left, top, width: size, height: size })
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: false })
    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
    .toBuffer();
  
  // Save to Firebase Storage
  const bucket = admin.storage().bucket();
  const path = `${contentCollection}/${contentId}/1-1-og.jpg`;
  const file = bucket.file(path);
  
  const downloadToken = require('crypto').randomBytes(32).toString('hex');
  
  await file.save(croppedBuffer, {
    metadata: {
      contentType: 'image/jpeg',
      metadata: {
        aspectRatio: '1:1',
        size: 'og',
        autoGenerated: 'true',
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });
  
  const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${downloadToken}`;
  
  // Update Firestore with new crop
  const db = admin.firestore();
  await db.collection(contentCollection).doc(contentId).update({
    'featuredImage.crops.1:1.og': imageUrl,
  });
  
  functions.logger.info('Auto-generated 1:1 crop', { contentId, imageUrl });
  
  return imageUrl;
}
```

### 4. Update Scheduler

**File**: `functions/src/schedulers/social-media-scheduler.ts`

Add Instagram to platforms array and secret names:

```typescript
const platforms = ['bluesky', 'x', 'facebook', 'threads', 'instagram'];
const secretNames = {
  bluesky: 'BSKY_SCHEDULE',
  x: 'X_SCHEDULE',
  facebook: 'FACEBOOK_SCHEDULE',
  threads: 'THREADS_SCHEDULE',
  instagram: 'INSTAGRAM_SCHEDULE',
};
```

Add Instagram publisher import:

```typescript
const { instagramPublisher } = require('../consumers/instagram-pubsub');

const publishers: Record<string, any> = {
  bluesky: blueskyPublisher,
  x: xPublisher,
  facebook: facebookPublisher,
  threads: threadsPublisher,
  instagram: instagramPublisher,
};
```

### 5. Update Vertex AI Content Generation

**File**: `functions/src/utils/vertex-ai-content.ts`

Add Instagram-specific prompt that:
- Emphasizes "Linkki biossa" CTA
- Targets Finnish, affluent, middle-aged audience
- Focuses on Greek holiday home lifestyle
- Uses appropriate Finnish tone
- Stays within 2200 character limit

### 6. Firestore Schema Updates

**Collections**: `blog_posts`, `listings`

**New fields**:
```typescript
{
  socialMediaStatus: {
    instagram: {
      queued: boolean;
      queuedAt: Timestamp;
      published: boolean;
      publishedAt: Timestamp;
      postId: string;
      postUrl: string;
    }
  },
  socialShareStats: {
    sharesByPlatform: {
      instagram: {
        count: number;
        lastSharedAt: Timestamp;
        lastPostId: string;
      }
    }
  }
}
```

**Subcollection**: `socialShares`

Documents will include platform='instagram' entries.

### 7. Testing Strategy

1. **Local Testing**
   - Build functions: `cd functions && npm run build`
   - Test schedule parsing
   - Test credential fetching (mock)
   - Test auto-crop generation with sample images

2. **Staging Testing**
   - Deploy to test environment
   - Queue test content
   - Verify schedule window enforcement
   - Verify 1:1 image handling
   - Verify auto-crop generation
   - Check Firestore tracking

3. **Production Testing**
   - Deploy to production
   - Monitor first few posts
   - Verify token refresh (expires in 2 months)
   - Check analytics and insights

## Instagram API Flow

### Publishing Process

1. **Create Media Container**
```
POST https://graph.instagram.com/v18.0/{ig-user-id}/media
{
  "image_url": "https://firebasestorage.googleapis.com/...",
  "caption": "Generated caption with #hashtags\n\nLinkki biossa! 🏝️",
  "access_token": "{access-token}"
}

Response: { "id": "{creation-id}" }
```

2. **Publish Container**
```
POST https://graph.instagram.com/v18.0/{ig-user-id}/media_publish
{
  "creation_id": "{creation-id}",
  "access_token": "{access-token}"
}

Response: { "id": "{media-id}" }
```

3. **Construct Post URL**
```
https://www.instagram.com/p/{media-shortcode}/
```

Note: May need to fetch media details to get shortcode from media-id.

## Content Strategy

### Caption Format (Finnish)

```
[Emoji] [Engaging hook]

[Brief description highlighting Greek lifestyle/property benefits]

[Call to action: "Linkki biossa!" or "Lue lisää biosta!"]

#Hashtag1 #Hashtag2 (max 1-3 hashtags)
```

**Hashtag Strategy**:
- **Limit**: 1-3 hashtags maximum per post
- **Focus**: Most relevant, high-impact tags only
- **Primary tags**: #Kreikka, #LomaAsunto, #Kiinteistöt
- **Avoid**: Over-tagging, generic hashtags

### Example Captions

**For Listing** (2 hashtags):
```
🏝️ Unelma-asunto Kreikan saarella!

Upea 3h+k loma-asunto vain 100m rannasta. Aurinkoinen terassi, merinäköala ja kaikki palvelut lähellä. Täydellinen paikka rentoutua ja nauttia välimerellisestä elämäntavasta.

Tutustu kohteeseen - linkki biossa! ☀️

#Kreikka #LomaAsunto
```

**For Blog Post** (1 hashtag):
```
📖 5 syytä hankkia loma-asunto Kreikasta

Oletko haaveillut omasta paikasta auringon alla? Kreikka tarjoaa ainutlaatuisen yhdistelmän kulttuuria, luontoa ja rentoa elämäntapaa.

Lue koko artikkeli - linkki biossa!

#Kreikka
```

## Schedule Configuration

**Secret**: `INSTAGRAM_SCHEDULE`

**Format** (JSON):
```json
{
  "platform": "instagram",
  "schedule": [
    {
      "day": "Monday",
      "primary": { "window": "09:00–10:00", "tz": "EEST" }
    },
    {
      "day": "Wednesday",
      "primary": { "window": "18:00–19:00", "tz": "EEST" }
    },
    {
      "day": "Friday",
      "primary": { "window": "12:00–13:00", "tz": "EEST" }
    }
  ],
  "postingBehavior": {
    "minMinutesBetweenPosts": 1440,
    "maxPostsPerWindow": 1
  }
}
```

**Key Points**:
- `maxPostsPerWindow: 1` - Only one post per window
- `minMinutesBetweenPosts: 1440` - 24 hours between posts
- Optimal posting times for Finnish audience (morning, evening, lunch)

## Token Management

### Token Types Investigation

Instagram Graph API supports two token types:
1. **User Access Token** - Currently configured, expires after 60 days
2. **System User Token** - Long-lived, doesn't expire (requires Business Manager setup)

**Current Setup**: User Access Token (expires 1779715380 - May 2026)

### Token Refresh Implementation

Since we're using a User Access Token, we need automatic refresh:

**File**: `functions/src/utils/instagram-token-refresh.ts`

```typescript
import * as functions from 'firebase-functions/v1';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const secretClient = new SecretManagerServiceClient();

interface TokenRefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Refresh Instagram User Access Token
 * Should be called before token expires (60 days)
 */
export async function refreshInstagramToken(): Promise<string> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  // Fetch current token
  const [tokenVersion] = await secretClient.accessSecretVersion({
    name: `projects/${project}/secrets/INSTAGRAM_ACCESS_TOKEN/versions/latest`,
  });
  const currentToken = tokenVersion.payload?.data?.toString() || '';
  
  if (!currentToken) {
    throw new Error('No current Instagram token found');
  }
  
  // Refresh token
  const response = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error('Instagram token refresh failed', {
      status: response.status,
      error: errorText,
    });
    throw new Error(`token_refresh_failed_${response.status}`);
  }
  
  const data: TokenRefreshResponse = await response.json();
  const newToken = data.access_token;
  
  // Update secret in Secret Manager
  const [secret] = await secretClient.getSecret({
    name: `projects/${project}/secrets/INSTAGRAM_ACCESS_TOKEN`,
  });
  
  await secretClient.addSecretVersion({
    parent: secret.name,
    payload: {
      data: Buffer.from(newToken, 'utf8'),
    },
  });
  
  functions.logger.info('Instagram token refreshed successfully', {
    expiresIn: data.expires_in,
  });
  
  return newToken;
}

/**
 * Check if token needs refresh (within 7 days of expiry)
 */
export async function checkTokenExpiration(): Promise<boolean> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  const [tokenVersion] = await secretClient.accessSecretVersion({
    name: `projects/${project}/secrets/INSTAGRAM_ACCESS_TOKEN/versions/latest`,
  });
  const token = tokenVersion.payload?.data?.toString() || '';
  
  // Get token debug info
  const response = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_APP_SECRET}&access_token=${token}`
  );
  
  if (!response.ok) {
    functions.logger.warn('Could not check token expiration');
    return false;
  }
  
  const data = await response.json();
  const expiresIn = data.expires_in || 0;
  const daysUntilExpiry = expiresIn / (60 * 60 * 24);
  
  functions.logger.info('Instagram token expiration check', {
    daysUntilExpiry: Math.floor(daysUntilExpiry),
  });
  
  // Refresh if less than 7 days remaining
  return daysUntilExpiry < 7;
}
```

**File**: `functions/src/schedulers/instagram-token-refresher.ts`

```typescript
import * as functions from 'firebase-functions/v1';
import { refreshInstagramToken, checkTokenExpiration } from '../utils/instagram-token-refresh';

/**
 * Scheduled function to refresh Instagram token
 * Runs daily to check expiration and refresh if needed
 */
export const instagramTokenRefresher = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .region('europe-west1')
  .pubsub.schedule('0 2 * * *') // Run daily at 2 AM
  .timeZone('Europe/Helsinki')
  .onRun(async (context) => {
    try {
      functions.logger.info('Instagram token refresh check started');
      
      const needsRefresh = await checkTokenExpiration();
      
      if (needsRefresh) {
        functions.logger.info('Token needs refresh, refreshing now');
        const newToken = await refreshInstagramToken();
        functions.logger.info('Token refreshed successfully');
        return { success: true, refreshed: true };
      } else {
        functions.logger.info('Token still valid, no refresh needed');
        return { success: true, refreshed: false };
      }
    } catch (error: any) {
      functions.logger.error('Instagram token refresh failed', {
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
      });
      
      // TODO: Send alert to admin (via Novu or email)
      
      throw error;
    }
  });
```

### Alternative: System User Token

If token refresh becomes problematic, consider migrating to System User Token:
1. Set up Facebook Business Manager
2. Create System User
3. Generate long-lived token (doesn't expire)
4. Update `INSTAGRAM_ACCESS_TOKEN` secret

**Pros**: No expiration, no refresh needed
**Cons**: Requires Business Manager setup, more complex initial configuration

## Error Handling

### Common Errors

1. **Image not accessible** - Ensure Firebase Storage URLs are public
2. **Caption too long** - Truncate to 2200 chars
3. **Rate limit** - Respect Instagram API limits (25 posts/day)
4. **Token expired** - Implement refresh flow
5. **No 1:1 image** - Auto-generate from original

### Retry Strategy

Use existing `retryWithBackoff` utility:
- Max 3 attempts
- Exponential backoff
- Log all failures to Firestore

## Monitoring & Analytics

### Metrics to Track

1. **Publishing success rate**
2. **Auto-crop generation frequency**
3. **Schedule window adherence**
4. **Token expiration warnings**
5. **API error rates**

### Logging

All operations should log:
- Content ID and type
- Image URL used
- Caption length
- Post ID and URL
- Duration
- Errors with stack traces

## Implementation Checklist

- [ ] Create `instagram-pubsub.ts`
- [ ] Create `image-auto-crop.ts`
- [ ] Create `instagram-token-refresh.ts` (token refresh utilities)
- [ ] Create `instagram-token-refresher.ts` (scheduled refresher)
- [ ] Update `social-media-utils.ts`
- [ ] Update `image-crop-utils.ts` (already has Instagram)
- [ ] Update `vertex-ai-content.ts` with Instagram prompts (1-3 hashtags)
- [ ] Update `social-media-scheduler.ts`
- [ ] Update `firestore-tracking.ts` type definitions
- [ ] Update `functions/src/index.ts` to export new functions
- [ ] Test auto-crop generation locally
- [ ] Test Instagram API integration
- [ ] Test token refresh mechanism
- [ ] Deploy to staging
- [ ] Test end-to-end flow
- [ ] Deploy to production
- [ ] Monitor first week of posts
- [ ] Verify token auto-refresh works
- [ ] Set up expiration alerts (via Novu)

## Dependencies

- `sharp` - Already installed for image processing
- `@google-cloud/secret-manager` - Already installed
- `firebase-admin` - Already installed
- `firebase-functions` - Already installed

No new dependencies required.

## Timeline

1. **Day 1**: Implement core Instagram publisher
2. **Day 2**: Implement auto-crop utility
3. **Day 3**: Update scheduler and utilities
4. **Day 4**: Local testing and refinement
5. **Day 5**: Deploy and production testing

## Success Criteria

1. ✅ Instagram posts publish automatically on schedule
2. ✅ Only one post per schedule window
3. ✅ All posts use 1:1 square images
4. ✅ Auto-crop generates missing 1:1 images
5. ✅ Captions use "Linkki biossa" CTA
6. ✅ Finnish tone and audience targeting
7. ✅ Firestore tracking works correctly
8. ✅ No manual intervention required
9. ✅ Error handling and logging comprehensive
10. ✅ Token refresh strategy documented

## Notes

- Instagram Business Account required (already configured)
- App must be in production mode (already done)
- User must have `instagram_business_content_publish` permission (already granted)
- Images must be publicly accessible (Firebase Storage with download tokens)
- Caption limit is 2200 characters (more generous than Twitter/Bluesky)
- No link preview cards like Threads/Facebook
- Hashtags work well on Instagram (use 5-10 relevant tags)
