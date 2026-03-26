import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

// Lazy initialization to avoid order issues
function getDb() {
  return admin.firestore();
}

/**
 * Firestore trigger: When a blog post is published, mark it as ready for social media publishing
 */
export const onBlogPostPublished = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .region('europe-west1')
  .firestore.document('blog_posts/{contentId}')
  .onWrite(async (change, context) => {
    const contentId = context.params.contentId;
    const before = change.before.data();
    const after = change.after.data();
    
    // Only trigger when status changes to 'published'
    if (before?.status === 'published' || after?.status !== 'published') {
      functions.logger.info('Skipping - not a new publish event', { contentId, status: after?.status });
      return;
    }
    
    try {
      functions.logger.info('Blog post published, marking for social media', {
        contentId,
        title: after?.title,
      });
      
      // Build content URL
      const urlStub = after?.urlStub || contentId;
      const url = `https://kotikreikasta.com/blog/${urlStub}`;
      
      // Mark as ready for publishing on all platforms
      const socialMediaStatus = {
        bluesky: { published: false, queued: true, queuedAt: admin.firestore.FieldValue.serverTimestamp() },
        x: { published: false, queued: true, queuedAt: admin.firestore.FieldValue.serverTimestamp() },
        facebook: { published: false, queued: true, queuedAt: admin.firestore.FieldValue.serverTimestamp() },
        threads: { published: false, queued: true, queuedAt: admin.firestore.FieldValue.serverTimestamp() },
        instagram: { published: false, queued: true, queuedAt: admin.firestore.FieldValue.serverTimestamp() },
      };
      
      // Build metadata, filtering out undefined values
      const metadata: any = {
        title: after?.title || 'Blogiartikkeli',
        description: after?.contentMd?.substring(0, 500) || '',
        categories: after?.categories || [],
      };
      if (after?.readTime !== undefined) {
        metadata.readTime = after.readTime;
      }
      
      await getDb().collection('blog_posts').doc(contentId).update({
        socialMediaStatus,
        socialMediaUrl: url,
        socialMediaMetadata: metadata,
      });
      
      functions.logger.info('Blog post marked for social media publishing', {
        contentId,
        platforms: ['bluesky', 'x', 'facebook', 'threads', 'instagram'],
      });
      
    } catch (error: any) {
      functions.logger.error('Failed to mark blog post for publishing', {
        error: error?.message,
        contentId,
      });
      throw error;
    }
  });

/**
 * Firestore trigger: When a listing is published, mark it as ready for social media publishing
 */
export const onListingPublished = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .region('europe-west1')
  .firestore.document('listings/{listingId}')
  .onWrite(async (change, context) => {
    const listingId = context.params.listingId;
    const before = change.before.data();
    const after = change.after.data();
    
    // Only trigger when status changes to 'published' or 'active'
    const publishedStatuses = ['published', 'active'];
    const wasPublished = before?.status && publishedStatuses.includes(before.status);
    const isPublished = after?.status && publishedStatuses.includes(after.status);
    
    if (wasPublished || !isPublished) {
      functions.logger.info('Skipping - not a new publish event', { listingId, status: after?.status });
      return;
    }
    
    try {
      functions.logger.info('Listing published, marking for social media', {
        listingId,
        title: after?.title,
      });
      
      // Build listing URL
      const urlStub = after?.urlStub || listingId;
      const url = `https://kotikreikasta.com/listings/${urlStub}`;
      
      // Build description from listing data if not present
      let description = after?.description || '';
      if (!description && after?.location) {
        const parts = [];
        if (after.bedrooms) parts.push(`${after.bedrooms} makuuhuonetta`);
        if (after.area) parts.push(`${after.area} m²`);
        if (after.location?.locality) parts.push(after.location.locality);
        if (after.location?.administrative_area_level_1) parts.push(after.location.administrative_area_level_1);
        description = parts.join(', ');
      }
      if (!description) {
        description = 'Kreikan kiinteistö';
      }
      
      // Mark as ready for publishing on all platforms
      const socialMediaStatus = {
        bluesky: { published: false, queued: true, queuedAt: admin.firestore.FieldValue.serverTimestamp() },
        x: { published: false, queued: true, queuedAt: admin.firestore.FieldValue.serverTimestamp() },
        facebook: { published: false, queued: true, queuedAt: admin.firestore.FieldValue.serverTimestamp() },
        threads: { published: false, queued: true, queuedAt: admin.firestore.FieldValue.serverTimestamp() },
        instagram: { published: false, queued: true, queuedAt: admin.firestore.FieldValue.serverTimestamp() },
      };
      
      // Build metadata, filtering out undefined values
      const metadata: any = {
        title: after?.title || 'Kohde',
        description,
      };
      if (after?.location !== undefined) metadata.location = after.location;
      if (after?.price !== undefined) metadata.price = after.price;
      if (after?.area !== undefined) metadata.area = after.area;
      if (after?.bedrooms !== undefined) metadata.bedrooms = after.bedrooms;
      if (after?.propertyType !== undefined) metadata.propertyType = after.propertyType;
      
      await getDb().collection('listings').doc(listingId).update({
        socialMediaStatus,
        socialMediaUrl: url,
        socialMediaMetadata: metadata,
      });
      
      functions.logger.info('Listing marked for social media publishing', {
        listingId,
        platforms: ['bluesky', 'x', 'facebook', 'threads', 'instagram'],
      });
      
      // Trigger ISR revalidation on the public site
      try {
        const revalidateSecret = process.env.REVALIDATE_SECRET || 'default-secret-change-me';
        const publicSiteUrl = process.env.PUBLIC_SITE_URL || 'https://kotikreikasta.com';
        const revalidateRes = await fetch(`${publicSiteUrl}/api/revalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            path: `/listings/${urlStub}`,
            type: 'listing',
            secret: revalidateSecret 
          }),
        });
        
        if (revalidateRes.ok) {
          const revalidateData = await revalidateRes.json();
          functions.logger.info('ISR revalidation succeeded', {
            paths: revalidateData.paths,
            listingPath: `/listings/${urlStub}`
          });
        } else {
          functions.logger.warn('ISR revalidation returned error', {
            status: revalidateRes.status,
            statusText: revalidateRes.statusText
          });
        }
      } catch (revalidateErr: any) {
        functions.logger.warn('ISR revalidation failed', {
          error: revalidateErr?.message,
          listingId
        });
        // Don't fail the publish if revalidation fails
      }
      
    } catch (error: any) {
      functions.logger.error('Failed to mark listing for publishing', {
        error: error?.message,
        listingId,
      });
      throw error;
    }
  });
