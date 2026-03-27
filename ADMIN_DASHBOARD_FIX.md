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
