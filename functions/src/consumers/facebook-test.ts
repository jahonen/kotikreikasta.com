import * as functions from 'firebase-functions/v1';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const secretClient = new SecretManagerServiceClient();

/**
 * Fetch Facebook credentials from Secret Manager
 */
async function fetchFacebookCredentials(): Promise<{ 
  pageId: string;
  pageAccessToken: string;
}> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [pageIdVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/FACEBOOK_PAGE_ID/versions/latest`,
    });
    const [pageAccessTokenVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/FACEBOOK_PAGE_ACCESS_TOKEN/versions/latest`,
    });
    
    const pageId = pageIdVersion.payload?.data?.toString() || '';
    const pageAccessToken = pageAccessTokenVersion.payload?.data?.toString() || '';
    
    if (!pageId || !pageAccessToken) {
      throw new Error('Missing Facebook credentials');
    }
    
    return { pageId, pageAccessToken };
  } catch (error: any) {
    functions.logger.error('Failed to fetch Facebook credentials', { error: error?.message });
    throw new Error('credentials_fetch_failed');
  }
}

/**
 * Get Page Access Token from System User token
 */
async function getPageAccessToken(
  pageId: string,
  systemUserToken: string
): Promise<string> {
  // Use the System User token to get the Page Access Token
  const endpoint = `https://graph.facebook.com/v18.0/${pageId}?fields=access_token&access_token=${systemUserToken}`;
  
  const response = await fetch(endpoint, {
    method: 'GET',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error('Failed to get Page Access Token', { 
      status: response.status, 
      error: errorText 
    });
    throw new Error(`page_token_fetch_error_${response.status}`);
  }
  
  const data = await response.json();
  const pageAccessToken = data.access_token;
  
  if (!pageAccessToken) {
    throw new Error('No page access token returned');
  }
  
  functions.logger.info('Retrieved Page Access Token');
  return pageAccessToken;
}

/**
 * Post to Facebook Page using Graph API
 */
async function postToFacebook(
  message: string,
  credentials: { pageId: string; pageAccessToken: string }
): Promise<string> {
  // First, get the actual Page Access Token from the System User token
  const pageAccessToken = await getPageAccessToken(
    credentials.pageId,
    credentials.pageAccessToken
  );
  
  const endpoint = `https://graph.facebook.com/v18.0/${credentials.pageId}/feed`;
  
  const params = new URLSearchParams({
    message,
    access_token: pageAccessToken,
  });
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error('Facebook API error', { 
      status: response.status, 
      error: errorText 
    });
    throw new Error(`facebook_api_error_${response.status}`);
  }
  
  const data = await response.json();
  const postId = data.id || '';
  
  functions.logger.info('Posted to Facebook', { postId, messageLength: message.length });
  return postId;
}

/**
 * Test function to post "Terveisiä Kreikasta!" to Facebook Page
 * Can be triggered manually or from admin UI
 */
export const testFacebookPost = functions
  .runWith({ 
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    try {
      functions.logger.info('Test Facebook post triggered');
      
      // Fetch credentials
      const credentials = await fetchFacebookCredentials();
      
      // Post test message
      const testMessage = 'Terveisiä Kreikasta! 🇬🇷';
      const postId = await postToFacebook(testMessage, credentials);
      
      // Extract page ID and post ID for URL
      const [pageId, fbPostId] = postId.split('_');
      const postUrl = `https://www.facebook.com/${pageId}/posts/${fbPostId}`;
      
      functions.logger.info('Test post successful', { postId, postUrl });
      
      res.status(200).json({ 
        ok: true, 
        message: 'Test post successful',
        postId,
        text: testMessage,
        url: postUrl
      });
      
    } catch (error: any) {
      functions.logger.error('Test post failed', { 
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
      });
      
      res.status(500).json({ 
        error: 'test_post_failed', 
        detail: error?.message 
      });
    }
  });
