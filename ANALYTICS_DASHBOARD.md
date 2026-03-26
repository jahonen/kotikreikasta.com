# Marketing Analytics Dashboard

> Comprehensive analytics dashboard for tracking social media performance across 5 platforms

## Overview

The marketing analytics dashboard provides real-time insights into content marketing performance across Facebook, Instagram, Threads, X (Twitter), and Bluesky. The system fetches data from platform APIs, caches it in Firestore, and presents it through an interactive admin dashboard with Finnish labels and industry-standard metrics.

**Dashboard URL:** https://admin.kotikreikasta.com/markkinointi

---

## Architecture

### Backend: Cloud Functions

**Location:** `functions/src/analytics/`

```
analytics/
├── analytics-aggregator.ts     # Main HTTP endpoint
├── analytics-types.ts          # TypeScript interfaces
├── instagram-analytics.ts      # Instagram Graph API fetcher
├── facebook-analytics.ts       # Facebook Page Insights fetcher
├── threads-analytics.ts        # Threads Graph API fetcher
├── x-analytics.ts              # X API v2 fetcher (OAuth 1.0a)
├── bluesky-analytics.ts        # Bluesky tracker (from socialShares)
└── utils/
    ├── firestore-cache.ts      # 24h caching logic
    └── projection.ts           # 30-day forecasting
```

**Cloud Function:**
- **Name:** `analyticsAggregator`
- **Region:** `europe-west1`
- **URL:** `https://europe-west1-kotikreikasta.cloudfunctions.net/analyticsAggregator`
- **Timeout:** 300 seconds
- **Memory:** 1GB
- **Trigger:** HTTP GET

### Frontend: Admin Dashboard

**Location:** `admin/app/markkinointi/`

```
markkinointi/
├── page.tsx                        # Main dashboard
├── lib/
│   └── analytics-client.ts         # API client
└── components/
    ├── MetricCard.tsx              # KPI cards
    ├── ImpressionsChart.tsx        # Stacked area chart
    ├── EngagementRateChart.tsx     # Horizontal bar chart
    └── PlatformCard.tsx            # Platform metrics
```

---

## Platform Coverage

### ✅ Instagram (Full API Access)

**API:** Instagram Graph API v18.0  
**Token:** `INSTAGRAM_ACCESS_TOKEN` (60-day expiry, auto-refresh)  
**Metrics:**
- Impressions
- Reach
- Profile views
- Follower count
- Engagement (likes, comments, saves)

**Endpoint:**
```
GET /{instagram-account-id}/insights
  ?metric=impressions,reach,profile_views,follower_count
  &period=day
  &since={timestamp}
  &until={timestamp}
```

### ✅ Facebook (Full API Access)

**API:** Facebook Graph API v18.0  
**Token:** `META_SYSTEM_TOKEN` (never expires)  
**Metrics:**
- Page impressions
- Page impressions unique (reach)
- Page engaged users
- Page fans (followers)
- Post reactions, comments, shares

**Endpoint:**
```
GET /{page-id}/insights
  ?metric=page_impressions,page_impressions_unique,page_engaged_users,page_fans
  &period=day
```

### ✅ Threads (Basic API Access)

**API:** Threads Graph API v1.0  
**Token:** `THREADS_ACCESS_TOKEN` (60-day expiry, auto-refresh)  
**Metrics:**
- Thread views (impressions)
- Likes
- Replies
- Reposts
- Quotes

**Endpoint:**
```
GET /{threads-user-id}/threads
  ?fields=id,timestamp
GET /{thread-id}/insights
  ?metric=views,likes,replies,reposts,quotes
```

**Note:** Threads API doesn't provide historical follower count.

### ✅ X (Full API Access - Pay-Per-Use)

**API:** X API v2  
**Auth:** OAuth 1.0a  
**Tokens:** `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`  
**Metrics:**
- Tweet impressions
- Engagements (likes, retweets, replies, quotes)
- Follower count
- Retweet count, like count, reply count, quote count

**Endpoints:**
```
GET /2/users/me
  ?user.fields=public_metrics

GET /2/tweets/search/recent
  ?query=from:{username}
  &tweet.fields=public_metrics,created_at
  &max_results=100
```

**Cost:** ~$0.50/day (~$15/month) with pay-per-use credits

### ⚠️ Bluesky (Limited - No Official API)

**Data Source:** Firestore `socialShares` subcollection  
**Metrics:**
- Post count (shares/reposts)
- Estimated impressions (placeholder: 100 per post)
- Estimated engagement (5x shares)

**Note:** Bluesky doesn't have an official analytics API. We track only our own posts from the publishing system.

---

