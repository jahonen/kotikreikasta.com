# Social Media Dissemination - Deployment Guide

## Overview

This guide covers deploying the social media content dissemination pipeline for Kotikreikasta.com.

**MVP Platform:** Bluesky  
**Status:** Alpha  
**Branch:** `feat/content-marketing`

---

## Prerequisites

### 1. Google Secret Manager Secrets

Ensure the following secrets exist and are populated:

#### Bluesky Credentials
- `BSKY_IDENTIFIER` - Your Bluesky handle/identifier
- `BSKY_APP_PASSWORD` - Bluesky app-specific password

#### Bluesky Schedule
- `BSKY_SCHEDULE` - JSON configuration (see `samplecode/schedule_template_bluesky.json`)

#### X (Twitter) - For V2
- `X_BEARER_TOKEN`
- `X_CONSUMER_KEY`
- `X_SECRET_KEY`
- `X_SCHEDULE`

### 2. Verify Secrets

```bash
# List all secrets
gcloud secrets list --project=kotikreikasta

# View a specific secret (latest version)
gcloud secrets versions access latest --secret=BSKY_IDENTIFIER --project=kotikreikasta
```

### 3. Upload Schedule to Secret Manager

```bash
# Upload Bluesky schedule
gcloud secrets create BSKY_SCHEDULE \
  --data-file=samplecode/schedule_template_bluesky.json \
  --project=kotikreikasta

# Or update existing secret
gcloud secrets versions add BSKY_SCHEDULE \
  --data-file=samplecode/schedule_template_bluesky.json \
  --project=kotikreikasta
```

---

## Deployment Steps

### Step 1: Deploy Cloud Functions

```bash
cd functions

# Build TypeScript
npm run build

# Deploy all functions (includes publishToBluesky)
firebase deploy --only functions --project=kotikreikasta
```

**Expected output:**
```
✔  functions[publishToBluesky(europe-west1)] Successful update operation.
Function URL: https://europe-west1-kotikreikasta.cloudfunctions.net/publishToBluesky
```

### Step 2: Configure Public Access (Manual)

⚠️ **Important:** Due to organization policies, you must manually configure IAM permissions.

```bash
# This command will FAIL due to org policy - you must use Cloud Console
# gcloud functions add-iam-policy-binding publishToBluesky \
#   --region=europe-west1 \
#   --member=allUsers \
#   --role=roles/cloudfunctions.invoker

# Instead, go to Cloud Console:
# 1. Navigate to Cloud Functions
# 2. Select publishToBluesky
# 3. Go to Permissions tab
# 4. Add principal: allUsers
# 5. Role: Cloud Functions Invoker
```

Or configure Cloud Scheduler to use a service account instead of public access.

### Step 3: Deploy Cloud Scheduler Jobs

```bash
# From repo root
./deploy-scheduler-bluesky.sh
```

This creates 9 scheduler jobs for Bluesky (8 posts per week):
- Tuesday 7:00 AM EEST
- Wednesday 7:15 AM EEST
- Thursday 3:30 PM EEST
- Friday 7:00 AM EEST (primary)
- Friday 2:00 PM EEST (secondary)
- Saturday 9:00 AM EEST (primary)
- Saturday 7:30 PM EEST (secondary)
- Sunday 9:30 AM EEST (primary)
- Sunday 3:00 PM EEST (secondary)

### Step 4: Verify Deployment

```bash
# List scheduler jobs
gcloud scheduler jobs list --location=europe-west1 --project=kotikreikasta

# Manually trigger a test
gcloud scheduler jobs run bluesky-tuesday-primary \
  --location=europe-west1 \
  --project=kotikreikasta

# Check Cloud Function logs
gcloud functions logs read publishToBluesky \
  --region=europe-west1 \
  --limit=50 \
  --project=kotikreikasta
```

---

## Testing

### Manual Test

