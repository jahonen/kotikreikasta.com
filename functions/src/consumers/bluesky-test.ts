import * as functions from 'firebase-functions/v1';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const secretClient = new SecretManagerServiceClient();

/**
 * Fetch Bluesky credentials from Secret Manager
 */
async function fetchBlueskyCredentials(): Promise<{ identifier: string; password: string }> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [identifierVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/BSKY_IDENTIFIER/versions/latest`,
    });
    const [passwordVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/BSKY_APP_PASSWORD/versions/latest`,
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
 * Authenticate with Bluesky and get session token
 */
async function authenticateBluesky(
  credentials: { identifier: string; password: string }
): Promise<string> {
  const authEndpoint = 'https://bsky.social/xrpc/com.atproto.server.createSession';
  
  const response = await fetch(authEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      identifier: credentials.identifier,
      password: credentials.password,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error('Bluesky auth failed', { 
      status: response.status, 
      error: errorText 
    });
    throw new Error(`bluesky_auth_error_${response.status}`);
  }
  
  const data = await response.json();
  return data.accessJwt;
}

/**
 * Post to Bluesky API
 */
async function postToBluesky(
  text: string,
  credentials: { identifier: string; password: string }
): Promise<string> {
  // First, authenticate to get session token
  const accessToken = await authenticateBluesky(credentials);
  
  const endpoint = 'https://bsky.social/xrpc/com.atproto.repo.createRecord';
  
  const body = {
    repo: credentials.identifier,
    collection: 'app.bsky.feed.post',
    record: {
      text,
      createdAt: new Date().toISOString(),
    },
  };
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error('Bluesky API error', { 
      status: response.status, 
      error: errorText 
    });
    throw new Error(`bluesky_api_error_${response.status}`);
  }
  
  const data = await response.json();
  const postId = data.uri || data.cid || '';
  
  functions.logger.info('Posted to Bluesky', { postId, textLength: text.length });
  return postId;
}

/**
 * Test function to post "Terveisiä Kreikasta!" to Bluesky
 * Can be triggered manually or from admin UI
 */
export const testBlueskyPost = functions
  .runWith({ 
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    try {
      functions.logger.info('Test Bluesky post triggered');
      
      // Fetch credentials
      const credentials = await fetchBlueskyCredentials();
      
      // Post test message
      const testMessage = 'Terveisiä Kreikasta! 🇬🇷';
      const postId = await postToBluesky(testMessage, credentials);
      
      functions.logger.info('Test post successful', { postId });
      
      res.status(200).json({ 
        ok: true, 
        message: 'Test post successful',
        postId,
        text: testMessage
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