## API Usage

### Fetch Analytics

**Endpoint:**
```
GET https://europe-west1-kotikreikasta.cloudfunctions.net/analyticsAggregator
```

**Query Parameters:**
- `period` (optional): Number of days (1-90, default: 30)
- `refresh` (optional): Force refresh (`true` to bypass cache)

**Example:**
```bash
curl "https://europe-west1-kotikreikasta.cloudfunctions.net/analyticsAggregator?period=30"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": 30,
    "startDate": "2026-02-26",
    "endDate": "2026-03-26",
    "totals": {
      "impressions": 1240000,
      "reach": 850000,
      "engagements": 38412,
      "avg_engagement_rate": 3.1,
      "net_followers": 2847,
      "total_shares": 8441
    },
    "platforms": {
      "instagram": { "impressions": 411000, "engagements": 12904, ... },
      "facebook": { "impressions": 388000, "engagements": 7211, ... },
      "threads": { "impressions": 157000, "engagements": 4382, ... },
      "x": { "impressions": 284000, "engagements": 9812, ... },
      "bluesky": { "impressions": 0, "engagements": 4103, ... }
    },
    "timeline": [
      {
        "date": "2026-03-01",
        "instagram": { "impressions": 15000, "engagements": 450 },
        "facebook": { "impressions": 12000, "engagements": 280 },
        ...
      }
    ],
    "projections": {
      "impressions": [
        { "date": "2026-03-27", "value": 42000 },
        { "date": "2026-03-28", "value": 43000 },
        ...
      ],
      "followers": [...]
    }
  },
  "meta": {
    "fetchedPlatforms": ["instagram", "facebook"],
    "totalSnapshots": 150,
    "duration": 2340
  }
}
```

---

## Caching Strategy

### Firestore Collections

**`analytics_snapshots`** - Daily metrics per platform
```typescript
{
  date: "2026-03-26",
  platform: "instagram",
  metrics: {
    impressions: 15000,
    reach: 12000,
    engagements: 450,
    engagement_rate: 3.0,
    followers: 2847,
    follower_change: 12,
    shares: 120,
    likes: 300,
    comments: 30
  },
  fetchedAt: Timestamp,
  source: "api"
}
```

**`analytics_cache`** - Last fetch tracking
```typescript
{
  id: "latest",
  lastFetchDate: "2026-03-26",
  platforms: {
    instagram: {
      lastFetch: Timestamp,
      status: "success"
    },
    facebook: { ... },
    ...
  }
}
```

### Cache Logic

1. **Check cache:** If data exists for today, return from Firestore
2. **Fetch fresh:** If stale (>24h) or forced refresh, call platform APIs
3. **Store snapshots:** Save daily metrics to `analytics_snapshots`
4. **Update cache:** Mark platform as fetched with timestamp

**Benefits:**
- Minimizes API costs (~$15/month instead of ~$450/month)
- Fast dashboard load times (Firestore reads vs API calls)
- Historical data preservation

---

## Dashboard Features

### Metric Cards (Top Row)

- **Näyttökerrat yhteensä** (Total Impressions)
- **Sitoutumiset yhteensä** (Total Engagements)
- **Keskimääräinen sitoutumisaste** (Avg Engagement Rate)
- **Seuraajien muutos** (Net Followers)

All with **vs previous period** comparison.

### Charts

**1. Impressions Over Time**
- Stacked area chart
- All 5 platforms color-coded
- 30-day projection (dotted line)
- Linear regression forecast

**2. Engagement Rate by Platform**
- Horizontal bar chart
- Percentage-based comparison
- Platform-specific colors

### Platform Cards (Bottom Row)

Individual cards for each platform showing:
- Impressions
- Reach
- Engagements
- Eng. rate
- Net followers
- Shares/reposts

### Period Selector

- **7d** - Last 7 days
- **30d** - Last 30 days (default)
- **90d** - Last 90 days

### Manual Refresh

Button to force fresh API fetch (bypasses 24h cache).

---

## Deployment

### Cloud Functions

```bash
# Deploy analytics aggregator
firebase deploy --only functions:analyticsAggregator
```

**⚠️ Important:** After deployment, manually configure IAM for public access:

```bash
# User must configure this manually due to organization policies
gcloud functions add-iam-policy-binding analyticsAggregator \
  --region=europe-west1 \
  --member=allUsers \
  --role=roles/cloudfunctions.invoker
```

### Admin Dashboard

```bash
# Build admin
cd admin
npm run build

# Deploy to preview channel for testing
firebase hosting:channel:deploy analytics-test

# Deploy to production
firebase deploy --only hosting:kotikreikasta-admin
```

---