1. **Publish a blog post** in admin UI
2. **Check publication_queue** in Firestore
   - Should have `contentType: 'blog_post'`
   - Should have `publishAfter` timestamp (12-24 hours from now)
   - Should have `platforms: ['bluesky', 'x']`
   - Should have `status: 'pending'`

3. **Manually trigger the function** (for immediate testing):
   ```bash
   curl -X POST https://europe-west1-kotikreikasta.cloudfunctions.net/publishToBluesky
   ```

4. **Check Bluesky** for the post
5. **Check Firestore** for updated tracking:
   - `blog_posts/{id}.socialSharing.platforms.bluesky.shareCount` should increment
   - `blog_posts/{id}.socialSharing.platforms.bluesky.lastShared` should update
   - `publication_queue/{id}.status` should be `'published'`

### Automated Testing

Wait for next scheduled window and verify:
- Cloud Scheduler triggers the function
- Function queries queue correctly
- Post appears on Bluesky
- Tracking is updated

---

## Monitoring

### Cloud Logging

```bash
# View all Bluesky consumer logs
gcloud logging read 'resource.type=cloud_function AND resource.labels.function_name=publishToBluesky' \
  --limit=100 \
  --format=json \
  --project=kotikreikasta

# View scheduler job executions
gcloud logging read 'resource.type=cloud_scheduler_job' \
  --limit=50 \
  --format=json \
  --project=kotikreikasta
```

### Key Metrics to Monitor

1. **Queue depth** - Number of pending items
2. **Posting success rate** - Published vs failed
3. **Evergreen ratio** - New content vs re-shared
4. **Platform share counts** - Per content item
5. **Scheduler execution rate** - Jobs running on time

### Firestore Queries

```javascript
// Check pending queue items
db.collection('publication_queue')
  .where('status', '==', 'pending')
  .where('platforms', 'array-contains', 'bluesky')
  .get()

// Check failed items
db.collection('publication_queue')
  .where('status', '==', 'failed')
  .get()

// Check content share counts
db.collection('blog_posts')
  .where('socialSharing.platforms.bluesky.shareCount', '>', 0)
  .get()
```

---

## Troubleshooting

### Issue: Function not triggered by scheduler

**Check:**
1. Scheduler job exists: `gcloud scheduler jobs list --location=europe-west1`
2. Job is enabled (not paused)
3. Function URL is correct in scheduler job
4. IAM permissions allow scheduler to invoke function

**Fix:**
```bash
# Update scheduler job with correct URL
gcloud scheduler jobs update http bluesky-tuesday-primary \
  --location=europe-west1 \
  --uri=https://europe-west1-kotikreikasta.cloudfunctions.net/publishToBluesky
```

### Issue: "schedule_fetch_failed" error

**Cause:** BSKY_SCHEDULE secret not found or invalid JSON

**Fix:**
```bash
# Verify secret exists
gcloud secrets describe BSKY_SCHEDULE --project=kotikreikasta

# Re-upload schedule
gcloud secrets versions add BSKY_SCHEDULE \
  --data-file=samplecode/schedule_template_bluesky.json
```

### Issue: "credentials_fetch_failed" error

**Cause:** BSKY_IDENTIFIER or BSKY_APP_PASSWORD missing

**Fix:**
```bash
# Verify secrets exist
gcloud secrets describe BSKY_IDENTIFIER --project=kotikreikasta
gcloud secrets describe BSKY_APP_PASSWORD --project=kotikreikasta

# Add if missing
echo "your-handle.bsky.social" | gcloud secrets create BSKY_IDENTIFIER --data-file=-
echo "your-app-password" | gcloud secrets create BSKY_APP_PASSWORD --data-file=-
```

### Issue: "bluesky_api_error_401" - Authentication failed

**Cause:** Invalid Bluesky credentials

