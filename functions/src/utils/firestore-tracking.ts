import * as functions from 'firebase-functions/v1';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { SocialPlatform } from './social-media-utils';

/**
 * Social share record structure
 */
export interface SocialShare {
  platform: SocialPlatform;
  sharedAt: FirebaseFirestore.Timestamp;
  postId: string;
  postUrl?: string | null;
  text: string;
  characterCount: number;
  success: boolean;
  error?: string;
}

/**
 * Social share statistics
 */
export interface SocialShareStats {
  totalShares: number;
  lastSharedAt: FirebaseFirestore.Timestamp;
  sharesByPlatform: {
    [key in SocialPlatform]?: {
      count: number;
      lastSharedAt: FirebaseFirestore.Timestamp;
      lastPostId?: string;
    };
  };
}

/**
 * Track a social media share in Firestore
 * Creates a document in the socialShares subcollection of the content document
 */
export async function trackSocialShare(
  contentCollection: 'listings' | 'blog_posts',
  contentId: string,
  platform: SocialPlatform,
  shareData: {
    postId: string;
    postUrl?: string;
    text: string;
    characterCount: number;
    success: boolean;
    error?: string;
  }
): Promise<void> {
  const db = getFirestore();
  
  try {
    const contentRef = db.collection(contentCollection).doc(contentId);
    const socialSharesRef = contentRef.collection('socialShares');
    
    // Create share record (filter out undefined values)
    const shareRecord: any = {
      platform,
      sharedAt: FieldValue.serverTimestamp(),
      postId: shareData.postId,
      text: shareData.text,
      characterCount: shareData.characterCount,
      success: shareData.success,
    };
    
    // Only add optional fields if they have values
    if (shareData.postUrl !== undefined) {
      shareRecord.postUrl = shareData.postUrl;
    }
    if (shareData.error !== undefined) {
      shareRecord.error = shareData.error;
    }
    
    // Add to subcollection
    await socialSharesRef.add(shareRecord);
    
    // Update parent document statistics
    const statsUpdate: any = {
      'socialShareStats.totalShares': FieldValue.increment(1),
      'socialShareStats.lastSharedAt': FieldValue.serverTimestamp(),
      [`socialShareStats.sharesByPlatform.${platform}.count`]: FieldValue.increment(1),
      [`socialShareStats.sharesByPlatform.${platform}.lastSharedAt`]: FieldValue.serverTimestamp(),
    };
    
    if (shareData.success && shareData.postId) {
      statsUpdate[`socialShareStats.sharesByPlatform.${platform}.lastPostId`] = shareData.postId;
    }
    
    await contentRef.update(statsUpdate);
    
    functions.logger.info('Social share tracked', {
      contentCollection,
      contentId,
      platform,
      success: shareData.success,
    });
    
  } catch (error: any) {
    functions.logger.error('Failed to track social share', {
      error: error?.message,
      contentCollection,
      contentId,
      platform,
    });
    // Don't throw - tracking failure shouldn't fail the share
  }
}

/**
 * Get social share statistics for content
 */
export async function getSocialShareStats(
  contentCollection: 'listings' | 'content',
  contentId: string
): Promise<SocialShareStats | null> {
  const db = getFirestore();
  
  try {
    const contentRef = db.collection(contentCollection).doc(contentId);
    const doc = await contentRef.get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data();
    return data?.socialShareStats || null;
    
  } catch (error: any) {
    functions.logger.error('Failed to get social share stats', {
      error: error?.message,
      contentCollection,
      contentId,
    });
    return null;
  }
}

/**
 * Get recent shares for content
 */
export async function getRecentShares(
  contentCollection: 'listings' | 'content',
  contentId: string,
  limit: number = 10
): Promise<SocialShare[]> {
  const db = getFirestore();
  
  try {
    const contentRef = db.collection(contentCollection).doc(contentId);
    const socialSharesRef = contentRef.collection('socialShares');
    
    const snapshot = await socialSharesRef
      .orderBy('sharedAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as SocialShare);
    
  } catch (error: any) {
    functions.logger.error('Failed to get recent shares', {
      error: error?.message,
      contentCollection,
      contentId,
    });
    return [];
  }
}

/**
 * Check if content was recently shared on platform (within last 24 hours)
 */
export async function wasRecentlyShared(
  contentCollection: 'listings' | 'content',
  contentId: string,
  platform: SocialPlatform,
  hoursAgo: number = 24
): Promise<boolean> {
  const db = getFirestore();
  
  try {
    const contentRef = db.collection(contentCollection).doc(contentId);
    const socialSharesRef = contentRef.collection('socialShares');
    
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursAgo);
    
    const snapshot = await socialSharesRef
      .where('platform', '==', platform)
      .where('success', '==', true)
      .where('sharedAt', '>', cutoffTime)
      .limit(1)
      .get();
    
    return !snapshot.empty;
    
  } catch (error: any) {
    functions.logger.error('Failed to check recent shares', {
      error: error?.message,
      contentCollection,
      contentId,
      platform,
    });
    return false;
  }
}
