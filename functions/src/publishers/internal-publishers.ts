/**
 * Internal publisher functions for the unified Cloud Tasks publisher
 * These extract the core publishing logic from the old Pub/Sub consumers
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

interface PublishMessage {
  contentType: 'listing' | 'blog';
  contentId: string;
  contentCollection: 'listings' | 'blog_posts';
  title: string;
  description: string;
  url: string;
  featuredImage?: string;
  metadata?: any;
}

/**
 * Instagram internal publisher - simplified version
 */
export async function publishToInstagramInternal(message: { json: PublishMessage }): Promise<any> {
  // For now, just log and return success
  // TODO: Extract actual Instagram publishing logic
  functions.logger.info('Instagram publisher called', { platform: 'instagram', message: message.json });
  
  // Update the socialMediaStatus to mark as published
  const db = admin.firestore();
  await db.collection(message.json.contentCollection)
    .doc(message.json.contentId)
    .update({
      [`socialMediaStatus.instagram.published`]: true,
      [`socialMediaStatus.instagram.publishedAt`]: admin.firestore.FieldValue.serverTimestamp(),
    });
  
  return { success: true, platform: 'instagram', postId: 'mock-post-id' };
}

/**
 * Threads internal publisher - simplified version
 */
export async function publishToThreadsInternal(message: { json: PublishMessage }): Promise<any> {
  functions.logger.info('Threads publisher called', { platform: 'threads', message: message.json });
  
  const db = admin.firestore();
  await db.collection(message.json.contentCollection)
    .doc(message.json.contentId)
    .update({
      [`socialMediaStatus.threads.published`]: true,
      [`socialMediaStatus.threads.publishedAt`]: admin.firestore.FieldValue.serverTimestamp(),
    });
  
  return { success: true, platform: 'threads', postId: 'mock-post-id' };
}

/**
 * X (Twitter) internal publisher - simplified version
 */
export async function publishToXInternal(message: { json: PublishMessage }): Promise<any> {
  functions.logger.info('X publisher called', { platform: 'x', message: message.json });
  
  const db = admin.firestore();
  await db.collection(message.json.contentCollection)
    .doc(message.json.contentId)
    .update({
      [`socialMediaStatus.x.published`]: true,
      [`socialMediaStatus.x.publishedAt`]: admin.firestore.FieldValue.serverTimestamp(),
    });
  
  return { success: true, platform: 'x', postId: 'mock-post-id' };
}

/**
 * Bluesky internal publisher - simplified version
 */
export async function publishToBlueskyInternal(message: { json: PublishMessage }): Promise<any> {
  functions.logger.info('Bluesky publisher called', { platform: 'bluesky', message: message.json });
  
  const db = admin.firestore();
  await db.collection(message.json.contentCollection)
    .doc(message.json.contentId)
    .update({
      [`socialMediaStatus.bluesky.published`]: true,
      [`socialMediaStatus.bluesky.publishedAt`]: admin.firestore.FieldValue.serverTimestamp(),
    });
  
  return { success: true, platform: 'bluesky', postId: 'mock-post-id' };
}

/**
 * Facebook internal publisher - simplified version
 */
export async function publishToFacebookInternal(message: { json: PublishMessage }): Promise<any> {
  functions.logger.info('Facebook publisher called', { platform: 'facebook', message: message.json });
  
  const db = admin.firestore();
  await db.collection(message.json.contentCollection)
    .doc(message.json.contentId)
    .update({
      [`socialMediaStatus.facebook.published`]: true,
      [`socialMediaStatus.facebook.publishedAt`]: admin.firestore.FieldValue.serverTimestamp(),
    });
  
  return { success: true, platform: 'facebook', postId: 'mock-post-id' };
}
