/**
 * Internal publisher functions for the unified Cloud Tasks publisher
 * These reuse the exported helpers from the existing Pub/Sub consumers
 * and add Firestore content fetching since Cloud Tasks only carry minimal payloads.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { 
  ContentType, 
  SocialPlatform,
  buildTrackedURL, 
  retryWithBackoff 
} from '../utils/social-media-utils';
import { 
  ContentInput, 
  generateSocialContent, 
  formatPostWithLink 
} from '../utils/vertex-ai-content';
import { trackSocialShare } from '../utils/firestore-tracking';
import { ensureSquareCrop } from '../utils/image-auto-crop';

// Platform-specific helpers (exported from consumers)
import { fetchInstagramCredentials, postToInstagram } from '../consumers/instagram-pubsub';
import { fetchFacebookCredentials, getPageAccessToken, postToFacebook } from '../consumers/facebook-pubsub';
import { fetchBlueskyCredentials, createSession, postToBluesky } from '../consumers/bluesky-pubsub';
import { fetchXCredentials, postToX } from '../consumers/x-pubsub';
import { fetchThreadsCredentials, postToThreads } from '../consumers/threads-pubsub';

interface PublishPayload {
  contentType: 'listing' | 'blog';
  contentId: string;
  contentCollection: 'listings' | 'blog_posts';
}

interface ContentData {
  title: string;
  description: string;
  url: string;
  featuredImage?: any;
  metadata?: any;
}

/**
 * Fetch content details from Firestore
 * The Cloud Task only carries contentId/collection, so we need to load the full document
 */
async function fetchContentFromFirestore(
  contentCollection: string,
  contentId: string,
  contentType: string
): Promise<ContentData> {
  const db = admin.firestore();
  const doc = await db.collection(contentCollection).doc(contentId).get();
  
  if (!doc.exists) {
    throw new Error(`Content not found: ${contentCollection}/${contentId}`);
  }
  
  const data = doc.data()!;
  
  const title = data.socialMediaMetadata?.title || data.title || '';
  const description = data.socialMediaMetadata?.description || data.description || data.contentMd?.substring(0, 500) || '';
  const url = data.socialMediaUrl || '';
  const featuredImage = data.featuredImage || data.images?.[0] || null;
  
  // Build metadata from document fields
  const metadata: any = { ...data.socialMediaMetadata };
  if (data.location) metadata.location = data.location;
  if (data.price !== undefined) metadata.price = data.price;
  if (data.area !== undefined) metadata.area = data.area;
  if (data.bedrooms !== undefined) metadata.bedrooms = data.bedrooms;
  if (data.propertyType) metadata.propertyType = data.propertyType;
  if (data.categories) metadata.categories = data.categories;
  if (data.readTime !== undefined) metadata.readTime = data.readTime;
  
  if (!title || !url) {
    throw new Error(`Missing required content fields: title=${!!title}, url=${!!url}`);
  }
  
  return { title, description, url, featuredImage, metadata };
}

/**
 * Mark content as published on a platform and track the share
 */
async function markAsPublished(
  contentCollection: string,
  contentId: string,
  platform: string,
  postId: string,
  postUrl: string | undefined,
  text: string
): Promise<void> {
  const db = admin.firestore();
  
  // Track in socialShares subcollection
  await trackSocialShare(
    contentCollection as 'listings' | 'blog_posts',
    contentId,
    platform as SocialPlatform,
    {
      postId,
      postUrl,
      text,
      characterCount: text.length,
      success: true,
    }
  );
  
  // Update socialMediaStatus on the content document
  await db.collection(contentCollection).doc(contentId).update({
    [`socialMediaStatus.${platform}.published`]: true,
    [`socialMediaStatus.${platform}.publishedAt`]: admin.firestore.FieldValue.serverTimestamp(),
    [`socialMediaStatus.${platform}.postId`]: postId,
    [`socialMediaStatus.${platform}.postUrl`]: postUrl || '',
  });
}

/**
 * Track a failed publish attempt
 */
async function trackFailure(
  contentCollection: string,
  contentId: string,
  platform: string,
  errorMessage: string
): Promise<void> {
  try {
    await trackSocialShare(
      contentCollection as 'listings' | 'blog_posts',
      contentId,
      platform as SocialPlatform,
      {
        postId: '',
        text: '',
        characterCount: 0,
        success: false,
        error: errorMessage,
      }
    );
  } catch (trackError: any) {
    functions.logger.error('Failed to track publish failure', {
      platform,
      contentId,
      trackError: trackError?.message,
    });
  }
}

/**
 * Instagram internal publisher
 */
