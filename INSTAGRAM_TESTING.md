# Instagram Publisher Testing Guide

## Pre-Deployment Tests

Before deploying the Instagram publisher to production, run these tests to verify functionality.

---

## 1. Token Validation Tests

### Test 1: Verify Token is Valid

```bash
# Fetch the token from Secret Manager
TOKEN=$(gcloud secrets versions access latest --secret="INSTAGRAM_ACCESS_TOKEN" --project=kotikreikasta)

# Test token validity
curl -X GET "https://graph.instagram.com/v18.0/me?fields=id,username&access_token=${TOKEN}"
```

**Expected Response:**
```json
{
  "id": "34363451086631741",
  "username": "kotikreikasta"
}
```

**If Error:** Token is invalid or expired - need to refresh manually.

---

### Test 2: Check Token Expiration

```bash
# Get token info
curl -X GET "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=YOUR_APP_SECRET&access_token=${TOKEN}"
```

**Expected Response:**
```json
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

**Note:** `expires_in` is in seconds. Divide by 86400 to get days remaining.

---

### Test 3: Test Token Refresh

```bash
# Refresh the token
curl -X GET "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${TOKEN}"
```

**Expected Response:**
```json
{
  "access_token": "NEW_TOKEN_HERE",
  "token_type": "bearer",
  "expires_in": 5184000
}
```

**Success:** New token returned with 60 days expiration.

---

## 2. Instagram API Publishing Tests

### Test 4: Create Media Container (Dry Run)

```bash
# Test image URL (use a real 1:1 image from Firebase Storage)
IMAGE_URL="https://firebasestorage.googleapis.com/v0/b/kotikreikasta.firebasestorage.app/o/test-image-1-1.jpg?alt=media&token=xxx"

# Test caption
CAPTION="🏝️ Testijulkaisu\n\nTämä on testijulkaisu Instagram-integrointia varten.\n\nLinkki biossa!\n\n#Kreikka #Testi"

# Create container
curl -X POST "https://graph.instagram.com/v18.0/34363451086631741/media" \
  -H "Content-Type: application/json" \
  -d "{
    \"image_url\": \"${IMAGE_URL}\",
    \"caption\": \"${CAPTION}\",
    \"access_token\": \"${TOKEN}\"
  }"
```

**Expected Response:**
```json
{
  "id": "18012345678901234"
}
```

**Success:** Container ID returned. **DO NOT PUBLISH** in test - just verify container creation works.

---

### Test 5: Check Container Status

```bash
# Get container status
CONTAINER_ID="18012345678901234"

curl -X GET "https://graph.instagram.com/v18.0/${CONTAINER_ID}?fields=status_code,status&access_token=${TOKEN}"
```

**Expected Response:**
```json
{
  "status_code": "FINISHED",
  "status": "Container is ready to publish"
}
```

**Note:** Only publish if you want to actually post to Instagram. For testing, stop here.

---

## 3. Cloud Function Tests

### Test 6: Test Content Generation for Instagram

```bash
# Deploy test function first
cd functions
npm run build

# Test content generation (requires SOCIAL_MEDIA_LLM_GUIDE secret)
curl -X POST "https://europe-west1-kotikreikasta.cloudfunctions.net/testContentGeneration" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "instagram",
    "content": {
      "type": "blog",
      "title": "5 syytä hankkia loma-asunto Kreikasta",
      "description": "Kreikka tarjoaa ainutlaatuisen yhdistelmän kulttuuria, luontoa ja rentoa elämäntapaa.",
      "url": "https://kotikreikasta.com/blog/test",
      "metadata": {
        "location": "Kreikka"
      }
    }
  }'
