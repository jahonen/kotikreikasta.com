import * as functions from 'firebase-functions/v1';
import { isAlreadyPosted } from '../utils/deduplication';

interface PublishRequest {
  contentId: string;
  platform: 'facebook' | 'instagram' | 'x' | 'bluesky' | 'threads';
  contentType: 'blog' | 'listing';
  contentCollection: 'blog_posts' | 'listings';
}

/**
 * Unified publisher function that handles all social media platforms
 * Triggered by Cloud Tasks
 */
export const socialMediaPublisher = functions
  .runWith({
    timeoutSeconds: 180,
    memory: '512MB',
  })
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Validate request method
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }
      
      // Parse request body
      const payload: PublishRequest = req.body;
      
      // Validate payload
      if (!payload.contentId || !payload.platform || !payload.contentType || !payload.contentCollection) {
        functions.logger.error('Invalid payload', { payload });
        res.status(400).send('Invalid payload');
        return;
      }
      
      functions.logger.info('Publisher started', {
        contentId: payload.contentId,
        platform: payload.platform,
        contentType: payload.contentType,
      });
      
      // Get current window start (approximate - within last hour)
      const now = new Date();
      const windowStart = new Date(now);
      windowStart.setMinutes(0, 0, 0);
      
      // Check if already posted (idempotency)
      const alreadyPosted = await isAlreadyPosted(
        payload.contentId,
        payload.contentCollection,
        payload.platform,
        windowStart
      );
      
      if (alreadyPosted) {
        functions.logger.info('Content already posted in this window', {
          contentId: payload.contentId,
          platform: payload.platform,
          windowStart: windowStart.toISOString(),
        });
        res.status(200).send('Already posted');
        return;
      }
      
      // Route to platform-specific publisher
      let result: any;
      switch (payload.platform) {
        case 'facebook':
          result = await publishToFacebook(payload);
          break;
        case 'instagram':
          result = await publishToInstagram(payload);
          break;
        case 'x':
          result = await publishToX(payload);
          break;
        case 'bluesky':
          result = await publishToBluesky(payload);
          break;
        case 'threads':
          result = await publishToThreads(payload);
          break;
        default:
          throw new Error(`Unknown platform: ${payload.platform}`);
      }
      
      const duration = Date.now() - startTime;
      
      functions.logger.info('Publisher completed', {
        contentId: payload.contentId,
        platform: payload.platform,
        success: result.success,
        duration,
      });
      
      res.status(200).json({
        success: result.success,
        postId: result.postId,
        postUrl: result.postUrl,
        duration,
      });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      functions.logger.error('Publisher failed', {
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
        duration,
      });
      
      res.status(500).json({
        error: 'publisher_failed',
        detail: error?.message,
        duration,
      });
    }
  });

/**
 * Publish to Facebook
 */
async function publishToFacebook(payload: PublishRequest): Promise<any> {
  // Import the existing Facebook publisher logic
  const { publishToFacebookInternal } = require('./internal-publishers');
  
  // Create a mock Pub/Sub message for compatibility
  const mockMessage = {
    json: {
      contentType: payload.contentType,
      contentId: payload.contentId,
      contentCollection: payload.contentCollection,
    },
  };
  
  return await publishToFacebookInternal(mockMessage);
}

/**
 * Publish to Instagram
 */
async function publishToInstagram(payload: PublishRequest): Promise<any> {
  const { publishToInstagramInternal } = require('./internal-publishers');
  
  const mockMessage = {
    json: {
      contentType: payload.contentType,
      contentId: payload.contentId,
      contentCollection: payload.contentCollection,
    },
  };
  
  return await publishToInstagramInternal(mockMessage);
}

/**
 * Publish to X (Twitter)
 */
async function publishToX(payload: PublishRequest): Promise<any> {
  const { publishToXInternal } = require('./internal-publishers');
  
  const mockMessage = {
    json: {
      contentType: payload.contentType,
      contentId: payload.contentId,
      contentCollection: payload.contentCollection,
    },
  };
  
  return await publishToXInternal(mockMessage);
}

/**
 * Publish to Bluesky
 */
async function publishToBluesky(payload: PublishRequest): Promise<any> {
  const { publishToBlueskyInternal } = require('./internal-publishers');
  
  const mockMessage = {
    json: {
      contentType: payload.contentType,
      contentId: payload.contentId,
      contentCollection: payload.contentCollection,
    },
  };
  
  return await publishToBlueskyInternal(mockMessage);
}

/**
 * Publish to Threads
 */
async function publishToThreads(payload: PublishRequest): Promise<any> {
  const { publishToThreadsInternal } = require('./internal-publishers');
  
  const mockMessage = {
    json: {
      contentType: payload.contentType,
      contentId: payload.contentId,
      contentCollection: payload.contentCollection,
    },
  };
  
  return await publishToThreadsInternal(mockMessage);
}