export async function publishToInstagramInternal(message: { json: PublishPayload }): Promise<any> {
  const { contentType, contentId, contentCollection } = message.json;
  
  try {
    const content = await fetchContentFromFirestore(contentCollection, contentId, contentType);
    
    functions.logger.info('Instagram publish started', { contentType, contentId, title: content.title });
    
    const trackedUrl = buildTrackedURL(content.url, 'instagram', contentType as ContentType, contentId);
    
    const contentInput: ContentInput = {
      type: contentType,
      title: content.title,
      description: content.description,
      url: trackedUrl,
      metadata: content.metadata,
    };
    
    const generatedContent = await retryWithBackoff(
      () => generateSocialContent(contentInput, 'instagram', trackedUrl),
      undefined,
      'Vertex AI content generation'
    );
    
    const finalCaption = generatedContent.text;
    
    // Ensure 1:1 image exists (auto-generate if needed)
    const imageUrl = await retryWithBackoff(
      () => ensureSquareCrop(content.featuredImage, contentCollection, contentId),
      undefined,
      'Ensure 1:1 image crop'
    );
    
    functions.logger.info('Instagram image ready', { imageUrl: imageUrl.substring(0, 100) });
    
    const credentials = await retryWithBackoff(
      () => fetchInstagramCredentials(),
      undefined,
      'Fetch Instagram credentials'
    );
    
    const { postId, postUrl } = await retryWithBackoff(
      () => postToInstagram(finalCaption, imageUrl, credentials),
      undefined,
      'Post to Instagram'
    );
    
    await markAsPublished(contentCollection, contentId, 'instagram', postId, postUrl, finalCaption);
    
    functions.logger.info('Instagram publish successful', { contentId, postId, postUrl });
    
    return { success: true, platform: 'instagram', postId, postUrl };
    
  } catch (error: any) {
    functions.logger.error('Instagram publish failed', {
      error: error?.message,
      stack: error?.stack?.substring(0, 500),
      contentId,
    });
    await trackFailure(contentCollection, contentId, 'instagram', error?.message);
    throw error;
  }
}

/**
 * Facebook internal publisher
 */
export async function publishToFacebookInternal(message: { json: PublishPayload }): Promise<any> {
  const { contentType, contentId, contentCollection } = message.json;
  
  try {
    const content = await fetchContentFromFirestore(contentCollection, contentId, contentType);
    
    functions.logger.info('Facebook publish started', { contentType, contentId, title: content.title });
    
    const trackedUrl = buildTrackedURL(content.url, 'facebook', contentType as ContentType, contentId);
    
    const contentInput: ContentInput = {
      type: contentType,
      title: content.title,
      description: content.description,
      url: trackedUrl,
      metadata: content.metadata,
    };
    
    const generatedContent = await retryWithBackoff(
      () => generateSocialContent(contentInput, 'facebook', trackedUrl),
      undefined,
      'Vertex AI content generation'
    );
    
    const credentials = await retryWithBackoff(
      () => fetchFacebookCredentials(),
      undefined,
      'Fetch Facebook credentials'
    );
    
    const pageAccessToken = await retryWithBackoff(
      () => getPageAccessToken(credentials.pageId, credentials.systemToken),
      undefined,
      'Get Page Access Token'
    );
    
    const { postId, postUrl } = await retryWithBackoff(
      () => postToFacebook(generatedContent.text, trackedUrl, credentials.pageId, pageAccessToken),
      undefined,
      'Post to Facebook'
    );
    
    await markAsPublished(contentCollection, contentId, 'facebook', postId, postUrl, generatedContent.text);
    
    functions.logger.info('Facebook publish successful', { contentId, postId, postUrl });
    
    return { success: true, platform: 'facebook', postId, postUrl };
    
  } catch (error: any) {
    functions.logger.error('Facebook publish failed', {
      error: error?.message,
      stack: error?.stack?.substring(0, 500),
      contentId,
    });
    await trackFailure(contentCollection, contentId, 'facebook', error?.message);
    throw error;
  }
}

/**
 * Bluesky internal publisher
 */
