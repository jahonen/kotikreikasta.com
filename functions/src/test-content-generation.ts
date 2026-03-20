import * as functions from 'firebase-functions/v1';
import { generateSocialContent, ContentInput } from './utils/vertex-ai-content';
import { buildTrackedURL, SocialPlatform } from './utils/social-media-utils';

/**
 * Test function to generate social media content for all platforms
 * Call with GET request, optionally with ?contentId=xxx to test specific content
 */
export const testContentGeneration = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB',
  })
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    try {
      // Get contentId from query params or use default test blog post
      const contentId = req.query.contentId as string || 'wFvQlMqQtIB3ONcTHd5R';
      
      functions.logger.info('Testing content generation', { contentId });
      
      // Fetch the blog post from Firestore
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        admin.initializeApp();
      }
      const db = admin.firestore();
      
      const docRef = await db.collection('blog_posts').doc(contentId).get();
      
      if (!docRef.exists) {
        res.status(404).json({ error: 'Blog post not found', contentId });
        return;
      }
      
      const data = docRef.data();
      const title = data.title || '';
      const description = data.seo?.metaDescription || data.contentMd?.substring(0, 200) || '';
      const urlStub = data.urlStub || contentId;
      const baseUrl = `https://kotikreikasta.com/blog/${urlStub}`;
      
      functions.logger.info('Blog post loaded', { 
        title, 
        descriptionLength: description.length,
        urlStub 
      });
      
      // Test all platforms
      const platforms: SocialPlatform[] = ['bluesky', 'x', 'facebook', 'threads'];
      const results: any = {
        contentId,
        title,
        description: description.substring(0, 100) + '...',
        baseUrl,
        platforms: {},
      };
      
      for (const platform of platforms) {
        try {
          functions.logger.info(`Generating content for ${platform}`);
          
          const trackedUrl = buildTrackedURL(baseUrl, platform, 'blog', contentId);
          
          const contentInput: ContentInput = {
            type: 'blog',
            title,
            description,
            url: trackedUrl,
          };
          
          const startTime = Date.now();
          const generated = await generateSocialContent(contentInput, platform, trackedUrl);
          const duration = Date.now() - startTime;
          
          results.platforms[platform] = {
            success: true,
            text: generated.text,
            characterCount: generated.characterCount,
            trackedUrlLength: trackedUrl.length,
            duration,
          };
          
          functions.logger.info(`${platform} generation complete`, {
            characterCount: generated.characterCount,
            duration,
          });
          
        } catch (error: any) {
          functions.logger.error(`${platform} generation failed`, {
            error: error?.message,
            stack: error?.stack?.substring(0, 500),
          });
          
          results.platforms[platform] = {
            success: false,
            error: error?.message,
          };
        }
      }
      
      // Return results as JSON
      res.status(200).json(results);
      
    } catch (error: any) {
      functions.logger.error('Test content generation failed', {
        error: error?.message,
        stack: error?.stack,
      });
      
      res.status(500).json({
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
      });
    }
  });
