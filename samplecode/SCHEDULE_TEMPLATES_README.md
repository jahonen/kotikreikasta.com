# Social Media Schedule Templates

## Overview

These JSON templates define posting schedules and behavior for each social media platform. They should be stored in **Google Secret Manager** with the following secret names:

- `SOCIAL_SCHEDULE_BLUESKY`
- `SOCIAL_SCHEDULE_X`
- `SOCIAL_SCHEDULE_FACEBOOK`
- `SOCIAL_SCHEDULE_THREADS`
- `SOCIAL_SCHEDULE_EMAIL`

## Template Structure

### Core Fields

#### `platform` (string)
Platform identifier: `bluesky`, `x`, `facebook`, `threads`, or `email`

#### `schedule` (array)
Array of posting windows by day of week.

**Fields per schedule entry:**
- `day`: Day of week (Monday-Sunday)
- `primary`: Required posting window
  - `window`: Time range in format "HH:MM–HH:MM"
  - `tz`: Timezone (e.g., "EEST" = UTC+3)
- `secondary`: Optional second posting window (same structure as primary)

#### `evergreenRules` (object)
Controls re-sharing of old content when queue is empty.

**Fields:**
- `minDaysBetweenShares`: Minimum days before re-sharing same content (90-180 recommended)
- `maxSharesPerContent`: Maximum times to share same content per platform (3-5 recommended)
- `prioritizeNew`: Always prefer new queue content over evergreen (true recommended)
- `minContentAge`: Minimum content age in days before eligible for evergreen (30-90 recommended)
- `enabled`: Enable/disable evergreen re-sharing

#### `postingBehavior` (object)
Controls how posts are executed.

**Fields:**
- `randomizeWithinWindow`: Post at random time within window vs start of window
- `minMinutesBetweenPosts`: Minimum gap between posts on same platform (180-360 recommended)
- `retryOnFailure`: Retry failed posts
- `maxRetries`: Maximum retry attempts (3 recommended)
- `retryDelayMinutes`: Minutes to wait between retries (15-30 recommended)

#### `contentPreferences` (object)
Platform-specific content formatting preferences.

**Common fields:**
- `preferredTypes`: Array of content types, in priority order
- `maxCharacters`: Platform character limit
- `includeHashtags`: Whether to include hashtags
- `includeEmojis`: Whether to include emojis
- `includeImages`: Whether to attach images
- `maxImages`: Maximum images per post

## Platform-Specific Notes

### Bluesky
- **Character limit:** 300
- **Posting frequency:** 8 posts/week (primary + secondary)
- **Evergreen:** Re-share after 90 days, max 5 times
- **Best times:** Mornings (7-8:30 AM) and weekends

### X (Twitter)
- **Character limit:** 280
- **Posting frequency:** 10 posts/week
- **Evergreen:** Re-share after 120 days, max 4 times
- **Best times:** Morning (8-9 AM) and late afternoon (4-6 PM)
- **Note:** More conservative evergreen to avoid appearing spammy

### Facebook
- **Character limit:** 63,206 (practically unlimited)
- **Posting frequency:** 7 posts/week
- **Evergreen:** Re-share after 150 days, max 3 times
- **Best times:** Lunch (12-2 PM) and evenings (6-8 PM)
- **Note:** Prefers longer, more detailed content

### Threads
- **Character limit:** 500
- **Posting frequency:** 7 posts/week
- **Evergreen:** Re-share after 100 days, max 4 times
- **Best times:** Mid-morning (9-11 AM) and late afternoon
- **Note:** Conversational tone preferred

### Email (Newsletter)
- **Schedule:** Weekly digest only (Sunday 10:00-10:30 AM EEST)
- **Evergreen:** Disabled (uses digest format instead)
- **Digest format:** 2-5 items total (max 3 listings, max 2 blog posts)
- **Note:** Requires SendGrid template configuration

## Usage in Cloud Functions

Consumer functions should:

1. Fetch schedule from Secret Manager at startup
2. Parse JSON and validate structure
3. Use schedule to determine if current time matches a posting window
4. Apply evergreen rules when queue is empty
5. Respect posting behavior settings (retry, randomization, etc.)

## Updating Schedules

To update a schedule:

1. Edit the JSON template
2. Validate JSON syntax
3. Update the secret in Google Secret Manager:
   ```bash
   echo '{ ... }' | gcloud secrets versions add SOCIAL_SCHEDULE_BLUESKY --data-file=-
   ```
4. Consumer functions will pick up new schedule on next execution (no code deployment needed)

## Time Windows Explained

**Window format:** `"07:00–08:30"`
- Start: 07:00 EEST (UTC+3)
- End: 08:30 EEST (UTC+3)
- Duration: 90 minutes

**With `randomizeWithinWindow: true`:**
- Cloud Scheduler triggers at window start (07:00)
- Consumer picks random time between 07:00-08:30
- Actual post happens at random time (e.g., 07:23)

**With `randomizeWithinWindow: false`:**
- Post happens immediately at window start (07:00)

## FIFO Queue Behavior

When multiple items are in queue:
1. Query: `orderBy('createdAt', 'asc').limit(1)`
2. Post oldest item first
3. Mark as published
4. Next scheduled window posts next oldest item

When queue is empty and evergreen enabled:
1. Query published content matching evergreen rules
2. Order by `lastShared` ascending (oldest share first)
3. Post and update share tracking
4. Ensures even rotation of evergreen content

## Testing Schedules

To test a schedule without waiting for scheduled time:

1. Create a test Cloud Function that accepts platform parameter
2. Manually trigger with: `gcloud functions call testSocialPost --data '{"platform":"bluesky"}'`
3. Function should process as if scheduled time occurred
4. Check logs for posting behavior and content selection

## Monitoring

Recommended metrics to track:
- Posts per platform per week
- Queue depth (pending items)
- Evergreen vs new content ratio
- Failed posts and retry counts
- Average time between posts per platform