```

**Expected Response:**
```json
{
  "text": "📖 5 syytä hankkia loma-asunto Kreikasta\n\nKreikka tarjoaa ainutlaatuisen yhdistelmän kulttuuria, luontoa ja rentoa elämäntapaa...\n\nLue lisää biosta!\n\n#Kreikka",
  "characterCount": 150,
  "platform": "instagram"
}
```

**Verify:**
- ✅ 1-3 hashtags only
- ✅ "Linkki biossa" or "Lue lisää biosta" CTA
- ✅ No URL in text
- ✅ Emoji at start (optional)
- ✅ Under 2200 characters

---

### Test 7: Test Image Auto-Crop

Create a test function to verify auto-crop generation:

```typescript
// functions/src/test-auto-crop.ts
import * as functions from 'firebase-functions/v1';
import { ensureSquareCrop } from './utils/image-auto-crop';

export const testAutoCrop = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    try {
      const { contentCollection, contentId } = req.body;
      
      // Fetch document from Firestore
      const admin = require('firebase-admin');
      const db = admin.firestore();
      const doc = await db.collection(contentCollection).doc(contentId).get();
      
      if (!doc.exists) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      const data = doc.data();
      const featuredImage = data.featuredImage;
      
      // Test auto-crop
      const imageUrl = await ensureSquareCrop(
        featuredImage,
        contentCollection,
        contentId
      );
      
      res.json({
        success: true,
        imageUrl,
        message: 'Auto-crop generated successfully'
      });
      
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
        stack: error.stack
      });
    }
  });
```

**Test:**
```bash
curl -X POST "https://europe-west1-kotikreikasta.cloudfunctions.net/testAutoCrop" \
  -H "Content-Type: application/json" \
  -d '{
    "contentCollection": "blog_posts",
    "contentId": "test-blog-post-id"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "imageUrl": "https://firebasestorage.googleapis.com/.../1-1-og.jpg?alt=media&token=xxx",
  "message": "Auto-crop generated successfully"
}
```

---

### Test 8: Test Token Refresh Function

```bash
# Trigger token refresh manually
curl -X GET "https://europe-west1-kotikreikasta.cloudfunctions.net/refreshInstagramToken"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "expiresIn": 5184000,
  "expiresInDays": 60,
  "duration": 1234
}
```

**Verify:**
- ✅ Email sent to cto@kotikreikasta.com
- ✅ Secret Manager updated with new token
- ✅ Logs show successful refresh

---

## 4. Integration Tests

### Test 9: End-to-End Publishing Test

**Prerequisites:**
1. Create a test blog post or listing in Firestore
2. Ensure it has a featured image
3. Queue it for Instagram publishing

**Steps:**

1. **Create test content:**
```bash
# Use Firebase Console or admin panel to create test content
# Ensure socialMediaStatus.instagram.queued = true
```

2. **Trigger scheduler manually:**
```bash
curl -X GET "https://europe-west1-kotikreikasta.cloudfunctions.net/socialMediaScheduler"
```

3. **Check logs:**
```bash
gcloud functions logs read socialMediaScheduler \
  --region=europe-west1 \
  --limit=50 \
  --project=kotikreikasta
