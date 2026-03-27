import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const secretClient = new SecretManagerServiceClient();

interface BlueskyCredentials {
  identifier: string;
  password: string;
}

interface BlueskySession {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
}

interface BlueskyNotification {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  reason: 'like' | 'repost' | 'follow' | 'mention' | 'reply' | 'quote';
  reasonSubject?: string;
  record: any;
  isRead: boolean;
  indexedAt: string;
}

interface BlueskyNotificationsResponse {
  cursor?: string;
  notifications: BlueskyNotification[];
  seenAt?: string;
}

/**
 * Fetch Bluesky credentials from Secret Manager
 */
async function fetchBlueskyCredentials(): Promise<BlueskyCredentials> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [handleVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/BSKY_IDENTIFIER/versions/latest`,
    });
    const [passwordVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/BSKY_APP_PASSWORD/versions/latest`,
    });
    
    const identifier = handleVersion.payload?.data?.toString() || '';
    const password = passwordVersion.payload?.data?.toString() || '';
    
    if (!identifier || !password) {
      throw new Error('Missing Bluesky credentials');
    }
    
    return { identifier, password };
  } catch (error: any) {
    functions.logger.error('Failed to fetch Bluesky credentials', { error: error?.message });
    throw error;
  }
}

/**
 * Create Bluesky session
 */
async function createBlueskySession(credentials: BlueskyCredentials): Promise<BlueskySession> {
  const response = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: credentials.identifier,
      password: credentials.password,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Bluesky session: ${error}`);
  }
  
  return await response.json();
}

/**
 * Fetch notifications from Bluesky
 */
async function fetchBlueskyNotifications(
  session: BlueskySession,
  cursor?: string,
  limit: number = 50
): Promise<BlueskyNotificationsResponse> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (cursor) params.append('cursor', cursor);
  
  const response = await fetch(
    `https://bsky.social/xrpc/app.bsky.notification.listNotifications?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${session.accessJwt}`,
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Bluesky notifications: ${error}`);
  }
  
  return await response.json();
}

/**
 * Generate Bluesky web URL from notification
 */
function generateBlueskyUrl(notification: BlueskyNotification): string {
  const { author, reason, uri, reasonSubject } = notification;
  
  // Extract post ID from URI (format: at://did:plc:xxx/app.bsky.feed.post/xxx)
  const postIdMatch = uri.match(/app\.bsky\.feed\.post\/([^/]+)$/);
  const postId = postIdMatch ? postIdMatch[1] : null;
  
  switch (reason) {
    case 'follow':
      // Link to follower's profile
      return `https://bsky.app/profile/${author.handle}`;
    
    case 'like':
    case 'repost':
      // Link to the post that was liked/reposted
      if (reasonSubject) {
        const subjectPostId = reasonSubject.match(/app\.bsky\.feed\.post\/([^/]+)$/)?.[1];
        if (subjectPostId) {
          // For now, link to the author's profile since we don't have the handle mapping
          return `https://bsky.app/profile/${author.handle}`;
        }
      }
      return `https://bsky.app/profile/${author.handle}`;
    
    case 'reply':
    case 'mention':
    case 'quote':
      // Link to the reply/mention/quote post
      if (postId) {
        return `https://bsky.app/profile/${author.handle}/post/${postId}`;
      }
      return `https://bsky.app/profile/${author.handle}`;
    
    default:
      return `https://bsky.app/profile/${author.handle}`;
  }
}

/**
 * Get Finnish notification text based on reason
 */
function getNotificationText(notification: BlueskyNotification): { title: string; body: string } {
  const { author, reason, record } = notification;
  const displayName = author.displayName || author.handle;
  
  switch (reason) {
    case 'follow':
      return {
        title: 'Uusi seuraaja Blueskyssa',
        body: `${displayName} seuraa nyt sinua`,
      };
    
    case 'like':
      return {
        title: 'Tykkäys Blueskyssa',
        body: `${displayName} tykkäsi viestistäsi`,
      };
    
    case 'repost':
      return {
        title: 'Uudelleenjako Blueskyssa',
        body: `${displayName} jakoi viestisi uudelleen`,
      };
    
    case 'reply':
      const replyText = record?.text || '';
      const preview = replyText.length > 100 ? replyText.substring(0, 100) + '...' : replyText;
      return {
        title: 'Vastaus Blueskyssa',
        body: `${displayName}: ${preview}`,
      };
    
    case 'mention':
      const mentionText = record?.text || '';
      const mentionPreview = mentionText.length > 100 ? mentionText.substring(0, 100) + '...' : mentionText;
      return {
        title: 'Maininta Blueskyssa',
        body: `${displayName} mainitsi sinut: ${mentionPreview}`,
      };
    
    case 'quote':
      const quoteText = record?.text || '';
      const quotePreview = quoteText.length > 100 ? quoteText.substring(0, 100) + '...' : quoteText;
      return {
        title: 'Lainaus Blueskyssa',
        body: `${displayName} lainasi viestiäsi: ${quotePreview}`,
      };
    
    default:
      return {
        title: 'Bluesky-ilmoitus',
        body: `${displayName} - ${reason}`,
      };
  }
}

