# Instagram Publisher Deployment Summary

**Date**: March 26, 2026  
**Branch**: `feat/instagram_publisher`  
**Status**: ✅ **Deployed to Production**

---

## Deployment Details

### Cloud Functions Deployed

1. **`instagramPublisher`** (europe-west1)
   - **Type**: Pub/Sub-triggered
   - **Topic**: `social-media-publishing`
   - **Runtime**: Node.js 22 (1st Gen)
   - **Memory**: 512MB
   - **Timeout**: 180 seconds
   - **Status**: ✅ Active

2. **`refreshInstagramToken`** (europe-west1)
   - **Type**: Scheduled (Pub/Sub)
   - **Schedule**: Daily at 2:00 AM Helsinki time
   - **Runtime**: Node.js 22 (1st Gen)
   - **Memory**: 256MB
   - **Timeout**: 120 seconds
   - **Status**: ✅ Active

---

## Pre-Deployment Testing

### Token Validation ✅
```bash
curl "https://graph.instagram.com/v18.0/me?fields=id,username&access_token=${TOKEN}"
```
**Result**: `{"id":"34363451086631741","username":"kotikreikasta"}`

**Status**: Token is valid and working with Instagram Graph API

---

## Implementation Summary

### Core Components Created

1. **`instagram-pubsub.ts`** - Main publisher
   - Two-step Instagram Graph API publishing
   - Automatic 1:1 image crop generation
   - Window limit enforcement (maxPostsPerWindow=1)
   - Full error handling and Firestore tracking

2. **`instagram-token-refresh.ts`** - Token management
   - Scheduled daily at 2 AM Helsinki time
   - SendGrid email notifications (success/failure)
   - Automatic Secret Manager updates

3. **`image-auto-crop.ts`** - Image processing
   - Generates 1:1 crops from original images
   - Uses Sharp for center-square extraction
   - Saves to Firebase Storage with download tokens

### Updated Components

4. **`social-media-utils.ts`**
   - Added `instagram` to `SocialPlatform` type
   - Added Instagram character limit (2200)

5. **`vertex-ai-content.ts`**
   - Instagram-specific prompts
   - 1-3 hashtag limit enforcement
   - "Linkki biossa" CTA requirement

6. **`social-media-scheduler.ts`**
   - Added Instagram to platforms array
   - Integrated Instagram publisher

7. **`index.ts`**
   - Exported `instagramPublisher`
   - Exported `refreshInstagramToken`

---

## Features Implemented

### Content Generation
- ✅ Finnish-focused content targeting affluent, middle-aged audience
- ✅ 1-3 hashtags maximum per post
- ✅ "Linkki biossa" CTA instead of URL
- ✅ Emoji support (🏝️ ☀️ 🏡 📖)
- ✅ 2200 character limit enforcement

### Image Handling
- ✅ 1:1 (square) aspect ratio required
- ✅ Auto-crop generation if 1:1 doesn't exist
- ✅ Center-square extraction from original
- ✅ EXIF rotation correction
- ✅ Firebase Storage integration

### Publishing Flow
- ✅ Two-step Instagram Graph API (create container → publish)
- ✅ Schedule window enforcement
- ✅ One post per window limit
- ✅ Firestore tracking (socialShares subcollection)
- ✅ socialMediaStatus updates

### Token Management
- ✅ Daily expiration checks (2 AM Helsinki time)
- ✅ Automatic token refresh
- ✅ Email notifications via SendGrid
- ✅ Secret Manager integration

---

## Configuration

### Google Secrets (Already Configured)
- ✅ `INSTAGRAM_ACCESS_TOKEN` - User access token
- ✅ `INSTAGRAM_APP_ID` - App ID: 1279297020790292
- ✅ `INSTAGRAM_APP_SECRET` - App secret
- ✅ `INSTAGRAM_SCHEDULE` - Posting schedule configuration
- ✅ `SENDGRID_API_KEY` - Email notifications
- ✅ `SOCIAL_MEDIA_LLM_GUIDE` - Content generation prompts

### Instagram Access Token Info
- **Type**: User token
- **App-Scoped User ID**: 34363451086631741
- **Username**: kotikreikasta
- **Scopes**: 
  - instagram_business_basic
  - instagram_business_manage_messages
  - instagram_business_content_publish
  - instagram_business_manage_insights
  - instagram_business_manage_comments

---

## Integration with Existing Systems

### Social Media Scheduler
The Instagram publisher is now integrated with the existing social media scheduler:
- Runs every 83 minutes via HTTP trigger
- Checks Instagram schedule from Secret Manager
- Fetches unpublished content (1 item per run)
- Calls Instagram publisher directly

### Firestore Schema
Instagram shares are tracked identically to other platforms:

