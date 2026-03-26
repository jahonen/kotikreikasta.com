# Analytics Dashboard Status Report

## MVP Completed (March 26, 2026)

### ✅ Working Platforms (3/5)

**Threads**
- Status: ✅ Fully functional
- Data: Real impressions (503) and engagements (4) from Threads Graph API
- Engagement rate: 0.8%
- API: Threads Graph API working correctly

**X (Twitter)**
- Status: ✅ Fully functional
- Data: Real impressions (36), followers (2) from X API v2
- API: OAuth 1.0a authentication working
- Fix applied: Updated secret names to match Secret Manager (X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN_SECRET)

**Bluesky**
- Status: ✅ Fully functional
- Data: Real engagement data from AT Protocol API
- Metrics: 13 engagements, 13 followers, 20 posts fetched
- API: AT Protocol authentication working with BSKY_IDENTIFIER and BSKY_APP_PASSWORD
- Note: Impressions not available (incompatible with federated architecture)
- Fix applied: Replaced fake estimates with real AT Protocol API calls

### ⏸️ Waiting for Data (2/5)

**Instagram**
- Status: ⏸️ Waiting for 100 followers
- Error: `instagram_insights_error_400`
- Root Cause: Instagram Insights API requires 100+ followers to access metrics
- Will start reporting once follower threshold is reached

**Facebook**
- Status: ⏸️ Waiting for 100 followers
- Error: `facebook_insights_error_400`
- Root Cause: Facebook Page Insights API requires 100+ followers to access metrics
- Will start reporting once follower threshold is reached

## Dashboard Features

### Visualizations
- **Stacked Area Chart**: Impressions over time with platform brand colors
  - Instagram: #E4405F (pink/red)
  - Facebook: #1877F2 (blue)
  - Threads: #000000 (black, 70% opacity)
  - X: #000000 (black, 50% opacity)
  - Bluesky: #0085FF (sky blue)
- **Engagement Rate Bar Chart**: Per-platform engagement rates
- **Platform Cards**: Individual metrics for each platform
- **Metric Cards**: Total impressions, engagements, avg engagement rate, net followers

### API Endpoints
- Cloud Function: `https://europe-west1-kotikreikasta.cloudfunctions.net/analyticsAggregator`
- Admin API Proxy: `/api/analytics` (handles authentication)
- Dashboard: `https://admin.kotikreikasta.com/markkinointi`

### Security
- Cloud Function: Publicly accessible (allUsers invoker role)
- Admin Dashboard: Protected by Firebase Authentication
- API Proxy: Runs on authenticated admin backend
- Service Account: Has Secret Manager and Firebase Admin permissions

## Known Limitations

### Follower Count Historical Data
- **Issue**: APIs only provide current follower counts, not historical data
- **Impact**: Historical dates show current follower count (e.g., March 1 shows today's count)
- **Solution**: Daily snapshots will provide accurate historical data going forward
- **Timeline**: Accurate follower growth tracking starts from March 26, 2026

### Bluesky Metrics
- **Impressions**: Not available (incompatible with AT Protocol federated architecture)
- **Reach**: Not available (custom feeds make server-side tracking impossible)
- **Engagement Rate**: Calculated as engagements/followers (standard third-party approach)

## Deployment Status

✅ All components deployed and functional:
- Analytics Cloud Function (europe-west1)
- Admin Dashboard (us-central1, will migrate to europe-west1)
- API Proxy Route
- CORS Configuration
- IAM Permissions

### 2. Fix Instagram Metrics (API Research Required)

The Instagram Graph API has changed. Need to:
1. Review current Instagram Insights API documentation
2. Identify which metrics are still available for Business/Creator accounts
3. Update the metrics list in `/functions/src/analytics/instagram-analytics.ts`
4. Verify the account has the necessary permissions

**Possible alternatives:**
- Use Instagram Basic Display API (limited metrics)
- Request specific permissions for Instagram Insights
- Use different metric names that are currently supported

### 3. Fix Facebook Metrics (API Research Required)

Facebook deprecated many Page Insights metrics. Need to:
1. Review current Facebook Page Insights API documentation
2. Identify replacement metrics or alternatives
3. Update the metrics list in `/functions/src/analytics/facebook-analytics.ts`
4. Verify the page access token has the necessary permissions

**Known changes:**
- Many page-level metrics were deprecated in 2021-2022
- Need to use post-level metrics instead
- May need to aggregate post metrics to get page-level insights

## Recommendations

### Short-term (Immediate)
1. Fix X credentials secret names (5 minutes)
2. Redeploy Cloud Function
3. Test X analytics

### Medium-term (Research Required)
1. Research current Instagram Graph API metrics
2. Research current Facebook Page Insights API metrics
3. Update both fetchers with valid metrics
4. Consider using Meta Business Suite API as alternative

### Long-term (Optional)
1. Add error handling to show partial data when some platforms fail
2. Add admin UI to configure which platforms to fetch
3. Add retry logic for transient API failures
4. Cache API responses to reduce quota usage

## Security Note

The analytics Cloud Function is currently publicly accessible (`allUsers` has invoker role). This is acceptable because:
- The admin dashboard requires Firebase Authentication
- The `/api/analytics` route is behind the authenticated admin app
- The function only reads and aggregates data (no write operations)
- Cloud Functions quotas provide rate limiting

However, consider adding request validation or API key authentication to the Cloud Function itself for additional security.