export async function publishToBlueskyInternal(message: { json: PublishPayload }): Promise<any> {
  const { contentType, contentId, contentCollection } = message.json;
  
  try {
    const content = await fetchContentFromFirestore(contentCollection, contentId, contentType);
    
    functions.logger.info('Bluesky publish started', { contentType, contentId, title: content.title });
    
    const trackedUrl = buildTrackedURL(content.url, 'bluesky', contentType as ContentType, contentId);
    
    const contentInput: ContentInput = {
      type: contentType,
      title: content.title,
      description: content.description,
      url: trackedUrl,
      metadata: content.metadata,
    };
    
    const generatedContent = await retryWithBackoff(
      () => generateSocialContent(contentInput, 'bluesky', trackedUrl),
      undefined,
      'Vertex AI content generation'
    );
    
    const finalPost = formatPostWithLink(generatedContent.text, trackedUrl, 'bluesky');
    
    const credentials = await retryWithBackoff(
      () => fetchBlueskyCredentials(),
      undefined,
      'Fetch Bluesky credentials'
    );
    
    const accessToken = await retryWithBackoff(
      () => createSession(credentials),
      undefined,
      'Create Bluesky session'
    );
    
    const { postId, postUrl } = await retryWithBackoff(
      () => postToBluesky(finalPost, trackedUrl, accessToken, credentials.identifier),
      undefined,
      'Post to Bluesky'
    );
    
    await markAsPublished(contentCollection, contentId, 'bluesky', postId, postUrl, finalPost);
    
    functions.logger.info('Bluesky publish successful', { contentId, postId, postUrl });
    
    return { success: true, platform: 'bluesky', postId, postUrl };
    
  } catch (error: any) {
    functions.logger.error('Bluesky publish failed', {
      error: error?.message,
      stack: error?.stack?.substring(0, 500),
      contentId,
    });
    await trackFailure(contentCollection, contentId, 'bluesky', error?.message);
    throw error;
  }
}

/**
 * X (Twitter) internal publisher
 */
export async function publishToXInternal(message: { json: PublishPayload }): Promise<any> {
  const { contentType, contentId, contentCollection } = message.json;
  
  try {
    const content = await fetchContentFromFirestore(contentCollection, contentId, contentType);
    
    functions.logger.info('X publish started', { contentType, contentId, title: content.title });
    
    const trackedUrl = buildTrackedURL(content.url, 'x', contentType as ContentType, contentId);
    
    const contentInput: ContentInput = {
      type: contentType,
      title: content.title,
      description: content.description,
      url: trackedUrl,
      metadata: content.metadata,
    };
    
    const generatedContent = await retryWithBackoff(
      () => generateSocialContent(contentInput, 'x', trackedUrl),
      undefined,
      'Vertex AI content generation'
    );
    
    const finalPost = formatPostWithLink(generatedContent.text, trackedUrl, 'x');
    
    const credentials = await retryWithBackoff(
      () => fetchXCredentials(),
      undefined,
      'Fetch X credentials'
    );
    
    const { postId, postUrl } = await retryWithBackoff(
      () => postToX(finalPost, credentials),
      undefined,
      'Post to X'
    );
    
    await markAsPublished(contentCollection, contentId, 'x', postId, postUrl, finalPost);
    
    functions.logger.info('X publish successful', { contentId, postId, postUrl });
    
    return { success: true, platform: 'x', postId, postUrl };
    
  } catch (error: any) {
    functions.logger.error('X publish failed', {
      error: error?.message,
      stack: error?.stack?.substring(0, 500),
      contentId,
    });
    await trackFailure(contentCollection, contentId, 'x', error?.message);
    throw error;
  }
}

/**
 * Threads internal publisher
 */
export async function publishToThreadsInternal(message: { json: PublishPayload }): Promise<any> {
  const { contentType, contentId, contentCollection } = message.json;
  
  try {
    const content = await fetchContentFromFirestore(contentCollection, contentId, contentType);
    
    functions.logger.info('Threads publish started', { contentType, contentId, title: content.title });
    
    const trackedUrl = buildTrackedURL(content.url, 'threads', contentType as ContentType, contentId);
    
    const contentInput: ContentInput = {
      type: contentType,
      title: content.title,
      description: content.description,
      url: trackedUrl,
      metadata: content.metadata,
    };
    
    const generatedContent = await retryWithBackoff(
      () => generateSocialContent(contentInput, 'threads', trackedUrl),
      undefined,
      'Vertex AI content generation'
    );
    
    // Don't include URL in text - it will be shown in the link preview card
    const finalText = generatedContent.text;
    
    const credentials = await retryWithBackoff(
      () => fetchThreadsCredentials(),
      undefined,
      'Fetch Threads credentials'
    );
    
    const { postId, postUrl } = await retryWithBackoff(
      () => postToThreads(finalText, trackedUrl, credentials),
      undefined,
      'Post to Threads'
    );
    
    await markAsPublished(contentCollection, contentId, 'threads', postId, postUrl, finalText);
    
    functions.logger.info('Threads publish successful', { contentId, postId, postUrl });
    
    return { success: true, platform: 'threads', postId, postUrl };
    
  } catch (error: any) {
    functions.logger.error('Threads publish failed', {
      error: error?.message,
      stack: error?.stack?.substring(0, 500),
      contentId,
    });
    await trackFailure(contentCollection, contentId, 'threads', error?.message);
    throw error;
  }
}
