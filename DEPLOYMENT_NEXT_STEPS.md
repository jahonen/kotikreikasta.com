# Cloud Tasks Refactor - Deployment Status & Next Steps

## ✅ Completed

### Infrastructure
- ✅ Cloud Tasks queue `social-media-publishing` created in `europe-west1`
  - Max 1 dispatch/second
  - Max 5 concurrent dispatches
  - Max 3 retry attempts
  - Exponential backoff: 60s - 3600s

### Code Changes
- ✅ Added `@google-cloud/tasks` dependency
- ✅ Created `socialMediaSchedulerV2` (runs hourly via Cloud Scheduler)
- ✅ Created `socialMediaPublisher` (unified HTTP function for all platforms)
- ✅ Created deduplication utilities
- ✅ Created Cloud Tasks utilities
- ✅ Built successfully
- ✅ Deployed to Firebase

### Functions Deployed
- ✅ `socialMediaSchedulerV2` - Deployed successfully
- ⚠️ `socialMediaPublisher` - Deployed but needs IAM permissions

## 🔧 Required Manual Steps

### 1. Configure IAM Permissions for socialMediaPublisher

The `socialMediaPublisher` function needs to be callable by Cloud Tasks. Run:

```bash
gcloud functions add-iam-policy-binding socialMediaPublisher \
  --region=europe-west1 \
  --member=serviceAccount:kotikreikasta@appspot.gserviceaccount.com \
  --role=roles/cloudfunctions.invoker \
  --project=kotikreikasta
```

**Note**: Organization policy prevents automatic public access configuration.

### 2. Verify Cloud Scheduler Job

The scheduler should run automatically every hour. Verify it's configured:

```bash
gcloud scheduler jobs describe socialMediaSchedulerV2 \
  --location=europe-west1 \
  --project=kotikreikasta
```

If not found, the Cloud Scheduler job was created automatically by Firebase when deploying the scheduled function.

### 3. Monitor Initial Runs

Check logs to ensure the new system is working:

```bash
# Check scheduler logs
gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=socialMediaSchedulerV2" \
  --limit 50 \
  --project=kotikreikasta

# Check publisher logs
gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=socialMediaPublisher" \
  --limit 50 \
  --project=kotikreikasta

# Check Cloud Tasks queue
gcloud tasks queues describe social-media-publishing \
  --location=europe-west1 \
  --project=kotikreikasta
```

### 4. Verify No Duplicate Posts

Monitor social media platforms for 24-48 hours to ensure:
- ✅ No duplicate posts (same content posted multiple times)
- ✅ Posts respect `minMinutesBetweenPosts` (e.g., 180 minutes for Facebook)
- ✅ Posts respect `maxPostsPerWindow` (e.g., 2 posts per window)
- ✅ Posts appear within configured time windows

### 5. Disable Old Scheduler (After Validation)

Once the new system is validated (24-48 hours), disable the old scheduler:

```bash
# Pause the old scheduler
gcloud scheduler jobs pause socialMediaScheduler \
  --location=europe-west1 \
  --project=kotikreikasta
```

### 6. Remove Old Pub/Sub Publishers (After 7 Days)

After confirming the new system works for 7 days, remove old functions:

```bash
firebase deploy --only functions \
  --except functions:blueskyPublisher,functions:xPublisher,functions:facebookPublisher,functions:threadsPublisher,functions:instagramPublisher
```

## 📊 How It Works

### Old Architecture (Problematic)
```
Cloud Scheduler (every 23 min)
    ↓
socialMediaScheduler
    ↓
Pub/Sub topic
    ↓
5 separate publisher functions
    ↓
❌ Duplicate posts (race conditions)
```

### New Architecture (Fixed)
```
Cloud Scheduler (every hour)
    ↓
socialMediaSchedulerV2
    ↓
Cloud Tasks (deduplication via task names)
    ↓
socialMediaPublisher (single unified function)
    ↓
✅ No duplicates (atomic deduplication)
```

### Deduplication Strategy

**Task Name Format**: `{contentId}-{platform}-{windowStartTimestamp}`

Example: `Jc3W4tQJXDeyiQAZCwk9-facebook-1711699200000`

