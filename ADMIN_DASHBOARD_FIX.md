# Admin Dashboard Fix - Firebase API Key Restrictions Issue

## Issue
The entire admin dashboard was returning 500 Internal Server Errors on all routes, including:
- Homepage (`/`)
- Blog listing (`/blogs`)
- Blog editor pages
- API routes (`/api/auth/session`, `/api/upload-image-crops`)
- Static assets (favicon, etc.)

The error in Cloud Run logs was:
```
FirebaseError: Firebase: Error (auth/requests-from-referer-<empty>-are-blocked.)
    at handleAuth (file:///workspace/node_modules/firebase-frameworks/dist/firebase-aware.js:80:9)
```

## Root Cause Analysis

### Firebase Frameworks Middleware
When deploying Next.js apps to Firebase Hosting with Cloud Run backend, Firebase automatically injects the `firebase-frameworks` middleware. This middleware includes `firebase-aware.js` which attempts to authenticate every incoming request using Firebase Auth client SDK.

### The Actual Problem
1. **Firebase API keys had HTTP referrer restrictions** configured in Google Cloud Console
2. The Firebase Browser API key (auto-created by Firebase) had `browserKeyRestrictions.allowedReferrers` that did NOT include the Cloud Run URL
3. When Firebase Frameworks middleware tried to authenticate requests from Cloud Run, the API key restrictions blocked them
4. Firebase Auth rejected the requests with `auth/requests-from-referer-<empty>-are-blocked`
5. The middleware failed, returning a 500 error before the Next.js app could handle the request

### Why This Happened
This started on **March 27, 2026 at 08:37 UTC** when Firebase began enforcing stricter API key restrictions. The Cloud Run URL `ssrkotikreikastaadmin-46sdi6q5sa-uc.a.run.app` was not in the allowed referrers list for the Firebase Browser API key.

## Solution

Remove API key restrictions from the Firebase Browser API key:

```bash
gcloud services api-keys update 591fee89-1912-4a7d-88cf-28fad9ccc26b \
  --clear-restrictions \
  --project=kotikreikasta
```

**Alternative solution** (if you want to keep restrictions):
Add the Cloud Run URLs to the allowed referrers:
```bash
gcloud services api-keys update 591fee89-1912-4a7d-88cf-28fad9ccc26b \
  --allowed-referrers='https://kotikreikasta.com/*,https://*.kotikreikasta.com/*,https://kotikreikasta.web.app/*,https://kotikreikasta.firebaseapp.com/*,https://ssrkotikreikastaadmin-46sdi6q5sa-uc.a.run.app/*,https://*-ssrkotikreikastaadmin-46sdi6q5sa-uc.a.run.app/*' \
  --project=kotikreikasta
```

## Verification

After removing API key restrictions, the admin dashboard started working immediately:

```bash
# Before fix
GET 500 https://admin.kotikreikasta.com/blogs
FirebaseError: Firebase: Error (auth/requests-from-referer-<empty>-are-blocked.)

# After fix
GET 200 https://admin.kotikreikasta.com/
GET 200 https://admin.kotikreikasta.com/blogs
GET 200 https://admin.kotikreikasta.com/blogs/[id]
```

## Key Learnings

1. **Firebase API key restrictions** - HTTP referrer restrictions on Firebase API keys can block Cloud Run requests
2. **Multiple API keys** - Check ALL API keys with browser restrictions, not just one
3. **Firebase Frameworks middleware** - It's injected by Firebase Hosting deployment and uses the Firebase Browser API key
4. **The error is misleading** - The error message says "referer-<empty>-are-blocked" but the actual issue is API key restrictions
5. **Not about authorized domains** - Adding the Cloud Run URL to Firebase Auth authorized domains does NOT fix this issue

## Related Configuration

- Firebase project: `kotikreikasta`
- Cloud Run service: `ssrkotikreikastaadmin`
- Cloud Run region: `us-central1`
- Admin domain: `admin.kotikreikasta.com`
- Cloud Run URL: `ssrkotikreikastaadmin-46sdi6q5sa-uc.a.run.app`
- Firebase Browser API key: `591fee89-1912-4a7d-88cf-28fad9ccc26b`

