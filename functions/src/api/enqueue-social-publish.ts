import * as functions from 'firebase-functions/v1';
import { enqueuePublishMultiple, PublishQueueMessage } from '../utils/enqueue-publish';
import { SocialPlatform } from '../utils/social-media-utils';

/**
 * HTTP endpoint to enqueue content for social media publishing
 * 
 * POST /enqueueSocialPublish
 * 
 * Body:
 * {
 *   platforms: ['bluesky', 'x', 'facebook', 'threads'], // or single platform
 *   contentType: 'listing' | 'blog',
 *   contentId: string,
 *   contentCollection: 'listings' | 'content',
 *   title: string,
 *   description: string,
 *   url: string,
 *   metadata?: { ... }
 * }
 */
export const enqueueSocialPublish = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    try {
      // Validate method
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'method_not_allowed' });
        return;
      }
      
      const {
        platforms,
        contentType,
        contentId,
        contentCollection,
        title,
        description,
        url,
        metadata,
      } = req.body;
      
      // Validate required fields
      if (!platforms || !contentType || !contentId || !contentCollection || !title || !description || !url) {
        res.status(400).json({
          error: 'missing_required_fields',
          required: ['platforms', 'contentType', 'contentId', 'contentCollection', 'title', 'description', 'url'],
        });
        return;
      }
      
      // Validate content type
      if (contentType !== 'listing' && contentType !== 'blog') {
        res.status(400).json({ 
          error: 'invalid_content_type', 
          allowed: ['listing', 'blog'] 
        });
        return;
      }
      
      // Validate content collection
      if (contentCollection !== 'listings' && contentCollection !== 'blog_posts') {
        res.status(400).json({ 
          error: 'invalid_content_collection', 
          allowed: ['listings', 'blog_posts'] 
        });
        return;
      }
      
      // Normalize platforms to array (for tracking only - we publish one message)
      const platformArray: SocialPlatform[] = Array.isArray(platforms) ? platforms : [platforms];
      
      // Validate platforms
      const validPlatforms: SocialPlatform[] = ['bluesky', 'x', 'facebook', 'threads'];
      const invalidPlatforms = platformArray.filter(p => !validPlatforms.includes(p));
      if (invalidPlatforms.length > 0) {
        res.status(400).json({
          error: 'invalid_platforms',
          invalid: invalidPlatforms,
          allowed: validPlatforms,
        });
        return;
      }
      
      functions.logger.info('Enqueuing social publish (one message, all platforms consume)', {
        platforms: platformArray,
        contentType,
        contentId,
      });
      
      // Prepare content message
      const content: PublishQueueMessage = {
        contentType,
        contentId,
        contentCollection,
        title,
        description,
        url,
        metadata,
      };
      
      // Enqueue (publishes ONE message that all platforms will consume)
      const messageIds = await enqueuePublishMultiple(platformArray, content);
      
      functions.logger.info('Social publish enqueued', {
        contentId,
        platforms: platformArray,
        messageIds,
      });
      
      res.status(200).json({
        ok: true,
        message: 'Content enqueued for publishing',
        contentId,
        platforms: platformArray,
        messageIds,
      });
      
    } catch (error: any) {
      functions.logger.error('Failed to enqueue social publish', {
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
      });
      
      res.status(500).json({
        error: 'enqueue_failed',
        detail: error?.message,
      });
    }
  });
