import * as functions from 'firebase-functions/v1';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const secretClient = new SecretManagerServiceClient();

/**
 * Fetch Threads credentials from Secret Manager
 */
async function fetchThreadsCredentials(): Promise<{ 
  userId: string;
  accessToken: string;
}> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [userIdVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/THREADS_USER_ID/versions/latest`,
    });
    const [accessTokenVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/THREADS_ACCESS_TOKEN/versions/latest`,
    });
    
    const userId = userIdVersion.payload?.data?.toString() || '';
    const accessToken = accessTokenVersion.payload?.data?.toString() || '';
    
    if (!userId || !accessToken) {
      throw new Error('Missing Threads credentials');
    }
    
    return { userId, accessToken };
  } catch (error: any) {
    functions.logger.error('Failed to fetch Threads credentials', { error: error?.message });
    throw new Error('credentials_fetch_failed');
  }
}

/**
 * Post to Threads using Threads API
 * Threads API is a two-step process:
 * 1. Create a media container
 * 2. Publish the container
 */
async function postToThreads(
  text: string,
  credentials: { userId: string; accessToken: string }
): Promise<string> {
  // Step 1: Create media container
  const createEndpoint = `https://graph.threads.net/v1.0/${credentials.userId}/threads`;
  
  const createParams = new URLSearchParams({
    media_type: 'TEXT',
    text,
    access_token: credentials.accessToken,
  });
  
  const createResponse = await fetch(createEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: createParams.toString(),
  });
  
  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    functions.logger.error('Threads create container error', { 
      status: createResponse.status, 
      error: errorText 
    });
    throw new Error(`threads_create_error_${createResponse.status}`);
  }
  
  const createData = await createResponse.json();
  const containerId = createData.id;
  
  if (!containerId) {
    throw new Error('No container ID returned');
  }
  
  functions.logger.info('Created Threads container', { containerId });
  
  // Step 2: Publish the container
  const publishEndpoint = `https://graph.threads.net/v1.0/${credentials.userId}/threads_publish`;
  
  const publishParams = new URLSearchParams({
    creation_id: containerId,
    access_token: credentials.accessToken,
  });
  
  const publishResponse = await fetch(publishEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: publishParams.toString(),
  });
  
  if (!publishResponse.ok) {
    const errorText = await publishResponse.text();
    functions.logger.error('Threads publish error', { 
      status: publishResponse.status, 
      error: errorText 
    });
    throw new Error(`threads_publish_error_${publishResponse.status}`);
  }
  
  const publishData = await publishResponse.json();
  const threadId = publishData.id;
  
  functions.logger.info('Published to Threads', { threadId, textLength: text.length });
  return threadId;
}

/**
 * Test function to post "Terveisiä Kreikasta!" to Threads
 * Can be triggered manually or from admin UI
 */
export const testThreadsPost = functions
  .runWith({ 
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    try {
      functions.logger.info('Test Threads post triggered');
      
      // Fetch credentials
      const credentials = await fetchThreadsCredentials();
      
      // Post test message
      const testMessage = 'Terveisiä Kreikasta! 🇬🇷';
      const threadId = await postToThreads(testMessage, credentials);
      
      // Threads doesn't provide a direct URL in the response, but we can construct it
      const threadUrl = `https://www.threads.net/@username/post/${threadId}`;
      
      functions.logger.info('Test post successful', { threadId });
      
      res.status(200).json({ 
        ok: true, 
        message: 'Test post successful',
        threadId,
        text: testMessage,
        url: threadUrl,
        note: 'Replace @username with your actual Threads username to view the post'
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