## Secrets Configuration

All secrets managed via Google Secret Manager:

### Instagram
```bash
INSTAGRAM_ACCESS_TOKEN      # User access token (60-day expiry)
INSTAGRAM_APP_ID            # Instagram account ID
INSTAGRAM_APP_SECRET        # App secret for token refresh
```

### Facebook
```bash
FACEBOOK_PAGE_ID            # Page ID
META_SYSTEM_TOKEN           # System user token (never expires)
```

### Threads
```bash
THREADS_USER_ID             # Threads user ID
THREADS_ACCESS_TOKEN        # User access token (60-day expiry)
```

### X (Twitter)
```bash
X_API_KEY                   # Consumer API key
X_API_SECRET                # Consumer API secret
X_ACCESS_TOKEN              # Access token
X_ACCESS_SECRET             # Access token secret
```

**Note:** Bluesky doesn't require additional secrets (uses existing `BSKY_IDENTIFIER` and `BSKY_APP_PASSWORD`).

---

## Cost Analysis

### API Costs (Monthly)

| Platform | Cost | Notes |
|----------|------|-------|
| Instagram | Free | Existing token |
| Facebook | Free | System token |
| Threads | Free | Existing token |
| **X** | **~$15** | Pay-per-use (~$0.50/day) |
| Bluesky | Free | No API |
| **Total** | **~$15/month** | |

### X API Breakdown

- User metrics: $0.002 per request
- Tweet search: $0.005 per request
- Daily refresh: 2-3 API calls
- **Daily cost:** ~$0.50
- **Monthly cost:** ~$15

**With caching:** Only 1 fetch per day = minimal cost  
**Without caching:** Multiple fetches = ~$450/month

---

## Metrics Glossary

### Industry-Standard Terms

- **Impressions** - Number of times content was displayed
- **Reach** - Unique users who saw content
- **Engagements** - Total interactions (likes + comments + shares)
- **Eng. rate** - Engagement rate (engagements / impressions × 100)
- **Net followers** - Follower change (current - previous)
- **Shares/reposts** - Content shared by users

### Finnish Labels

- **Näyttökerrat** - Impressions
- **Sitoutumiset** - Engagements
- **Sitoutumisaste** - Engagement rate
- **Seuraajien muutos** - Follower change
- **vs edellinen** - vs previous period

---

## Troubleshooting

### Analytics Not Loading

1. **Check Cloud Function logs:**
```bash
gcloud functions logs read analyticsAggregator \
  --region=europe-west1 \
  --limit=50
```

2. **Verify IAM permissions:**
```bash
gcloud functions get-iam-policy analyticsAggregator \
  --region=europe-west1
```

3. **Test endpoint directly:**
```bash
curl "https://europe-west1-kotikreikasta.cloudfunctions.net/analyticsAggregator?period=7"
```

### Platform-Specific Errors

**Instagram/Threads:**
- Check token expiry (60 days)
- Verify token refresh function ran successfully
- Check Secret Manager for valid tokens

**Facebook:**
- Verify `META_SYSTEM_TOKEN` is valid
- Check Page ID is correct

**X:**
- Verify OAuth credentials in Secret Manager
- Check pay-per-use credits balance
- Review X API error codes in logs

**Bluesky:**
- Verify `socialShares` subcollection has data
- Check Firestore rules allow read access

### Cache Issues

**Force refresh:**
```
https://europe-west1-kotikreikasta.cloudfunctions.net/analyticsAggregator?refresh=true
```

**Clear cache manually:**
```bash
# Delete analytics_cache document
firebase firestore:delete analytics_cache/latest
```

---

## Future Enhancements

### Potential Improvements

1. **Bluesky Official API** - When available, integrate full analytics
2. **Historical Follower Tracking** - Store daily follower counts for all platforms
3. **Custom Date Ranges** - Allow arbitrary date range selection
4. **Export to CSV** - Download analytics data
5. **Email Reports** - Scheduled weekly/monthly reports
6. **Anomaly Detection** - Alert on unusual metric changes
7. **Competitor Tracking** - Compare against industry benchmarks
8. **Cost Optimization** - Reduce X API calls with smarter caching

### Known Limitations

- **Threads:** No historical follower count from API
- **Bluesky:** No official analytics API (estimates only)
- **X:** Follower change requires historical tracking
- **Projections:** Simple linear regression (could use more sophisticated models)

---

## Support

For issues or questions:
- **Logs:** `gcloud functions logs read analyticsAggregator`
- **Firestore:** Check `analytics_snapshots` and `analytics_cache` collections
- **Documentation:** This file and inline code comments

---

**Last Updated:** March 26, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
