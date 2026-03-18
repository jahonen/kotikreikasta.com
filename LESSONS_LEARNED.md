# Lessons Learned: Blog Firestore Connection Issue

## Date
March 18, 2026

## Problem
Blog pages showing "Artikkelia ei löytynyt" (Article not found) in production despite 3 published blog posts existing in Firestore.

## Root Cause
The `hosting/.env.local` file contained:
```
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

This environment variable caused Firebase Admin SDK to attempt connecting to a local emulator (127.0.0.1:8080) instead of production Firestore during deployment builds, resulting in "14 UNAVAILABLE: No connection established" errors.

## Solution
1. Delete `hosting/.env.local`
2. Redeploy

## Time Spent
Approximately 8 hours debugging and trying various architectural changes.

## What We Tried (Unnecessarily)
1. ✗ Switching from build-time SSG to on-demand ISR
2. ✗ Adding explicit Application Default Credentials
3. ✗ Using native `@google-cloud/firestore` client with REST API
4. ✗ Adding gRPC keepalive environment variables
5. ✗ Checking service account permissions
6. ✗ Investigating VPC connector requirements
7. ✗ Creating static markdown export scripts

## What Actually Worked
✓ Removing the `.env.local` file with `FIRESTORE_EMULATOR_HOST`

## Key Takeaways

### 1. Always Check Environment Variables First
When debugging Firestore connection issues, **immediately check for**:
- `FIRESTORE_EMULATOR_HOST`
- `FIREBASE_EMULATOR_SUITE_HOST`
- Any other emulator-related environment variables

### 2. .env.local Files Are Dangerous in Deployments
- `.env.local` files are meant for local development only
- They can be picked up during Firebase deployment builds
- **Never commit `.env.local` to git**
- Add to `.gitignore` if not already there

### 3. Error Messages Can Be Misleading
The "14 UNAVAILABLE: No connection established" error suggested:
- Network/firewall issues
- gRPC connection problems
- Service account permission issues

But the actual cause was much simpler: trying to connect to the wrong host.

### 4. Start Simple, Then Escalate
Debugging checklist for Firestore connection issues:
1. ✓ Check environment variables (especially `FIRESTORE_EMULATOR_HOST`)
2. ✓ Verify service account permissions
3. ✓ Check Cloud Run logs for actual error messages
4. ✓ Test with minimal reproduction case
5. Only then: investigate network, gRPC, or architectural issues

### 5. Benefits of Changes We Made Anyway
While the changes weren't necessary to fix the issue, they do provide value:

**On-demand ISR (vs build-time SSG)**:
- ✓ Doesn't require Firestore access during Cloud Build
- ✓ More flexible for content updates
- ✓ Reduces build time
- ✓ Still provides caching benefits (1 hour revalidation)

**gRPC Keepalive Settings**:
- ✓ May prevent future connection timeout issues
- ✓ Better for long-running connections
- ✓ No downside to having them

**Enhanced Firebase Admin SDK Initialization**:
- ✓ Better logging for debugging
- ✓ Firestore instance caching prevents multiple settings() calls
- ✓ More explicit configuration

## Prevention
1. Add `hosting/.env.local` to `.gitignore` (if not already)
2. Document that `.env.local` should never be used in production
3. Create `.env.local.example` with safe example values
4. Add a pre-deployment check script that fails if `.env.local` exists

## Commands for Future Reference

### Check for emulator environment variables:
```bash
cd hosting
grep -r "EMULATOR" .env* firebase.json .firebaserc
```

### Check Cloud Run environment variables:
```bash
gcloud run services describe ssrkotikreikasta --region=europe-west1 --format=json | jq -r '.spec.template.spec.containers[0].env[] | select(.name | test("FIRESTORE|FIREBASE"; "i")) | "\(.name)=\(.value // "NOT_SET")"'
```

### Check recent Cloud Run logs for errors:
```bash
gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=ssrkotikreikasta AND severity>=ERROR AND timestamp>="'$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)'"' --limit 50 --format json | jq -r '.[] | .textPayload'
```

## Final Status
✅ **RESOLVED**: All 3 blog posts now render correctly in production with full SEO support.
- https://kotikreikasta.com/blog/siesta-kreikassa-mita-suomalaisen-loma-asukkaan-tulee-tietaa
- https://kotikreikasta.com/blog/loma-asunto-kreikasta-vai-espanjasta-rehellinen-vertailu
- https://kotikreikasta.com/blog/loma-asunnon-vuokraaminen-kreikassa-nain-vuokratulot-verotetaan