```

4. **Verify in Firestore:**
- Check `socialMediaStatus.instagram.published = true`
- Check `socialMediaStatus.instagram.postId` exists
- Check `socialShares` subcollection has Instagram entry

5. **Verify on Instagram:**
- Go to Instagram profile
- Check if post appears
- Verify image is 1:1 square
- Verify caption has 1-3 hashtags
- Verify "Linkki biossa" CTA present

---

## 5. Error Handling Tests

### Test 10: Invalid Token

```bash
# Test with invalid token
curl -X GET "https://graph.instagram.com/v18.0/me?fields=id,username&access_token=INVALID_TOKEN"
```

**Expected:** Error response with status 400 or 401.

---

### Test 11: Missing Image

Test what happens when content has no featured image:

```bash
# Create content without featuredImage
# Trigger publisher
# Expected: Error logged, share tracked as failed
```

---

### Test 12: Image Not 1:1

Test auto-crop generation when only 16:9 crop exists:

```bash
# Create content with only 16:9 crop
# Trigger publisher
# Expected: Auto-crop generated, post succeeds
```

---

## 6. Schedule Window Tests

### Test 13: Outside Posting Window

```bash
# Modify INSTAGRAM_SCHEDULE to have no window for current day/time
# Trigger scheduler
# Expected: "Outside posting window, skipping" log message
```

---

### Test 14: Window Limit Enforcement

```bash
# Set maxPostsPerWindow = 1 in INSTAGRAM_SCHEDULE
# Publish one post successfully
# Try to publish another in same window
# Expected: "Window post limit reached, skipping" log message
```

---

## 7. Performance Tests

### Test 15: Image Processing Time

```bash
# Measure time to generate 1:1 crop from large image
# Expected: < 10 seconds for typical images
```

---

### Test 16: End-to-End Latency

```bash
# Measure total time from scheduler trigger to Instagram post
# Expected: < 60 seconds (within 180s timeout)
```

---

## Quick Test Checklist

Before deploying to production, verify:

- [ ] Token is valid (Test 1)
- [ ] Token expiration is > 7 days (Test 2)
- [ ] Token refresh works (Test 3)
- [ ] Media container creation works (Test 4)
- [ ] Content generation produces correct format (Test 6)
- [ ] Auto-crop generates 1:1 images (Test 7)
- [ ] Token refresh sends email (Test 8)
- [ ] Functions build without errors (`npm run build`)
- [ ] TypeScript compilation passes
- [ ] All secrets exist in Secret Manager:
  - INSTAGRAM_ACCESS_TOKEN
  - INSTAGRAM_APP_ID
  - INSTAGRAM_APP_SECRET
  - INSTAGRAM_SCHEDULE
  - SENDGRID_API_KEY
  - SOCIAL_MEDIA_LLM_GUIDE

---

## Troubleshooting

### Token Issues

**Problem:** Token invalid or expired
**Solution:** 
1. Go to Facebook Graph API Explorer
2. Generate new User Access Token
3. Refresh to long-lived token
4. Update INSTAGRAM_ACCESS_TOKEN secret

### Image Issues

**Problem:** Auto-crop fails
**Solution:**
1. Check original image URL is accessible
2. Verify Firebase Storage permissions
3. Check Sharp library is installed
4. Review error logs for details

### Publishing Issues

**Problem:** Container creation fails
**Solution:**
1. Verify image is publicly accessible
2. Check image is valid format (JPEG/PNG)
3. Verify caption is under 2200 characters
4. Check token has `instagram_business_content_publish` permission

### Email Issues

**Problem:** Token refresh email not sent
**Solution:**
1. Verify SENDGRID_API_KEY secret exists
2. Check SendGrid account is active
3. Verify sender email is verified in SendGrid
4. Review function logs for email errors

---

## Production Deployment Checklist

After all tests pass:

1. [ ] Review and merge `feat/instagram_publisher` to `main`
2. [ ] Deploy Cloud Functions: `firebase deploy --only functions`
3. [ ] Verify all functions deployed successfully
4. [ ] Test token refresh in production
5. [ ] Queue test content for Instagram
6. [ ] Monitor first few posts
7. [ ] Set up Cloud Scheduler for daily token refresh check
8. [ ] Document any production-specific configuration
9. [ ] Update team on new Instagram publishing capability
10. [ ] Monitor email notifications for token refresh

---

## Monitoring

### Key Metrics to Watch

1. **Publishing success rate** - Should be > 95%
2. **Token refresh success** - Should be 100%
3. **Auto-crop generation rate** - Track how often it's needed
4. **Average latency** - Should be < 60 seconds
5. **Error rate** - Should be < 5%

### Logs to Monitor

```bash
# Instagram publisher logs
gcloud functions logs read instagramPublisher --region=europe-west1 --limit=100

# Token refresh logs
gcloud functions logs read refreshInstagramToken --region=europe-west1 --limit=50

# Scheduler logs
gcloud functions logs read socialMediaScheduler --region=europe-west1 --limit=50
```

### Alerts to Set Up

1. Token refresh failures (email already configured)
2. Publishing failures > 3 in 1 hour
3. Auto-crop generation failures
4. Token expiration < 7 days (already handled by daily check)
