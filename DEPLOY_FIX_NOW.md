# URGENT: Deploy Blog Fix

## Current Problem
- Blog pages showing "Artikkelia ei löytynyt" (no posts found)
- Blog listing page takes ~1 minute to load, finds 0 posts
- 3 published blog posts exist in Firestore but aren't being displayed

## Root Cause
The Firebase Admin SDK in Cloud Run is failing to connect to Firestore with gRPC errors.
The current deployment (revision 00014) has old code that doesn't work.

## Changes Made (Ready to Deploy)

### 1. `hosting/lib/firebase-admin-server.ts`
- Added explicit `admin.credential.applicationDefault()` for proper Cloud Run auth
- Cached Firestore instance to prevent multiple settings() calls

### 2. `hosting/app/blog/[slug]/page.tsx`
- Removed `generateStaticParams()` (build-time generation fails in Cloud Build)
- Added `export const dynamicParams = true` for on-demand generation
- Kept `export const revalidate = 3600` for ISR caching

### 3. `hosting/app/blog/page.tsx`
- Added `export const revalidate = 3600` for ISR

## Manual Deployment Steps

```bash
cd /Users/jukkisahonen/Repos/kotikreikasta.com

# 1. Commit the latest changes
git add -A
git commit -m "fix: Add explicit ADC and enable dynamic params for ISR"
git push origin main

# 2. Clean build artifacts
rm -rf .next .firebase hosting/.next hosting/node_modules/.cache

# 3. Deploy hosting
cd hosting
firebase deploy --only hosting:kotikreikasta

# Wait for deployment to complete (~5-10 minutes)
```

## Verification Steps

After deployment completes:

```bash
# 1. Get the latest revision name
gcloud run services describe ssrkotikreikasta --region=europe-west1 --format='value(status.latestReadyRevisionName)'

# 2. Wait 30 seconds for the new revision to be fully active
sleep 30

# 3. Test the blog listing page
curl -s https://kotikreikasta.com/blog/ | grep -o "<h1[^>]*>.*</h1>" | head -5

# 4. Test a specific blog post
curl -s https://kotikreikasta.com/blog/siesta-kreikassa-mita-suomalaisen-loma-asukkaan-tulee-tietaa | grep -o "<h1[^>]*>.*</h1>"

# 5. Check for errors in logs (should be ZERO)
gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=ssrkotikreikasta AND timestamp>="'$(date -u -v-5M +%Y-%m-%dT%H:%M:%SZ)'"' --limit 100 --format json | jq -r '[.[] | select(.textPayload // "" | test("Error|error|14 UNAVAILABLE"; "i"))] | length'

# 6. Verify blog posts are visible on homepage
curl -s https://kotikreikasta.com/ | grep -i "blog" | head -10
```

## Expected Results

### After First Request to Each Blog Post:
- Blog post page loads successfully with content
- Page is cached for 1 hour
- Subsequent requests are instant (served from cache)
- After 1 hour, page is revalidated on next request

### Logs Should Show:
```
[FIREBASE_ADMIN_SERVER] Admin SDK initialized for project: kotikreikasta
[FIREBASE_ADMIN_SERVER] Firestore instance retrieved from Admin SDK
```

### Should NOT Show:
```
Error: 14 UNAVAILABLE: No connection established
Error: The default Firebase app does not exist
```

## If Still Not Working

Check Cloud Run service account permissions:
```bash
# Get the service account
gcloud run services describe ssrkotikreikasta --region=europe-west1 --format='value(spec.template.spec.serviceAccountName)'

# Grant Firestore permissions (if needed)
gcloud projects add-iam-policy-binding kotikreikasta \
  --member="serviceAccount:[SERVICE_ACCOUNT_EMAIL]" \
  --role="roles/datastore.user"
```

## Architecture Summary

**How It Works Now:**
1. User requests `/blog/siesta-kreikassa...`
2. Cloud Run executes page component (first time only)
3. Firebase Admin SDK connects to Firestore using ADC
4. Fetches blog post data
5. Renders HTML
6. Caches result for 1 hour
7. Subsequent requests served from cache instantly

**No More:**
- ❌ Build-time Firestore queries (Cloud Build has no access)
- ❌ Runtime failures on every request
- ❌ gRPC connection errors (fixed with proper credentials)

**Benefits:**
- ✅ First request generates and caches page
- ✅ Cached pages served instantly
- ✅ Automatic hourly revalidation
- ✅ Works with Firebase deployment constraints
- ✅ Proper authentication in Cloud Run
