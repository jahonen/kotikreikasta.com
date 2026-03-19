# Facebook Test Function Setup Instructions

## Overview
The `testFacebookPost` Cloud Function is deployed and ready, but requires Facebook Page credentials to be configured in Google Secret Manager.

## Required Secrets

You need to create **2 secrets** in Google Secret Manager:

### 1. FACEBOOK_PAGE_ID
Your Facebook Page ID (numeric ID of your page)

### 2. FACEBOOK_PAGE_ACCESS_TOKEN
Your Facebook Page Access Token (long-lived token with `pages_manage_posts` permission)

## How to Get Facebook Page Credentials

### Step 1: Get Your Page ID

**Option A: From Page Settings**
1. Go to your Facebook Page
2. Click **Settings** (bottom left)
3. Click **Page Info**
4. Your Page ID is shown there

**Option B: From URL**
1. Go to your Facebook Page
2. Look at the URL: `https://www.facebook.com/YOUR_PAGE_NAME`
3. Or use Graph API Explorer to get numeric ID

**Option C: Using Graph API Explorer**
1. Go to https://developers.facebook.com/tools/explorer/
2. Select your app
3. Query: `me/accounts`
4. Find your page and copy the `id` field

### Step 2: Get Page Access Token

**Using Meta Business Suite:**

1. **Go to Meta Developer Portal**: https://developers.facebook.com/apps/
2. **Select your app** (or create one if needed)
3. **Add Facebook Login** product if not already added
4. **Go to Tools > Graph API Explorer**
5. **Select your app** from dropdown
6. **Click "Generate Access Token"**
7. **Select permissions:**
   - `pages_show_list` (to see your pages)
   - `pages_read_engagement` (to read page data)
   - `pages_manage_posts` (to create posts) ⭐ **REQUIRED**
8. **Click "Generate Access Token"** and authorize
9. **Get Page Token:**
   - Query: `me/accounts`
   - Find your page in results
   - Copy the `access_token` field (this is your Page Access Token)

**Convert to Long-Lived Token (60 days):**

```bash
# Exchange short-lived token for long-lived token
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_LIVED_PAGE_TOKEN"
```

This returns a long-lived Page Access Token (valid for 60 days).

## Create Secrets in Google Secret Manager

```bash
# Create FACEBOOK_PAGE_ID
echo "your-page-id-here" | gcloud secrets create FACEBOOK_PAGE_ID \
  --data-file=- \
  --project=kotikreikasta

# Create FACEBOOK_PAGE_ACCESS_TOKEN
echo "your-page-access-token-here" | gcloud secrets create FACEBOOK_PAGE_ACCESS_TOKEN \
  --data-file=- \
  --project=kotikreikasta
```

## Grant Secret Access to Cloud Functions

```bash
for secret in FACEBOOK_PAGE_ID FACEBOOK_PAGE_ACCESS_TOKEN; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:kotikreikasta@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=kotikreikasta
done
```

## Alternative: Use Existing META Secrets

If you already have `META_ACCESS_TOKEN` that is a Page Access Token, you can create aliases:

```bash
# Copy META_ACCESS_TOKEN to FACEBOOK_PAGE_ACCESS_TOKEN
gcloud secrets versions access latest --secret=META_ACCESS_TOKEN --project=kotikreikasta | \
  gcloud secrets create FACEBOOK_PAGE_ACCESS_TOKEN --data-file=- --project=kotikreikasta

# Create FACEBOOK_PAGE_ID manually
echo "YOUR_PAGE_ID" | gcloud secrets create FACEBOOK_PAGE_ID \
  --data-file=- \
  --project=kotikreikasta
```

## Test the Function

Once secrets are configured:

```bash
curl -X POST https://europe-west1-kotikreikasta.cloudfunctions.net/testFacebookPost \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)"
```

**Expected response:**
```json
{
  "ok": true,
  "message": "Test post successful",
  "postId": "123456789_987654321",
  "text": "Terveisiä Kreikasta! 🇬🇷",
  "url": "https://www.facebook.com/123456789/posts/987654321"
}
```

## Authentication Method

The function uses **Facebook Graph API v18.0**:
- Posts to Facebook Page (not personal profile)
- Uses Page Access Token
- Requires `pages_manage_posts` permission
- Token should be long-lived (60 days)

## Important Notes

- **Page Access Token** is different from User Access Token
- You must be an admin of the Facebook Page
- The post will appear on your Facebook Page's timeline
- Page Access Tokens expire after 60 days (need to refresh)
- For production, consider implementing token refresh logic

## Troubleshooting

### Error: "credentials_fetch_failed"
- Secrets don't exist or service account doesn't have access
- Run the grant access commands above

### Error: "facebook_api_error_190"
- Invalid or expired access token
- Generate a new Page Access Token

### Error: "facebook_api_error_200"
- Missing `pages_manage_posts` permission
- Regenerate token with correct permissions

### Error: "facebook_api_error_100"
- Invalid Page ID
- Verify your Page ID is correct

## Token Expiration

Page Access Tokens expire after 60 days. To extend:

1. **Generate new short-lived token** (steps above)
2. **Exchange for long-lived token** (60 days)
3. **Update secret:**
   ```bash
   echo "new-token-here" | gcloud secrets versions add FACEBOOK_PAGE_ACCESS_TOKEN \
     --data-file=- \
     --project=kotikreikasta
   ```

## Facebook App Setup

Your app needs:
- **App ID** (stored in `META_APP_ID`)
- **App Secret** (stored in `META_APP_SECRET`)
- **Facebook Login** product enabled
- **Valid OAuth Redirect URI:** `https://kotikreikasta.com/oauth/facebook/callback`
- **App Mode:** Live (not Development)

## Character Limits

- **Text posts:** 63,206 characters
- **Recommended:** Keep under 500 characters for better engagement