**Fix:**
1. Generate new app password at https://bsky.app/settings/app-passwords
2. Update secret:
   ```bash
   echo "new-app-password" | gcloud secrets versions add BSKY_APP_PASSWORD --data-file=-
   ```

### Issue: No content posted (queue empty)

**Expected behavior** - Function logs "No content available to post"

**Check:**
1. Are there items in `publication_queue` with `status: 'pending'`?
2. Is `publishAfter` timestamp in the past?
3. Are `platforms` array containing 'bluesky'?

**Fix:** Publish a blog post or wait for delay period to expire.

### Issue: Evergreen content not posting

**Check:**
1. Is `evergreenRules.enabled: true` in BSKY_SCHEDULE?
2. Are there published blog posts older than `minContentAge` days?
3. Have they been shared less than `maxSharesPerContent` times?
4. Has it been more than `minDaysBetweenShares` days since last share?

**Fix:** Adjust evergreen rules in schedule JSON or publish more content.

---

## Updating Configuration

### Update Posting Schedule

1. Edit `samplecode/schedule_template_bluesky.json`
2. Upload to Secret Manager:
   ```bash
   gcloud secrets versions add BSKY_SCHEDULE \
     --data-file=samplecode/schedule_template_bluesky.json
   ```
3. Update Cloud Scheduler jobs:
   ```bash
   ./deploy-scheduler-bluesky.sh
   ```

### Update Delay Settings

Edit schedule JSON `publishDelay` section:
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
    }
  }
}
```

Upload updated schedule to Secret Manager.

### Update Evergreen Rules

Edit schedule JSON `evergreenRules` section:
```json
{
  "evergreenRules": {
    "minDaysBetweenShares": 90,
    "maxSharesPerContent": 5,
    "prioritizeNew": true,
    "minContentAge": 30,
    "enabled": true
  }
}
```

Upload updated schedule to Secret Manager.

---

## Rollback Procedure

### Disable Scheduler Jobs

```bash
# Pause all Bluesky jobs
for job in bluesky-tuesday-primary bluesky-wednesday-primary bluesky-thursday-primary \
           bluesky-friday-primary bluesky-friday-secondary bluesky-saturday-primary \
           bluesky-saturday-secondary bluesky-sunday-primary bluesky-sunday-secondary; do
  gcloud scheduler jobs pause $job --location=europe-west1 --project=kotikreikasta
done
```

### Revert Cloud Function

```bash
# Deploy previous version
git checkout main
cd functions
npm run build
firebase deploy --only functions:publishToBluesky --project=kotikreikasta
```

### Re-enable Scheduler Jobs

```bash
# Resume all Bluesky jobs
for job in bluesky-tuesday-primary bluesky-wednesday-primary bluesky-thursday-primary \
           bluesky-friday-primary bluesky-friday-secondary bluesky-saturday-primary \
           bluesky-saturday-secondary bluesky-sunday-primary bluesky-sunday-secondary; do
  gcloud scheduler jobs resume $job --location=europe-west1 --project=kotikreikasta
done
```

---

## Next Steps (V2)

1. **X (Twitter) Consumer**
   - Similar implementation to Bluesky
   - 280 character limit
   - OAuth 2.0 authentication
   - 10 posts per week

2. **Facebook Consumer**
   - Graph API integration
   - Longer content format
   - 7 posts per week

3. **Threads Consumer**
   - Instagram Graph API
   - 500 character limit
   - Conversational tone

4. **Email Newsletter**
   - Weekly digest format
   - SendGrid template integration
   - Aggregation logic (2-5 items per digest)

5. **Admin Dashboard**
   - View upcoming scheduled posts
   - Manual post triggering
   - Analytics and metrics
   - Failed post management

---

## Support

For issues or questions:
1. Check Cloud Function logs
2. Check Cloud Scheduler logs
3. Verify Firestore data structure
4. Review this deployment guide
5. Check implementation plan: `CONTENT_MARKETING_IMPLEMENTATION_PLAN.md`