**How it prevents duplicates**:
1. Same content + platform + window = same task name
2. Cloud Tasks rejects duplicate task names (409 error)
3. Scheduler checks `socialShares` collection for recent posts
4. Publisher checks `socialShares` again (idempotency)
5. Window changes → new task name allowed

### Constraints Enforced

1. **minMinutesBetweenPosts**: Minimum time between ANY posts on a platform
   - Example: Facebook = 180 minutes (3 hours)
   - Checked by scheduler before creating task

2. **maxPostsPerWindow**: Maximum posts per posting window
   - Example: Instagram = 2 posts per window
   - Checked by scheduler before creating task

3. **minDaysBetweenShares**: Minimum days before reposting same content
   - Example: Bluesky = 90 days
   - Content excluded from selection if posted recently

## 🐛 Troubleshooting

### No tasks being created

Check scheduler logs:
```bash
gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=socialMediaSchedulerV2 AND severity>=WARNING" --limit 20 --project=kotikreikasta
```

Common causes:
- Outside posting window
- minMinutesBetweenPosts not met
- maxPostsPerWindow reached
- No unpublished content available

### Tasks created but not executing

Check Cloud Tasks queue:
```bash
gcloud tasks list --queue=social-media-publishing --location=europe-west1 --project=kotikreikasta
```

Common causes:
- IAM permissions not configured (see step 1)
- Publisher function error (check logs)
- Task scheduled for future time (check `scheduleTime`)

### Duplicate posts still occurring

Check:
1. Is old scheduler still running? (Pause it)
2. Are old Pub/Sub publishers still active? (Check logs)
3. Is task name generation deterministic? (Check logs for task names)

## 📈 Success Metrics

After 7 days, verify:
- [ ] Zero duplicate posts across all platforms
- [ ] All posts respect time constraints
- [ ] All posts respect window limits
- [ ] Error rate < 1%
- [ ] Average execution time < 30 seconds
- [ ] No failed tasks in Cloud Tasks queue

## 🔄 Rollback Plan

If issues occur, rollback is simple:

```bash
# Re-enable old scheduler
gcloud scheduler jobs resume socialMediaScheduler \
  --location=europe-west1 \
  --project=kotikreikasta

# Pause new scheduler
gcloud scheduler jobs pause socialMediaSchedulerV2 \
  --location=europe-west1 \
  --project=kotikreikasta
```

No data migration needed - both systems use the same Firestore collections.

## 📝 Files Changed

### New Files
- `CLOUD_TASKS_REFACTOR.md` - Technical plan
- `functions/src/schedulers/social-media-scheduler-v2.ts` - New scheduler
- `functions/src/publishers/social-media-publisher.ts` - Unified publisher
- `functions/src/utils/cloud-tasks.ts` - Cloud Tasks utilities
- `functions/src/utils/deduplication.ts` - Deduplication logic

### Modified Files
- `functions/package.json` - Added @google-cloud/tasks
- `functions/src/index.ts` - Exported new functions

### Files to Remove Later
- `functions/src/schedulers/social-media-scheduler.ts` (after validation)
- `functions/src/consumers/*-pubsub.ts` (after validation)

## 🎯 Expected Behavior

### Scheduler (Runs Every Hour)

For each platform:
1. Check if within posting window ✅
2. Check last post time (minMinutesBetweenPosts) ✅
3. Check window limit (maxPostsPerWindow) ✅
4. Select next unpublished content (excluding recently posted) ✅
5. Create Cloud Task with unique name ✅
6. Log result (task_created, constraints_not_met, no_content, etc.) ✅

### Publisher (Triggered by Cloud Tasks)

1. Receive HTTP request from Cloud Tasks ✅
2. Validate payload ✅
3. Check if already posted (idempotency) ✅
4. Route to platform-specific handler ✅
5. Generate content with Vertex AI ✅
6. Post to platform API ✅
7. Update Firestore (socialMediaStatus + socialShares) ✅
8. Return success/failure ✅

## 📞 Support

If you encounter issues:
1. Check logs (commands above)
2. Review CLOUD_TASKS_REFACTOR.md for detailed architecture
3. Verify IAM permissions are configured
4. Check Cloud Tasks queue status
5. Rollback if needed (see Rollback Plan)