## Date
March 27, 2026

## Timeline
- **08:37 UTC**: Issue started - Firebase began enforcing API key restrictions
- **10:03 UTC**: First attempted fix - Added Cloud Run URL to API key allowed referrers
- **10:16 UTC**: Second attempted fix - Updated second API key with restrictions
- **10:18 UTC**: Final fix - Removed all API key restrictions from Firebase Browser key
- **10:23 UTC**: Image upload issue - Cloud Run memory limit (256MB) exceeded during Sharp image processing
- **10:24 UTC**: Increased Cloud Run memory limit to 512MB to fix image uploads
- **10:25 UTC**: Second image upload issue - Firebase Admin SDK initialization error
- **10:26 UTC**: Fixed Firebase initialization by moving bucket creation inside request handler
- **10:49 UTC**: Third image upload issue - "Bucket name not specified or invalid" error
- **11:18 UTC**: Root cause identified - Firebase Admin SDK already initialized by Firebase Frameworks without storageBucket config
- **11:18 UTC**: Final fix - Explicitly pass bucket name to `bucket()` method instead of relying on initialization config
- **11:20 UTC**: Blog publishing issue - Vertex AI API error "RESOURCE_PROJECT_INVALID"
- **11:22 UTC**: Fixed by adding `GCLOUD_PROJECT=kotikreikasta` environment variable to Cloud Run
- **11:22 UTC**: All issues resolved - Image upload and blog publishing working

## Storage Bucket Fix Details

### Problem
The Firebase Admin SDK was already initialized by Firebase Frameworks middleware without the `storageBucket` configuration. When our code called `getFirebaseAdmin()`, it returned the existing app (due to the `if (admin.apps.length > 0)` check), so our `storageBucket` initialization parameter was never used.

### Solution
Instead of relying on the initialization config, explicitly pass the bucket name to the `bucket()` method:

```typescript
// Before (didn't work)
const bucket = admin.storage(app).bucket();

// After (works)
const bucketName = 'kotikreikasta.firebasestorage.app';
const bucket = admin.storage(app).bucket(bucketName);
```

### Files Modified
- `admin/app/api/upload-image-crops/route.ts` - Updated `getBucket()` function
- `admin/app/api/upload-image/route.ts` - Updated bucket initialization
- `admin/.env` - Created with `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` for build-time config

## Vertex AI Fix Details

### Problem
The blog publishing API was calling Vertex AI's Gemini model for SEO generation, but the `GCLOUD_PROJECT` environment variable was missing from Cloud Run, causing the API URL to be constructed with an empty project ID.

### Solution
Added the required environment variable to Cloud Run:
```bash
gcloud run services update ssrkotikreikastaadmin \
  --region=us-central1 \
  --set-env-vars="GCLOUD_PROJECT=kotikreikasta"
```

## Instagram Publisher Fix Details

### Problem
The Instagram publisher was failing to publish posts even when the social media scheduler indicated success. Multiple issues were discovered:

1. **Duplicate Time Window Check** - The Instagram publisher had its own time window validation that conflicted with the scheduler's validation, causing posts to be rejected even when the scheduler determined they were within the posting window.

2. **Missing Firestore Indexes** - Three composite indexes were missing:
   - `blog_posts` collection: Required for querying Instagram-eligible blog posts
   - `listings` collection: Required for querying Instagram-eligible listings
   - `socialShares` collection: Required for window limit tracking (maxPostsPerWindow enforcement)

3. **Image Access Error (403)** - The auto-crop feature was using HTTP `fetch()` to download images from Firebase Storage, which failed with 403 errors due to expired tokens or CORS restrictions.

4. **Wrong Instagram Account ID** - The code was reading `INSTAGRAM_APP_ID` secret which contained the Facebook App ID (`1279297020790292`) instead of the Instagram Business Account ID.

5. **Instagram API Timing Issue** - Instagram's Graph API requires time between creating a media container and publishing it. The publisher was attempting to publish immediately after container creation, resulting in error 9007 subcode 2207027 ("Media ID is not available").

### Solution

