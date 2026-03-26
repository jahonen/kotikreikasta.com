# Bluesky Analytics Setup

## Required Secrets

The Bluesky analytics fetcher now uses the **AT Protocol API** to fetch real engagement data instead of fake estimates.

### Secrets to Add to Secret Manager

You need to add two secrets to Google Cloud Secret Manager:

1. **BLUESKY_HANDLE** - Your Bluesky handle (e.g., `kotikreikasta.bsky.social`)
2. **BLUESKY_APP_PASSWORD** - An app-specific password for API access

### How to Create a Bluesky App Password

1. Go to https://bsky.app/settings/app-passwords
2. Click "Add App Password"
3. Give it a name (e.g., "Analytics API")
4. Copy the generated password (you won't be able to see it again)

### Add Secrets to Secret Manager

```bash
# Add Bluesky handle
echo -n "your.handle.bsky.social" | gcloud secrets create BLUESKY_HANDLE \
  --data-file=- \
  --replication-policy="automatic" \
  --project=kotikreikasta

# Add Bluesky app password
echo -n "your-app-password-here" | gcloud secrets create BLUESKY_APP_PASSWORD \
  --data-file=- \
  --replication-policy="automatic" \
  --project=kotikreikasta
```

### Grant Access to Cloud Function Service Account

```bash
# Grant Secret Manager access to the App Engine default service account
gcloud secrets add-iam-policy-binding BLUESKY_HANDLE \
  --member="serviceAccount:kotikreikasta@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=kotikreikasta

gcloud secrets add-iam-policy-binding BLUESKY_APP_PASSWORD \
  --member="serviceAccount:kotikreikasta@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=kotikreikasta
```

## What Data is Available

The updated Bluesky analytics fetcher uses the AT Protocol API to fetch **real data**:

### ✅ Available Metrics
- **Likes** - Actual like count per post
- **Reposts** (shares) - Actual repost count per post
- **Replies** - Actual reply count per post
- **Engagements** - Sum of likes + reposts + replies
- **Followers** - Current follower count
- **Net Followers** - Change in followers (tracked via Firestore cache)

### ❌ Not Available Metrics
- **Impressions** - Not provided by AT Protocol (incompatible with federated architecture)
- **Reach** - Not exposed by the API (structurally difficult due to custom feeds)

### Engagement Rate Calculation

Since impressions are not available, the engagement rate is calculated as:
```
Engagement Rate = (Total Engagements / Follower Count) × 100
```

This is the standard approach used by third-party Bluesky analytics tools.

## API Endpoints Used

1. **Authentication**: `com.atproto.server.createSession`
   - Creates an authenticated session using handle + app password

2. **Profile Data**: `app.bsky.actor.getProfile`
   - Fetches current follower count and profile info

3. **Posts Feed**: `app.bsky.feed.getAuthorFeed`
   - Fetches up to 100 recent posts with engagement metrics

## Caching Strategy

- **Follower count** is cached in Firestore (`analytics_cache/bluesky_followers`)
- This allows tracking follower growth over time
- Cache is updated on each analytics fetch

## Next Steps

1. Create a Bluesky app password
2. Add the two secrets to Secret Manager
3. Grant IAM permissions to the service account
4. Rebuild and redeploy the Cloud Function
5. Test the analytics endpoint

The dashboard will then show **real Bluesky engagement data** instead of fabricated estimates.