```typescript
{
  socialMediaStatus: {
    instagram: {
      queued: boolean,
      queuedAt: Timestamp,
      published: boolean,
      publishedAt: Timestamp,
      postId: string,
      postUrl: string
    }
  },
  socialShareStats: {
    sharesByPlatform: {
      instagram: {
        count: number,
        lastSharedAt: Timestamp,
        lastPostId: string
      }
    }
  }
}
```

**Subcollection**: `socialShares/{shareId}`
- Platform: 'instagram'
- Success/failure tracking
- Post ID and URL
- Character count
- Error details (if failed)

---

## Testing Resources

### Documentation
- **`INSTAGRAM_TESTING.md`** - 16 comprehensive test scenarios
- **`INSTAGRAM_PUBLISHER_PLAN.md`** - Complete implementation plan

### Test Script
- **`test-instagram-token.sh`** - Interactive curl testing
  ```bash
  ./test-instagram-token.sh
  ```

---

## Next Steps

### 1. Monitor Initial Posts
```bash
# Watch Instagram publisher logs
gcloud functions logs read instagramPublisher \
  --region=europe-west1 \
  --limit=50 \
  --project=kotikreikasta

# Watch token refresh logs
gcloud functions logs read refreshInstagramToken \
  --region=europe-west1 \
  --limit=20 \
  --project=kotikreikasta
```

### 2. Queue Test Content
1. Create or select a blog post or listing in Firestore
2. Set `socialMediaStatus.instagram.queued = true`
3. Wait for next scheduler run (every 83 minutes)
4. Verify post appears on Instagram

### 3. Verify Token Refresh
- First automatic refresh: Tomorrow at 2:00 AM Helsinki time
- Check email at `cto@kotikreikasta.com` for notification
- Verify Secret Manager was updated

### 4. Schedule Configuration
Update `INSTAGRAM_SCHEDULE` secret as needed:
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

---

## Monitoring & Alerts

### Key Metrics to Watch
1. **Publishing success rate** - Should be > 95%
2. **Token refresh success** - Should be 100%
3. **Auto-crop generation rate** - Track how often it's needed
4. **Average latency** - Should be < 60 seconds
5. **Error rate** - Should be < 5%

### Email Notifications
- ✅ Token refresh success/failure (daily at 2 AM)
- Recipient: `cto@kotikreikasta.com`

### Log Queries
```bash
# Recent Instagram posts
gcloud functions logs read instagramPublisher \
  --region=europe-west1 \
  --filter="severity>=INFO" \
  --limit=20

# Token refresh history
gcloud functions logs read refreshInstagramToken \
  --region=europe-west1 \
  --filter="severity>=INFO" \
  --limit=10

# Errors only
gcloud functions logs read instagramPublisher \
  --region=europe-west1 \
  --filter="severity>=ERROR" \
  --limit=50
```

---

## Troubleshooting

### Common Issues

**Problem**: Posts not appearing on Instagram  
**Solution**: 
1. Check logs for errors
2. Verify token is valid
3. Check image is 1:1 and accessible
4. Verify schedule window is active

**Problem**: Token expired  
**Solution**:
1. Check email for refresh failure notification
2. Manually refresh token using test script
3. Update `INSTAGRAM_ACCESS_TOKEN` secret

**Problem**: Auto-crop fails  
**Solution**:
1. Verify original image is accessible
2. Check Firebase Storage permissions
3. Review error logs for Sharp library issues

**Problem**: Email notifications not received  
**Solution**:
1. Verify `SENDGRID_API_KEY` secret exists
2. Check SendGrid account status
3. Verify sender email is verified in SendGrid

---

## Production Checklist

- [x] Cloud Functions deployed successfully
- [x] Token validated with Instagram API
- [x] Secrets configured in Secret Manager
- [x] Integration with social media scheduler complete
- [x] Firestore schema supports Instagram tracking
- [x] Email notifications configured
- [x] Testing documentation created
- [x] Deployment documentation created
- [x] Azure blue border feature implemented and deployed
- [x] Auto-publishing triggers updated to include Instagram
- [x] 9 existing blog posts queued for Instagram
- [x] Migration script created and executed
- [x] Token has full access to insights and messages
- [ ] First test post published successfully (awaiting scheduler)
- [ ] Token refresh verified (tomorrow at 2 AM)
- [ ] Schedule configuration optimized
- [ ] Monitoring dashboard set up (optional)

---

## Support & Documentation

- **Implementation Plan**: `INSTAGRAM_PUBLISHER_PLAN.md`
- **Testing Guide**: `INSTAGRAM_TESTING.md`
- **Test Script**: `test-instagram-token.sh`
- **Deployment Summary**: This document

For issues or questions, review logs and documentation first, then consult the implementation plan for detailed architecture information.

---

**Deployment completed successfully on March 26, 2026** ✅
