# Bluesky Notifications Integration

## Overview

This integration fetches notifications from Bluesky (AT Protocol) and sends them to the admin dashboard via Novu. Admins receive real-time notifications for:

- **Followers** (follow) - New followers
- **Likes** (like) - Someone liked your post
- **Reposts** (repost) - Someone reposted your content
- **Replies** (reply) - Someone replied to your post
- **Mentions** (mention) - Someone mentioned you in a post
- **Quotes** (quote) - Someone quoted your post

Each notification includes a clickable link that opens the relevant content in the Bluesky web app or mobile app.

## Architecture

### Components

1. **Cloud Function: `blueskyNotificationsFetcher`**
   - Runs every 5 minutes via Cloud Scheduler
   - Fetches new notifications from Bluesky AT Protocol API
   - Transforms notifications to Novu format
   - Sends to admin users via Novu
   - Stores cursor in Firestore to track last fetched notification

2. **Novu Workflow: `bluesky-notification`**
   - Receives notification events from Cloud Function
   - Displays in admin dashboard notification inbox
   - Includes clickable links to Bluesky content

3. **Firestore Collection: `system/bluesky_notifications`**
   - Stores cursor for pagination
   - Tracks last fetch time
   - Records processed notification count

## Setup Instructions

### 1. Bluesky Credentials

The integration uses existing Bluesky credentials from Secret Manager:
- `BSKY_IDENTIFIER` - Bluesky handle or email
- `BSKY_APP_PASSWORD` - App-specific password

These should already be configured from the Bluesky analytics setup.

### 2. Deploy Cloud Function

```bash
cd functions
npm run build
firebase deploy --only functions:blueskyNotificationsFetcher
```

### 3. Create Novu Workflow

