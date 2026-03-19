# X (Twitter) Test Function Setup Instructions

## Overview
The `testXPost` Cloud Function is deployed and ready, but requires X (Twitter) OAuth 1.0a credentials to be configured in Google Secret Manager.

## Required Secrets

You need to create **4 secrets** in Google Secret Manager with your X API credentials:

### 1. X_CONSUMER_KEY
Your X API Consumer Key (API Key)

### 2. X_CONSUMER_SECRET
Your X API Consumer Secret (API Secret)

### 3. X_ACCESS_TOKEN
Your X API Access Token

### 4. X_ACCESS_TOKEN_SECRET
Your X API Access Token Secret

## How to Get X API Credentials

1. **Go to X Developer Portal**: https://developer.twitter.com/en/portal/dashboard
2. **Create a Project** (if you don't have one)
3. **Create an App** within the project
4. **Enable OAuth 1.0a** in the app settings
5. **Set App Permissions** to "Read and Write"
6. **Generate Access Token and Secret** in the "Keys and tokens" tab

You'll get:
- API Key (Consumer Key)
- API Secret (Consumer Secret)
- Access Token
- Access Token Secret

## Create Secrets in Google Secret Manager

```bash
# Create X_CONSUMER_KEY
echo "your-consumer-key-here" | gcloud secrets create X_CONSUMER_KEY \
  --data-file=- \
  --project=kotikreikasta

# Create X_CONSUMER_SECRET
echo "your-consumer-secret-here" | gcloud secrets create X_CONSUMER_SECRET \
  --data-file=- \
  --project=kotikreikasta

# Create X_ACCESS_TOKEN
echo "your-access-token-here" | gcloud secrets create X_ACCESS_TOKEN \
  --data-file=- \
  --project=kotikreikasta

# Create X_ACCESS_TOKEN_SECRET
echo "your-access-token-secret-here" | gcloud secrets create X_ACCESS_TOKEN_SECRET \
  --data-file=- \
  --project=kotikreikasta
```

## Grant Secret Access to Cloud Functions

```bash
for secret in X_CONSUMER_KEY X_CONSUMER_SECRET X_ACCESS_TOKEN X_ACCESS_TOKEN_SECRET; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:kotikreikasta@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=kotikreikasta
done
```

## Test the Function

Once secrets are configured:

```bash
curl -X POST https://europe-west1-kotikreikasta.cloudfunctions.net/testXPost \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)"
```

**Expected response:**
```json
{
  "ok": true,
  "message": "Test post successful",
  "tweetId": "1234567890123456789",
  "text": "Terveisiä Kreikasta! 🇬🇷",
  "url": "https://twitter.com/i/web/status/1234567890123456789"
}
```

## Authentication Method

The function uses **OAuth 1.0a** (required by X API v2 for posting tweets):
- Generates OAuth signature using HMAC-SHA1
- Includes oauth_consumer_key, oauth_token, oauth_signature, etc.
- Sends Authorization header with OAuth parameters

## Troubleshooting

### Error: "credentials_fetch_failed"
- Secrets don't exist or service account doesn't have access
- Run the grant access commands above

### Error: "x_api_error_401"
- Invalid credentials
- Verify your API keys are correct

### Error: "x_api_error_403"
- App doesn't have write permissions
- Check app permissions in X Developer Portal (should be "Read and Write")

### Error: "x_api_error_429"
- Rate limit exceeded
- Wait before trying again

## Notes

- X API v2 requires OAuth 1.0a User Context for posting tweets
- Bearer tokens (OAuth 2.0 App-Only) cannot post tweets
- The function posts "Terveisiä Kreikasta! 🇬🇷" as a test message
- Character limit: 280 characters for standard tweets
