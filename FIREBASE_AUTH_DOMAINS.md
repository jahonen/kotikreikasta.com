# Firebase Authorized Domains Configuration

## Issue
Admin login fails on mobile because OAuth redirect uses wrong domain (kotikreikasta.firebaseapp.com instead of admin.kotikreikasta.com).

## Root Cause
The `authDomain` in Firebase client configuration must match the actual hosting domain for OAuth redirects to work properly on mobile devices.

## Required Firebase Console Configuration

**Firebase Console → Authentication → Settings → Authorized domains**

Must include:
- `kotikreikasta.com` (public site)
- `admin.kotikreikasta.com` (admin site)
- `kotikreikasta.web.app` (Firebase default hosting)
- `kotikreikasta-admin.web.app` (Firebase admin hosting)
- `kotikreikasta.firebaseapp.com` (Firebase default)
- `localhost` (local development)

## Local Development Configuration

### Admin Site (.env.local)
```
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=admin.kotikreikasta.com
```

### Public Site (.env.local)
```
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kotikreikasta.firebaseapp.com
```

## Production Configuration

In production, Firebase Hosting automatically injects the correct configuration via `/__/firebase/init.json` with the appropriate `authDomain` for each site:
- Public site: Uses `kotikreikasta.firebaseapp.com` or `kotikreikasta.com`
- Admin site: Uses `admin.kotikreikasta.com`

The client library (`admin/lib/firebase-client.ts`) prioritizes:
1. Environment variables (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) - used in local dev
2. Firebase Hosting auto-config (`/__/firebase/init.json`) - used in production
3. Fallback to public site config

## Testing

After deploying:
1. Test admin login on desktop (should work with popup)
2. Test admin login on mobile (should work with redirect)
3. Verify OAuth consent screen shows correct domain
4. Verify successful redirect back to admin.kotikreikasta.com after auth

## References
- GitHub Issue: #1
- Firebase Auth Docs: https://firebase.google.com/docs/auth/web/redirect-best-practices
