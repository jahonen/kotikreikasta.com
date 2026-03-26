import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

/**
 * One-time migration script to queue all existing published content for Instagram
 * 
 * This will:
 * 1. Find all blog_posts with status='published'
 * 2. Find all listings with status='published' or 'active'
 * 3. Queue them for Instagram if not already published
 * 
 * Call with ?dryRun=true to see what would be updated without making changes
 * Call with ?dryRun=false to actually queue the content
 */
export const queueInstagramExistingContent = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes for large batches
    memory: '512MB',
  })
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    const startTime = Date.now();
    const dryRun = req.query.dryRun !== 'false'; // Default to dry run for safety
    
    try {
      functions.logger.info('Starting Instagram content queue migration', { dryRun });
      
      const db = admin.firestore();
      const results = {
        dryRun,
        blogPosts: {
          total: 0,
          alreadyPublished: 0,
          alreadyQueued: 0,
          queued: 0,
          skipped: 0,
          errors: [] as string[],
        },
        listings: {
          total: 0,
          alreadyPublished: 0,
          alreadyQueued: 0,
          queued: 0,
          skipped: 0,
          errors: [] as string[],
        },
      };
      
      // Process blog posts
      functions.logger.info('Processing blog posts...');
      const blogPostsSnapshot = await db.collection('blog_posts')
        .where('status', '==', 'published')
        .get();
      
      results.blogPosts.total = blogPostsSnapshot.size;
      functions.logger.info(`Found ${blogPostsSnapshot.size} published blog posts`);
      
      for (const doc of blogPostsSnapshot.docs) {
        try {
          const data = doc.data();
          const instagramStatus = data.socialMediaStatus?.instagram;
          
          // Skip if already published to Instagram
          if (instagramStatus?.published) {
            results.blogPosts.alreadyPublished++;
            functions.logger.debug(`Blog post ${doc.id} already published to Instagram`);
            continue;
          }
          
          // Skip if already queued
          if (instagramStatus?.queued) {
            results.blogPosts.alreadyQueued++;
            functions.logger.debug(`Blog post ${doc.id} already queued for Instagram`);
            continue;
          }
          
          // Skip if no featured image
          if (!data.featuredImage?.url) {
            results.blogPosts.skipped++;
            functions.logger.warn(`Blog post ${doc.id} has no featured image - skipping`);
            continue;
          }
          
          // Queue for Instagram
          if (!dryRun) {
            await doc.ref.update({
              'socialMediaStatus.instagram': {
                published: false,
                queued: true,
                queuedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
            });
          }
          
          results.blogPosts.queued++;
          functions.logger.info(`${dryRun ? '[DRY RUN] Would queue' : 'Queued'} blog post ${doc.id} for Instagram`, {
            title: data.title,
          });
          
        } catch (error: any) {
          results.blogPosts.errors.push(`${doc.id}: ${error?.message}`);
          functions.logger.error(`Failed to queue blog post ${doc.id}`, {
            error: error?.message,
          });
        }
      }
      
      // Process listings
      functions.logger.info('Processing listings...');
      const listingsSnapshot = await db.collection('listings')
        .where('status', 'in', ['published', 'active'])
        .get();
      
      results.listings.total = listingsSnapshot.size;
      functions.logger.info(`Found ${listingsSnapshot.size} published/active listings`);
      
      for (const doc of listingsSnapshot.docs) {
        try {
          const data = doc.data();
          const instagramStatus = data.socialMediaStatus?.instagram;
          
          // Skip if already published to Instagram
          if (instagramStatus?.published) {
            results.listings.alreadyPublished++;
            functions.logger.debug(`Listing ${doc.id} already published to Instagram`);
            continue;
          }
          
          // Skip if already queued
          if (instagramStatus?.queued) {
            results.listings.alreadyQueued++;
            functions.logger.debug(`Listing ${doc.id} already queued for Instagram`);
            continue;
          }
          
          // Skip if no featured image
          if (!data.featuredImage?.url) {
            results.listings.skipped++;
            functions.logger.warn(`Listing ${doc.id} has no featured image - skipping`);
            continue;
          }
          
          // Queue for Instagram
          if (!dryRun) {
            await doc.ref.update({
              'socialMediaStatus.instagram': {
                published: false,
                queued: true,
                queuedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
            });
          }
          
          results.listings.queued++;
          functions.logger.info(`${dryRun ? '[DRY RUN] Would queue' : 'Queued'} listing ${doc.id} for Instagram`, {
            title: data.title,
          });
          
        } catch (error: any) {
          results.listings.errors.push(`${doc.id}: ${error?.message}`);
          functions.logger.error(`Failed to queue listing ${doc.id}`, {
            error: error?.message,
          });
        }
      }
      
      const duration = Date.now() - startTime;
      
      // Summary
      const summary = {
        ...results,
        duration,
        totalQueued: results.blogPosts.queued + results.listings.queued,
        totalAlreadyPublished: results.blogPosts.alreadyPublished + results.listings.alreadyPublished,
        totalAlreadyQueued: results.blogPosts.alreadyQueued + results.listings.alreadyQueued,
        totalSkipped: results.blogPosts.skipped + results.listings.skipped,
        totalErrors: results.blogPosts.errors.length + results.listings.errors.length,
      };
      
      functions.logger.info('Instagram content queue migration complete', summary);
      
      res.status(200).json({
        success: true,
        message: dryRun 
          ? 'Dry run complete - no changes made. Call with ?dryRun=false to actually queue content.'
          : 'Migration complete - content queued for Instagram',
        summary,
      });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      functions.logger.error('Instagram content queue migration failed', {
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
        duration,
      });
      
      res.status(500).json({
        success: false,
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
        duration,
      });
    }
  });
