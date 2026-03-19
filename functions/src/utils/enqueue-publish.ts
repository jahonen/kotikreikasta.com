import * as functions from 'firebase-functions/v1';
import { PubSub } from '@google-cloud/pubsub';
import { SocialPlatform } from './social-media-utils';

const pubsub = new PubSub();

/**
 * Message structure for social media publishing queue
 * One message per content piece - all platforms consume it
 */
export interface PublishQueueMessage {
  contentType: 'listing' | 'blog';
  contentId: string;
  contentCollection: 'listings' | 'blog_posts';
  title: string;
  description: string;
  url: string;
  metadata?: {
    location?: string;
    price?: number;
    area?: number;
    bedrooms?: number;
    [key: string]: any;
  };
}

/**
 * Enqueue content for publishing to all social media platforms
 * Publishes ONE message that all platform consumers will process
 */
export async function enqueuePublish(
  message: PublishQueueMessage
): Promise<string> {
  const topicName = 'social-media-publishing';
  
  try {
    functions.logger.info('Enqueueing publish message for all platforms', {
      contentType: message.contentType,
      contentId: message.contentId,
    });
    
    const dataBuffer = Buffer.from(JSON.stringify(message));
    const messageId = await pubsub.topic(topicName).publish(dataBuffer);
    
    functions.logger.info('Message enqueued successfully', {
      messageId,
      contentId: message.contentId,
    });
    
    return messageId;
    
  } catch (error: any) {
    functions.logger.error('Failed to enqueue publish message', {
      error: error?.message,
      contentId: message.contentId,
    });
    throw new Error(`enqueue_failed: ${error?.message}`);
  }
}

/**
 * Enqueue content for publishing - returns message IDs for tracking
 * Note: This publishes ONE message, but returns the same messageId for all platforms for compatibility
 */
export async function enqueuePublishMultiple(
  platforms: SocialPlatform[],
  content: PublishQueueMessage
): Promise<Record<SocialPlatform, string>> {
  try {
    const messageId = await enqueuePublish(content);
    
    // Return same messageId for all platforms since they all consume the same message
    const results: Record<string, string> = {};
    for (const platform of platforms) {
      results[platform] = messageId;
    }
    
    return results as Record<SocialPlatform, string>;
    
  } catch (error: any) {
    functions.logger.error('Failed to enqueue for platforms', {
      error: error?.message,
      contentId: content.contentId,
    });
    
    // Return error for all platforms
    const results: Record<string, string> = {};
    for (const platform of platforms) {
      results[platform] = `error: ${error?.message}`;
    }
    
    return results as Record<SocialPlatform, string>;
  }
}
