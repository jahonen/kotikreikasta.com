# Threads Test Function Setup Instructions

## Overview
The `testThreadsPost` Cloud Function is deployed and working. It posts test messages to Threads using the Threads API.

## Required Secrets

You need **2 secrets** in Google Secret Manager:

### 1. THREADS_USER_ID
Your Threads user ID (numeric ID)

**Current value:** `26734590522814214`

### 2. THREADS_ACCESS_TOKEN
Your Threads long-lived access token (60 days)

**Current status:** ✅ Configured with long-lived token

## How to Get Threads Credentials

### Prerequisites
- Meta app must be in **Live mode** (not Development)
- Your Threads/Instagram account must be a Business or Creator account
- App must have Threads API access enabled

### Step 1: Generate Short-Lived Access Token

1. **Go to Graph API Explorer**: https://developers.facebook.com/tools/explorer/
2. **Select your Threads app** from dropdown
3. **Click "Generate Access Token"**
4. **Select these permissions:**
   - ✅ `threads_basic` (required)
   - ✅ `threads_content_publish` (required for posting)
   - ✅ `threads_manage_insights` (optional, for analytics)
   - ✅ `threads_manage_replies` (optional, for managing comments)
   - ✅ `threads_read_replies` (optional, for reading comments)
5. **Click "Generate Access Token"** and authorize
6. **Copy the token** (valid for ~1 hour)

### Step 2: Get Your Threads User ID

In Graph API Explorer, with your short-lived token:
- **Query:** `me?fields=id,username`
- **Click Submit**
- **Copy the `id`** field (this is your Threads User ID)

### Step 3: Exchange for Long-Lived Token (60 days)

```bash
# Get your app secret
APP_SECRET=$(gcloud secrets versions access latest --secret=THREADS_APP_SECRET --project=kotikreikasta)

# Get your short-lived token (paste it here)
SHORT_TOKEN="paste_your_short_lived_token_here"

# Exchange for long-lived token
curl -X GET "https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=$APP_SECRET&access_token=$SHORT_TOKEN"
```

This returns:
```json
{
  "access_token": "THQA...",
  "token_type": "bearer",
  "expires_in": 5183999
}
```

The `expires_in` value is in seconds (~60 days).

## Update Secrets in Google Secret Manager

```bash
# Update THREADS_USER_ID (if changed)
echo "YOUR_USER_ID" | gcloud secrets versions add THREADS_USER_ID \
  --data-file=- \
  --project=kotikreikasta

# Update THREADS_ACCESS_TOKEN (with long-lived token)
echo "YOUR_LONG_LIVED_TOKEN" | gcloud secrets versions add THREADS_ACCESS_TOKEN \
  --data-file=- \
  --project=kotikreikasta
```

## Test the Function

```bash
curl -X POST https://europe-west1-kotikreikasta.cloudfunctions.net/testThreadsPost \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)"
```

**Expected response:**
```json
{
  "ok": true,
  "message": "Test post successful",
  "threadId": "18074098454181426",
  "text": "Terveisiä Kreikasta! 🇬🇷",
  "url": "https://www.threads.net/@username/post/18074098454181426",
  "note": "Replace @username with your actual Threads username to view the post"
}
```

## Authentication Method

The function uses **Threads API v1.0** with a two-step posting process:

### Step 1: Create Media Container
```
POST https://graph.threads.net/v1.0/{user_id}/threads
Parameters:
  - media_type: TEXT
  - text: "Your message"
  - access_token: {long_lived_token}
```

### Step 2: Publish Container
```
POST https://graph.threads.net/v1.0/{user_id}/threads_publish
Parameters:
  - creation_id: {container_id_from_step_1}
  - access_token: {long_lived_token}
```

## Token Expiration & Refresh

Long-lived tokens expire after **60 days**. To refresh:

### Manual Refresh

1. Generate a new short-lived token (Step 1 above)
2. Exchange for long-lived token (Step 3 above)
3. Update the secret (commands above)

### Automated Refresh (Recommended for Production)

Create a Cloud Function that runs weekly to refresh the token:

```typescript
// Refresh token before it expires
async function refreshThreadsToken() {
  const currentToken = await getSecret('THREADS_ACCESS_TOKEN');
  
  const response = await fetch(
    `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${currentToken}`
  );
  
  const { access_token } = await response.json();
  await updateSecret('THREADS_ACCESS_TOKEN', access_token);
}
```

Schedule with Cloud Scheduler to run weekly.

## Important Notes

### App Mode
- App **must be in Live mode** for Threads API to work
- Development mode requires test users and has limitations
- Switch to Live: App Settings → Basic → App Mode → Live

### Account Type
- Threads account must be a **Business** or **Creator** account
- Personal accounts cannot use the Threads API
- Convert in Instagram app: Settings → Account → Switch to Professional Account

### Permissions
- `threads_basic` - Required for basic access
- `threads_content_publish` - Required for posting
- Other permissions are optional based on your needs

### Rate Limits
- Threads API has rate limits per user
- Typical limit: ~250 posts per day per user
- Respect rate limits to avoid temporary blocks

## Troubleshooting

### Error: "Invalid OAuth access token"
- Token has expired (60 days)
- Generate and exchange a new token
- Update the `THREADS_ACCESS_TOKEN` secret

### Error: "User has not accepted the invite"
- App is in Development mode
- Switch app to Live mode
- Or add yourself as a test user in app settings

### Error: "Permissions error"
- Token missing required scopes
- Regenerate token with `threads_basic` and `threads_content_publish`
- Exchange for long-lived token and update secret

### Error: "Invalid user ID"
- User ID doesn't match the token's user
- Verify user ID with `me?fields=id` query
- Update `THREADS_USER_ID` secret if needed

## Threads API Documentation

- **Official Docs**: https://developers.facebook.com/docs/threads
- **API Reference**: https://developers.facebook.com/docs/threads/reference
- **Getting Started**: https://developers.facebook.com/docs/threads/get-started

## Current Configuration

- **Function URL**: https://europe-west1-kotikreikasta.cloudfunctions.net/testThreadsPost
- **User ID**: `26734590522814214` (Kotikreikasta.com)
- **Token Status**: ✅ Long-lived token configured (60 days)
- **Test Status**: ✅ Working - Successfully posted test message

## Next Steps

For production use, consider:
1. Implementing automated token refresh (Cloud Function + Cloud Scheduler)
2. Adding retry logic for transient failures
3. Implementing rate limit tracking
4. Adding post scheduling capabilities
5. Monitoring token expiration dates
