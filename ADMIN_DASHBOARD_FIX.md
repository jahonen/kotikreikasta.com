# Admin Dashboard Fix - Firebase Frameworks Authentication Issue

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

### The Problem
1. **Firebase Frameworks middleware** (`firebase-aware.js`) intercepts all requests
2. It tries to sign in with a custom token using `signInWithCustomToken()`
3. Firebase Auth validates the request and checks the **referer header**
4. **Cloud Run doesn't send referer headers** for server-side requests
5. Firebase Auth blocks the request with `auth/requests-from-referer-<empty>-are-blocked`
6. The middleware fails, returning a 500 error before the Next.js app can handle the request

### Why This Happened
This is a **security feature** in Firebase Auth. By default, Firebase Auth only allows authentication requests from authorized domains. When the referer header is empty (as it is in Cloud Run server-side requests), Firebase Auth blocks the request unless the requesting domain is explicitly authorized.

## Solution

Add the Cloud Run service URL to Firebase Auth's authorized domains:

1. Go to [Firebase Console](https://console.firebase.google.com/project/kotikreikasta/authentication/settings)
2. Navigate to **Authentication** → **Settings** → **Authorized domains**
3. Click **Add domain**
4. Add the Cloud Run service URL: `ssrkotikreikastaadmin-46sdi6q5sa-uc.a.run.app`
5. Save the changes

## Verification

After adding the domain, the admin dashboard started working immediately:

```bash
# Before fix
GET 500 https://ssrkotikreikastaadmin-46sdi6q5sa-uc.a.run.app/blogs
FirebaseError: Firebase: Error (auth/requests-from-referer-<empty>-are-blocked.)

# After fix
GET 200 https://ssrkotikreikastaadmin-46sdi6q5sa-uc.a.run.app/
GET 200 https://ssrkotikreikastaadmin-46sdi6q5sa-uc.a.run.app/blogs
```

## Key Learnings

1. **Firebase Frameworks middleware is automatic** - It's injected by Firebase Hosting deployment and cannot be disabled through Next.js configuration
2. **Cloud Run URLs must be authorized** - Any Cloud Run service that uses Firebase Auth must have its URL added to authorized domains
3. **This affects all routes** - The middleware runs before Next.js, so it blocks everything including static assets
4. **The error is misleading** - The error message doesn't clearly indicate that the Cloud Run URL needs to be authorized

## Related Configuration

- Firebase project: `kotikreikasta`
- Cloud Run service: `ssrkotikreikastaadmin`
- Cloud Run region: `us-central1`
- Admin domain: `admin.kotikreikasta.com` (already authorized)
- Cloud Run URL: `ssrkotikreikastaadmin-46sdi6q5sa-uc.a.run.app` (needed to be added)

## Date
March 27, 2026
