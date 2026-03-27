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
