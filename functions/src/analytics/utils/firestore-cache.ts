/**
 * Firestore Cache Management for Analytics
 * Ensures we only fetch from APIs once per day
 */

import * as admin from 'firebase-admin';
import { Platform, AnalyticsSnapshot, AnalyticsCache } from '../analytics-types';

const CACHE_COLLECTION = 'analytics_cache';
const SNAPSHOTS_COLLECTION = 'analytics_snapshots';

/**
 * Check if we need to fetch fresh data for a platform
 */
export async function shouldFetchPlatform(platform: Platform): Promise<boolean> {
  const db = admin.firestore();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  try {
    const cacheDoc = await db.collection(CACHE_COLLECTION).doc('latest').get();
    
    if (!cacheDoc.exists) {
      return true; // No cache, need to fetch
    }
    
    const cache = cacheDoc.data() as AnalyticsCache;
    const platformCache = cache.platforms?.[platform];
    
    if (!platformCache) {
      return true; // Platform not cached
    }
    
    if (platformCache.status === 'error') {
      return true; // Previous fetch failed, retry
    }
    
    // Check if we already fetched today
    const lastFetchDate = cache.lastFetchDate;
    return lastFetchDate !== today;
    
  } catch (error) {
    console.error('Error checking cache:', error);
    return true; // On error, fetch fresh data
  }
}

/**
 * Update cache after successful fetch
 */
export async function updateCache(
  platform: Platform,
  status: 'success' | 'error',
  error?: string
): Promise<void> {
  const db = admin.firestore();
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const cacheRef = db.collection(CACHE_COLLECTION).doc('latest');
    
    await cacheRef.set({
      lastFetchDate: today,
      [`platforms.${platform}`]: {
        lastFetch: admin.firestore.FieldValue.serverTimestamp(),
        status,
        ...(error && { error }),
      },
    }, { merge: true });
    
  } catch (err) {
    console.error('Error updating cache:', err);
  }
}

/**
 * Store analytics snapshot in Firestore
 */
export async function storeSnapshot(snapshot: Omit<AnalyticsSnapshot, 'fetchedAt'>): Promise<void> {
  const db = admin.firestore();
  
  try {
    const docId = `${snapshot.platform}_${snapshot.date}`;
    
    await db.collection(SNAPSHOTS_COLLECTION).doc(docId).set({
      ...snapshot,
      fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
  } catch (error) {
    console.error('Error storing snapshot:', error);
    throw error;
  }
}

/**
 * Get analytics snapshots for a date range
 */
export async function getSnapshots(
  platform: Platform,
  startDate: string,
  endDate: string
): Promise<AnalyticsSnapshot[]> {
  const db = admin.firestore();
  
  try {
    const snapshot = await db.collection(SNAPSHOTS_COLLECTION)
      .where('platform', '==', platform)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'asc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as AnalyticsSnapshot);
    
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return [];
  }
}

/**
 * Get all snapshots for all platforms in date range
 */
export async function getAllSnapshots(
  startDate: string,
  endDate: string
): Promise<AnalyticsSnapshot[]> {
  const db = admin.firestore();
  
  try {
    const snapshot = await db.collection(SNAPSHOTS_COLLECTION)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'asc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as AnalyticsSnapshot);
    
  } catch (error) {
    console.error('Error fetching all snapshots:', error);
    return [];
  }
}