/**
 * Send notification to Novu
 */
async function sendToNovu(
  notification: BlueskyNotification,
  subscriberId: string
): Promise<void> {
  const { Novu } = require('@novu/node');
  
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const [apiKeyVersion] = await secretClient.accessSecretVersion({
    name: `projects/${project}/secrets/NOVU_API_KEY/versions/latest`,
  });
  const apiKey = apiKeyVersion.payload?.data?.toString() || '';
  
  if (!apiKey) {
    throw new Error('Missing Novu API key');
  }
  
  const backendUrl = process.env.NOVU_BACKEND_URL as string | undefined;
  const novu = new Novu(apiKey, ...(backendUrl ? [{ backendUrl }] : [{}] as any));
  
  const { title, body } = getNotificationText(notification);
  const url = generateBlueskyUrl(notification);
  
  await novu.trigger('bluesky-notification', {
    to: { subscriberId },
    payload: {
      title,
      body,
      url,
      reason: notification.reason,
      author: notification.author.handle,
      authorDisplayName: notification.author.displayName || notification.author.handle,
      authorAvatar: notification.author.avatar,
      timestamp: notification.indexedAt,
    },
  });
  
  functions.logger.info('Sent Bluesky notification to Novu', {
    subscriberId,
    reason: notification.reason,
    author: notification.author.handle,
  });
}

/**
 * Scheduled function to fetch and process Bluesky notifications
 * Runs every 5 minutes
 */
export const blueskyNotificationsFetcher = functions
  .runWith({
    timeoutSeconds: 120,
    memory: '256MB',
  })
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    const startTime = Date.now();
    
    try {
      functions.logger.info('Bluesky notifications fetcher triggered');
      
      // Get admin user ID (subscriber for notifications)
      const db = admin.firestore();
      const rolesSnapshot = await db.collection('roles')
        .where('role', '==', 'admin')
        .limit(1)
        .get();
      
      if (rolesSnapshot.empty) {
        functions.logger.warn('No admin user found');
        res.status(200).json({ ok: true, message: 'no_admin_user' });
        return;
      }
      
      const adminUid = rolesSnapshot.docs[0].id;
      
      // Get last cursor from Firestore
      const cursorDoc = await db.collection('system').doc('bluesky_notifications').get();
      const lastCursor = cursorDoc.data()?.cursor;
      
      // Fetch Bluesky credentials and create session
      const credentials = await fetchBlueskyCredentials();
      const session = await createBlueskySession(credentials);
      
      // Fetch notifications
      const notificationsData = await fetchBlueskyNotifications(session, lastCursor);
      
      functions.logger.info('Fetched Bluesky notifications', {
        count: notificationsData.notifications.length,
        cursor: notificationsData.cursor,
      });
      
      // Process only unread notifications
      const unreadNotifications = notificationsData.notifications.filter(n => !n.isRead);
      
      // Send each notification to Novu
      for (const notification of unreadNotifications) {
        try {
          await sendToNovu(notification, adminUid);
        } catch (error: any) {
          functions.logger.error('Failed to send notification to Novu', {
            error: error?.message,
            notificationUri: notification.uri,
          });
        }
      }
      
      // Update cursor in Firestore
      if (notificationsData.cursor) {
        await db.collection('system').doc('bluesky_notifications').set({
          cursor: notificationsData.cursor,
          lastFetchedAt: admin.firestore.FieldValue.serverTimestamp(),
          processedCount: unreadNotifications.length,
        }, { merge: true });
      }
      
      const duration = Date.now() - startTime;
      
      functions.logger.info('Bluesky notifications fetcher completed', {
        total: notificationsData.notifications.length,
        unread: unreadNotifications.length,
        duration,
      });
      
      res.status(200).json({
        ok: true,
        total: notificationsData.notifications.length,
        unread: unreadNotifications.length,
        duration,
      });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      functions.logger.error('Bluesky notifications fetcher failed', {
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
        duration,
      });
      
      res.status(500).json({
        error: 'fetcher_failed',
        detail: error?.message,
        duration,
      });
    }
  });