In the Novu dashboard (https://web.novu.co):

1. Create a new workflow named `bluesky-notification`
2. Add an **In-App** notification step
3. Configure the template:

**Subject:**
```
{{title}}
```

**Body:**
```
{{body}}
```

**CTA (Call to Action):**
- **Label:** "Avaa Blueskyssa" (Open in Bluesky)
- **URL:** `{{url}}`
- **Target:** `_blank`

**Avatar:**
```
{{authorAvatar}}
```

4. Save and activate the workflow

### 4. Create Cloud Scheduler Job

```bash
gcloud scheduler jobs create http bluesky-notifications-fetcher \
  --location=europe-west1 \
  --schedule="*/5 * * * *" \
  --uri="https://europe-west1-kotikreikasta.cloudfunctions.net/blueskyNotificationsFetcher" \
  --http-method=POST \
  --oidc-service-account-email=kotikreikasta@appspot.gserviceaccount.com \
  --description="Fetch Bluesky notifications every 5 minutes"
```

### 5. Grant IAM Permissions

The Cloud Function service account needs access to:
- Bluesky credentials (already granted)
- Novu API key (already granted)
- Firestore (already granted)

No additional permissions needed if analytics are already working.

## Notification Types & URLs

### Follow
- **Finnish:** "Uusi seuraaja Blueskyssa"
- **Body:** "{displayName} seuraa nyt sinua"
- **URL:** `https://bsky.app/profile/{handle}`

### Like
- **Finnish:** "Tykkäys Blueskyssa"
- **Body:** "{displayName} tykkäsi viestistäsi"
- **URL:** `https://bsky.app/profile/{handle}`

### Repost
- **Finnish:** "Uudelleenjako Blueskyssa"
- **Body:** "{displayName} jakoi viestisi uudelleen"
- **URL:** `https://bsky.app/profile/{handle}`

### Reply
- **Finnish:** "Vastaus Blueskyssa"
- **Body:** "{displayName}: {preview}"
- **URL:** `https://bsky.app/profile/{handle}/post/{postId}`

### Mention
- **Finnish:** "Maininta Blueskyssa"
- **Body:** "{displayName} mainitsi sinut: {preview}"
- **URL:** `https://bsky.app/profile/{handle}/post/{postId}`

### Quote
- **Finnish:** "Lainaus Blueskyssa"
- **Body:** "{displayName} lainasi viestiäsi: {preview}"
- **URL:** `https://bsky.app/profile/{handle}/post/{postId}`

## How It Works

### 1. Notification Fetching

Every 5 minutes, the Cloud Function:
1. Fetches admin user ID from Firestore (`roles` collection)
2. Retrieves last cursor from `system/bluesky_notifications`
3. Creates Bluesky session using AT Protocol
4. Calls `app.bsky.notification.listNotifications` with cursor
5. Filters for unread notifications only

### 2. Notification Processing

For each unread notification:
1. Generates Finnish notification text based on type
2. Creates clickable Bluesky URL
3. Sends to Novu with payload:
   - `title` - Notification title
   - `body` - Notification body
   - `url` - Clickable link to Bluesky
   - `reason` - Notification type
   - `author` - Author handle
   - `authorDisplayName` - Author display name
   - `authorAvatar` - Author avatar URL
   - `timestamp` - When notification was created

### 3. Cursor Management

After processing:
1. Updates cursor in Firestore
2. Records timestamp and processed count
3. Next run starts from this cursor (pagination)

## Admin Dashboard Integration

Notifications appear in the admin dashboard notification inbox (top-right bell icon).

Clicking a notification:
1. Opens the Bluesky web app in a new tab
2. Navigates to the relevant profile or post
3. Works on both desktop and mobile

## Monitoring

### Check Function Logs

```bash
gcloud functions logs read blueskyNotificationsFetcher --region=europe-west1 --limit=50
```

### Check Scheduler Status

```bash
gcloud scheduler jobs describe bluesky-notifications-fetcher --location=europe-west1
```

### Check Firestore Cursor

```bash
# View last cursor and fetch time
gcloud firestore documents get system/bluesky_notifications
```

## Troubleshooting

### No Notifications Appearing

1. **Check Cloud Function logs:**
   ```bash
   gcloud functions logs read blueskyNotificationsFetcher --region=europe-west1 --limit=20
   ```

2. **Verify Bluesky credentials:**
   ```bash
   gcloud secrets versions access latest --secret=BSKY_IDENTIFIER
   ```

3. **Check Novu workflow is active:**
   - Log into Novu dashboard
   - Verify `bluesky-notification` workflow is enabled

4. **Verify admin user exists:**
   - Check Firestore `roles` collection
   - Ensure at least one user has `role: 'admin'`

### Duplicate Notifications

- Check cursor is being updated in Firestore
- Verify `isRead` filter is working
- Check Cloud Scheduler isn't running too frequently

### Wrong URLs

- Verify notification `uri` format matches AT Protocol spec
- Check post ID extraction regex
- Test URL generation with different notification types

## API Rate Limits

Bluesky AT Protocol has rate limits:
- **Session creation:** 300/5min per IP
- **List notifications:** 3000/5min per user

Running every 5 minutes with 50 notifications per fetch:
- **Sessions:** 12/hour (well under limit)
- **Notifications:** 12/hour (well under limit)

## Future Enhancements

1. **Notification Filtering**
   - Allow admins to configure which notification types to receive
   - Store preferences in Firestore

2. **Batch Notifications**
   - Group multiple likes/reposts into single notification
   - Reduce notification fatigue

3. **Rich Previews**
   - Include post content in notification
   - Show images/embeds

4. **Direct Messaging**
   - Add support for Bluesky DMs when API becomes available
   - Separate workflow for messages

5. **Multi-Account Support**
   - Track notifications for multiple Bluesky accounts
   - Useful if managing multiple brands

## Security

- Bluesky credentials stored in Secret Manager
- Cloud Function uses service account authentication
- Novu API key stored in Secret Manager
- No credentials exposed in client-side code
- Notifications only sent to verified admin users

## Cost Estimate

- **Cloud Function:** ~$0.01/month (5-minute intervals, minimal compute)
- **Cloud Scheduler:** $0.10/month (1 job)
- **Firestore:** Negligible (1 document update per run)
- **Novu:** Free tier (up to 30,000 events/month)

**Total:** ~$0.11/month
