import * as functions from 'firebase-functions/v1';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { 
  ContentType, 
  buildTrackedURL, 
  retryWithBackoff 
} from '../utils/social-media-utils';
import { 
  ContentInput, 
  generateSocialContent, 
  formatPostWithLink 
} from '../utils/vertex-ai-content';
import { trackSocialShare } from '../utils/firestore-tracking';

const secretClient = new SecretManagerServiceClient();

interface BlueskyCredentials {
  identifier: string;
  password: string;
}

/**
 * Fetch Bluesky credentials from Secret Manager
 */
async function fetchBlueskyCredentials(): Promise<BlueskyCredentials> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [identifierVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/BLUESKY_IDENTIFIER/versions/latest`,
    });
    const [passwordVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/BLUESKY_PASSWORD/versions/latest`,
    });
    
    const identifier = identifierVersion.payload?.data?.toString() || '';
    const password = passwordVersion.payload?.data?.toString() || '';
    
    if (!identifier || !password) {
      throw new Error('Missing Bluesky credentials');
    }
    
    return { identifier, password };
  } catch (error: any) {
    functions.logger.error('Failed to fetch Bluesky credentials', { error: error?.message });
    throw new Error('credentials_fetch_failed');
  }
}

/**
 * Create Bluesky session
 */
async function createSession(credentials: BlueskyCredentials): Promise<string> {
  const response = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: credentials.identifier,
      password: credentials.password,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error('Bluesky session creation failed', {
      status: response.status,
      error: errorText,
    });
    throw new Error(`bluesky_session_error_${response.status}`);
  }
  
  const data = await response.json();
  const accessJwt = data.accessJwt;
  
  if (!accessJwt) {
    throw new Error('No access token returned');
  }
  
  return accessJwt;
}

/**
 * Detect links in text and create facets for Bluesky
 */
function createLinkFacets(text: string): any[] {
  const facets: any[] = [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    const start = match.index;
    const end = start + url.length;
    
    // Convert to byte positions (Bluesky uses UTF-8 byte positions)
    const byteStart = Buffer.from(text.substring(0, start)).length;
    const byteEnd = Buffer.from(text.substring(0, end)).length;
    
    facets.push({
      index: {
        byteStart,
        byteEnd,
      },
      features: [{
        $type: 'app.bsky.richtext.facet#link',
        uri: url,
      }],
    });
  }
  
  return facets;
}

/**
 * Post to Bluesky with rich text facets
 */
async function postToBluesky(
  text: string,
  accessToken: string
): Promise<{ postId: string; postUrl: string }> {
  const facets = createLinkFacets(text);
  
  const record = {
    $type: 'app.bsky.feed.post',
    text,
    facets: facets.length > 0 ? facets : undefined,
    createdAt: new Date().toISOString(),
  };
  
  const response = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      repo: 'kotikreikasta.bsky.social',
      collection: 'app.bsky.feed.post',
      record,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error('Bluesky post failed', {
      status: response.status,
      error: errorText,
    });
    throw new Error(`bluesky_post_error_${response.status}`);
  }
  
  const data = await response.json();
  const postId = data.uri || data.cid || '';
  
  // Construct post URL
  const postUrl = postId 
    ? `https://bsky.app/profile/kotikreikasta.bsky.social/post/${postId.split('/').pop()}`
    : '';
  
  functions.logger.info('Posted to Bluesky', { postId, textLength: text.length });
  
  return { postId, postUrl };
}

/**
 * Publish content to Bluesky
 * 
 * Request body:
 * {
 *   contentType: 'listing' | 'blog',
 *   contentId: string,
 *   contentCollection: 'listings' | 'content',
 *   title: string,
 *   description: string,
 *   url: string,
 *   metadata?: { location?, price?, area?, bedrooms?, ... }
 * }
 */
export const publishToBluesky = functions
  .runWith({
    timeoutSeconds: 120,
    memory: '512MB',
  })
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Validate request
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'method_not_allowed' });
        return;
      }
      
      const {
        contentType,
        contentId,
        contentCollection,
        title,
        description,
        url,
        metadata,
      } = req.body;
      
      if (!contentType || !contentId || !contentCollection || !title || !description || !url) {
        res.status(400).json({ 
          error: 'missing_required_fields',
          required: ['contentType', 'contentId', 'contentCollection', 'title', 'description', 'url']
        });
        return;
      }
      
      if (contentType !== 'listing' && contentType !== 'blog') {
        res.status(400).json({ error: 'invalid_content_type', allowed: ['listing', 'blog'] });
        return;
      }
      
      if (contentCollection !== 'listings' && contentCollection !== 'content') {
        res.status(400).json({ error: 'invalid_content_collection', allowed: ['listings', 'content'] });
        return;
      }
      
      functions.logger.info('Bluesky publish started', {
        contentType,
        contentId,
        title,
      });
      
      // Build tracked URL with UTM parameters
      const trackedUrl = buildTrackedURL(url, 'bluesky', contentType as ContentType, contentId);
      
      // Prepare content input
      const contentInput: ContentInput = {
        type: contentType,
        title,
        description,
        url: trackedUrl,
        metadata,
      };
      
      // Generate content with Vertex AI
      const generatedContent = await retryWithBackoff(
        () => generateSocialContent(contentInput, 'bluesky', trackedUrl),
        undefined,
        'Vertex AI content generation'
      );
      
      // Format post with link
      const finalPost = formatPostWithLink(generatedContent.text, trackedUrl, 'bluesky');
      
      // Fetch credentials
      const credentials = await retryWithBackoff(
        () => fetchBlueskyCredentials(),
        undefined,
        'Fetch Bluesky credentials'
      );
      
      // Create session
      const accessToken = await retryWithBackoff(
        () => createSession(credentials),
        undefined,
        'Create Bluesky session'
      );
      
      // Post to Bluesky
      const { postId, postUrl } = await retryWithBackoff(
        () => postToBluesky(finalPost, accessToken),
        undefined,
        'Post to Bluesky'
      );
      
      // Track in Firestore
      await trackSocialShare(
        contentCollection as 'listings' | 'blog_posts',
        contentId,
        'bluesky',
        {
          postId,
          postUrl,
          text: finalPost,
          characterCount: finalPost.length,
          success: true,
        }
      );
      
      const duration = Date.now() - startTime;
      
      functions.logger.info('Bluesky publish successful', {
        contentId,
        postId,
        duration,
      });
      
      res.status(200).json({
        ok: true,
        platform: 'bluesky',
        postId,
        postUrl,
        text: finalPost,
        characterCount: finalPost.length,
        trackedUrl,
        duration,
      });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      functions.logger.error('Bluesky publish failed', {
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
        duration,
      });
      
      // Track failure in Firestore if we have the required info
      if (req.body?.contentCollection && req.body?.contentId) {
        await trackSocialShare(
          req.body.contentCollection as 'listings' | 'blog_posts',
          req.body.contentId,
          'bluesky',
          {
            postId: '',
            text: '',
            characterCount: 0,
            success: false,
            error: error?.message,
          }
        );
      }
      
      res.status(500).json({
        error: 'publish_failed',
        detail: error?.message,
        duration,
      });
    }
  });