#### 1. Removed Duplicate Time Window Check
Modified `functions/src/consumers/instagram-pubsub.ts` to remove the redundant `isWithinPostingWindow()` check and function. The scheduler already validates time windows before calling the publisher.

```typescript
// REMOVED: Duplicate time window validation
// if (schedule && !isWithinPostingWindow(schedule)) {
//   return;
// }

// KEPT: Window limit check (maxPostsPerWindow)
const schedule = await fetchSchedule();
if (schedule) {
  const withinLimit = await checkWindowLimit(schedule, contentCollection);
  if (!withinLimit) {
    return;
  }
}
```

#### 2. Created Missing Firestore Indexes
Created three composite indexes via Firebase Console:
- `blog_posts`: Fields: platform, socialMediaStatus.instagram.published, socialMediaStatus.instagram.queued, publishedAt
- `listings`: Fields: platform, socialMediaStatus.instagram.published, socialMediaStatus.instagram.queued, publishedAt
- `socialShares`: Fields: platform, success, sharedAt, __name__

#### 3. Fixed Image Access with Firebase Admin SDK
Modified `functions/src/utils/image-auto-crop.ts` to use Firebase Admin SDK instead of HTTP fetch:

```typescript
// Before (failed with 403)
const response = await fetch(originalUrl);
const buffer = Buffer.from(await response.arrayBuffer());

// After (works)
const urlMatch = originalUrl.match(/\/o\/([^?]+)/);
const storagePath = decodeURIComponent(urlMatch[1]);
const storageBucket = admin.storage().bucket();
const storageFile = storageBucket.file(storagePath);
const [buffer] = await storageFile.download();
```

#### 4. Updated Instagram Account ID Secret
- Created new secret: `INSTAGRAM_ACCOUNT_ID` with the correct Instagram Business Account ID (17-digit number)
- Updated `fetchInstagramCredentials()` to read from `INSTAGRAM_ACCOUNT_ID` instead of `INSTAGRAM_APP_ID`

#### 5. Added Processing Delay
Added 20-second delay between container creation and publishing to allow Instagram to process the uploaded image:

```typescript
functions.logger.info('Instagram container created', { containerId });

// Wait for Instagram to process the image (typically takes 10-30 seconds)
functions.logger.info('Waiting for Instagram to process image...', { waitSeconds: 20 });
await new Promise(resolve => setTimeout(resolve, 20000));

// Step 2: Publish the container
const publishResponse = await fetch(...);
```

### Files Modified
- `functions/src/consumers/instagram-pubsub.ts` - Removed duplicate time window check, updated credential fetching, added 20-second processing delay
- `functions/src/utils/image-auto-crop.ts` - Changed image download from HTTP fetch to Firebase Admin SDK

### Secrets Updated
- Created: `INSTAGRAM_ACCOUNT_ID` - Contains Instagram Business Account ID (17-digit number starting with "17")
- Note: `INSTAGRAM_APP_ID` still exists but contains Facebook App ID - should be deprecated

### Verification
After all fixes were deployed, manual testing confirmed:
```
14:52:40 UTC - Instagram container created (ID: 18046108946556548)
14:52:40 UTC - Waiting for Instagram to process image... (20 seconds)
14:53:02 UTC - Posted to Instagram
14:53:03 UTC - Social share tracked
14:53:03 UTC - Instagram publish successful
```

### Timeline
- **14:23 UTC**: Identified duplicate time window check issue
- **14:24 UTC**: Deployed fix for duplicate time window check
- **14:26 UTC**: Discovered missing `socialShares` Firestore index
- **14:30 UTC**: Index created, discovered image access 403 error
- **14:34 UTC**: Deployed Firebase Admin SDK image download fix
- **14:42 UTC**: Identified wrong Instagram Account ID (was using Facebook App ID)
- **14:46 UTC**: Updated code to use new `INSTAGRAM_ACCOUNT_ID` secret
- **14:49 UTC**: Discovered Instagram API timing issue (error 9007/2207027)
- **14:51 UTC**: Deployed 20-second processing delay fix
- **14:53 UTC**: ✅ Instagram publishing fully operational

### Date
March 27, 2026
```
