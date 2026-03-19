import * as functions from 'firebase-functions/v1';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as crypto from 'crypto';

const secretClient = new SecretManagerServiceClient();

/**
 * Fetch X (Twitter) credentials from Secret Manager
 */
async function fetchXCredentials(): Promise<{ 
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [consumerKeyVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/X_CONSUMER_KEY/versions/latest`,
    });
    const [consumerSecretVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/X_CONSUMER_SECRET/versions/latest`,
    });
    const [accessTokenVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/X_ACCESS_TOKEN/versions/latest`,
    });
    const [accessTokenSecretVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/X_ACCESS_TOKEN_SECRET/versions/latest`,
    });
    
    const consumerKey = consumerKeyVersion.payload?.data?.toString() || '';
    const consumerSecret = consumerSecretVersion.payload?.data?.toString() || '';
    const accessToken = accessTokenVersion.payload?.data?.toString() || '';
    const accessTokenSecret = accessTokenSecretVersion.payload?.data?.toString() || '';
    
    if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
      throw new Error('Missing X credentials');
    }
    
    return { consumerKey, consumerSecret, accessToken, accessTokenSecret };
  } catch (error: any) {
    functions.logger.error('Failed to fetch X credentials', { error: error?.message });
    throw new Error('credentials_fetch_failed');
  }
}

/**
 * Generate OAuth 1.0a signature for X API
 */
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  // Sort parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  // Create signature base string
  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');
  
  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  // Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');
  
  return signature;
}

/**
 * Post to X (Twitter) API v2 with OAuth 1.0a
 */
async function postToX(
  text: string,
  credentials: {
    consumerKey: string;
    consumerSecret: string;
    accessToken: string;
    accessTokenSecret: string;
  }
): Promise<string> {
  const endpoint = 'https://api.twitter.com/2/tweets';
  
  // OAuth 1.0a parameters
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_token: credentials.accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(32).toString('hex'),
    oauth_version: '1.0',
  };
  
  // Generate signature
  const signature = generateOAuthSignature(
    'POST',
    endpoint,
    oauthParams,
    credentials.consumerSecret,
    credentials.accessTokenSecret
  );
  
  oauthParams.oauth_signature = signature;
  
  // Build OAuth header
  const oauthHeader = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');
  
  const body = {
    text,
  };
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': oauthHeader,
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error('X API error', { 
      status: response.status, 
      error: errorText 
    });
    throw new Error(`x_api_error_${response.status}`);
  }
  
  const data = await response.json();
  const tweetId = data.data?.id || '';
  
  functions.logger.info('Posted to X', { tweetId, textLength: text.length });
  return tweetId;
}

/**
 * Test function to post "Terveisiä Kreikasta!" to X (Twitter)
 * Can be triggered manually or from admin UI
 */
export const testXPost = functions
  .runWith({ 
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    try {
      functions.logger.info('Test X post triggered');
      
      // Fetch credentials
      const credentials = await fetchXCredentials();
      
      // Post test message
      const testMessage = 'Terveisiä Kreikasta! 🇬🇷';
      const tweetId = await postToX(testMessage, credentials);
      
      functions.logger.info('Test post successful', { tweetId });
      
      res.status(200).json({ 
        ok: true, 
        message: 'Test post successful',
        tweetId,
        text: testMessage,
        url: `https://twitter.com/i/web/status/${tweetId}`
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
