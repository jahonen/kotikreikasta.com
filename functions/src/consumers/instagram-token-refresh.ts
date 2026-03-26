import * as functions from 'firebase-functions/v1';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import sgMail from '@sendgrid/mail';

const secretClient = new SecretManagerServiceClient();

/**
 * Fetch required secrets for token refresh
 */
async function fetchRefreshSecrets(): Promise<{
  currentToken: string;
  sendGridApiKey: string;
}> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [currentTokenVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/INSTAGRAM_ACCESS_TOKEN/versions/latest`,
    });
    const [sendGridKeyVersion] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/SENDGRID_API_KEY/versions/latest`,
    });
    
    const currentToken = currentTokenVersion.payload?.data?.toString() || '';
    const sendGridApiKey = sendGridKeyVersion.payload?.data?.toString() || '';
    
    if (!currentToken || !sendGridApiKey) {
      throw new Error('Missing required secrets');
    }
    
    return { currentToken, sendGridApiKey };
  } catch (error: any) {
    functions.logger.error('Failed to fetch refresh secrets', { error: error?.message });
    throw new Error('secrets_fetch_failed');
  }
}

/**
 * Refresh Instagram access token
 */
async function refreshAccessToken(currentToken: string): Promise<{
  newToken: string;
  expiresIn: number;
}> {
  const endpoint = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`;
  
  const response = await fetch(endpoint, {
    method: 'GET',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error('Token refresh failed', { 
      status: response.status, 
      error: errorText 
    });
    throw new Error(`token_refresh_error_${response.status}`);
  }
  
  const data = await response.json();
  const newToken = data.access_token;
  const expiresIn = data.expires_in || 0;
  
  if (!newToken) {
    throw new Error('No new token returned');
  }
  
  functions.logger.info('Token refreshed successfully', { expiresIn });
  return { newToken, expiresIn };
}

/**
 * Update the INSTAGRAM_ACCESS_TOKEN secret with new token
 */
async function updateTokenSecret(newToken: string): Promise<void> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const parent = `projects/${project}/secrets/INSTAGRAM_ACCESS_TOKEN`;
    
    await secretClient.addSecretVersion({
      parent,
      payload: {
        data: Buffer.from(newToken, 'utf8'),
      },
    });
    
    functions.logger.info('Secret updated successfully');
  } catch (error: any) {
    functions.logger.error('Failed to update secret', { error: error?.message });
    throw new Error('secret_update_failed');
  }
}

/**
 * Send email report via SendGrid
 */
async function sendEmailReport(
  sendGridApiKey: string,
  success: boolean,
  details: {
    expiresIn?: number;
    expiresInDays?: number;
    newTokenPreview?: string;
    error?: string;
    errorDetails?: string;
  }
): Promise<void> {
  sgMail.setApiKey(sendGridApiKey);
  
  const timestamp = new Date().toISOString();
  const timestampFinnish = new Date().toLocaleString('fi-FI', { 
    timeZone: 'Europe/Helsinki',
    dateStyle: 'full',
    timeStyle: 'long'
  });
  
  let htmlContent = '';
  let textContent = '';
  
  if (success) {
    const expiresInDays = details.expiresInDays || 0;
    const expirationDate = new Date(Date.now() + (details.expiresIn || 0) * 1000);
    const expirationDateFinnish = expirationDate.toLocaleString('fi-FI', {
      timeZone: 'Europe/Helsinki',
      dateStyle: 'full',
      timeStyle: 'short'
    });
    
    htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">✅ Instagram Token Refresh - Success</h2>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-weight: bold;">Token successfully refreshed</p>
        </div>
        
        <h3>Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Refresh Time:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${timestampFinnish}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>New Token Expires In:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${expiresInDays} days (${details.expiresIn} seconds)</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Expiration Date:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${expirationDateFinnish}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Token Preview:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 12px;">${details.newTokenPreview}...</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Secret Updated:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">✅ INSTAGRAM_ACCESS_TOKEN updated in Secret Manager</td>
          </tr>
        </table>
        
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Next Refresh:</strong> Scheduled daily check at 2 AM Helsinki time</p>
        </div>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
          This is an automated report from Kotikreikasta.com Instagram token refresh function.<br>
          Timestamp (UTC): ${timestamp}
        </p>
      </div>
    `;
    
    textContent = `
Instagram Token Refresh - SUCCESS

Token successfully refreshed

Details:
- Refresh Time: ${timestampFinnish}
- New Token Expires In: ${expiresInDays} days (${details.expiresIn} seconds)
- Expiration Date: ${expirationDateFinnish}
- Token Preview: ${details.newTokenPreview}...
- Secret Updated: INSTAGRAM_ACCESS_TOKEN updated in Secret Manager

Next Refresh: Scheduled daily check at 2 AM Helsinki time

---
This is an automated report from Kotikreikasta.com Instagram token refresh function.
Timestamp (UTC): ${timestamp}
    `;
  } else {
    htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">❌ Instagram Token Refresh - Failed</h2>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-weight: bold;">Token refresh failed</p>
        </div>
        
        <h3>Error Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Refresh Time:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${timestampFinnish}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Error:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #ef4444;">${details.error}</td>
          </tr>
          ${details.errorDetails ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top;"><strong>Details:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 12px; white-space: pre-wrap;">${details.errorDetails}</td>
          </tr>
          ` : ''}
        </table>
        
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0;">
          <p style="margin: 0;"><strong>⚠️ Action Required:</strong></p>
          <p style="margin: 8px 0 0 0;">
            The Instagram access token could not be refreshed automatically. 
            Please manually refresh the token following the instructions in INSTAGRAM_PUBLISHER_PLAN.md
          </p>
        </div>
        
        <h3>Manual Refresh Steps</h3>
        <ol style="color: #374151;">
          <li>Go to Facebook Graph API Explorer: https://developers.facebook.com/tools/explorer/</li>
          <li>Select your Instagram Business App (Kotikreikasta connector-IG)</li>
          <li>Generate a new User Access Token with required permissions</li>
          <li>Use the refresh endpoint to get a long-lived token</li>
          <li>Update the INSTAGRAM_ACCESS_TOKEN secret in Google Secret Manager</li>
        </ol>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
          This is an automated report from Kotikreikasta.com Instagram token refresh function.<br>
          Timestamp (UTC): ${timestamp}
        </p>
      </div>
    `;
    
    textContent = `
Instagram Token Refresh - FAILED

Token refresh failed

Error Details:
- Refresh Time: ${timestampFinnish}
- Error: ${details.error}
${details.errorDetails ? `- Details: ${details.errorDetails}` : ''}

⚠️ ACTION REQUIRED:
The Instagram access token could not be refreshed automatically.
Please manually refresh the token following the instructions in INSTAGRAM_PUBLISHER_PLAN.md

Manual Refresh Steps:
1. Go to Facebook Graph API Explorer: https://developers.facebook.com/tools/explorer/
2. Select your Instagram Business App (Kotikreikasta connector-IG)
3. Generate a new User Access Token with required permissions
4. Use the refresh endpoint to get a long-lived token
5. Update the INSTAGRAM_ACCESS_TOKEN secret in Google Secret Manager

---
This is an automated report from Kotikreikasta.com Instagram token refresh function.
Timestamp (UTC): ${timestamp}
    `;
  }
  
  const msg = {
    to: 'cto@kotikreikasta.com',
    from: 'noreply@kotikreikasta.com',
    subject: 'Kotikreikasta.com Instagram token refresh report',
    text: textContent,
    html: htmlContent,
  };
  
  try {
    await sgMail.send(msg);
    functions.logger.info('Email report sent successfully', { to: 'cto@kotikreikasta.com' });
  } catch (error: any) {
    functions.logger.error('Failed to send email report', { 
      error: error?.message,
      response: error?.response?.body 
    });
    throw new Error('email_send_failed');
  }
}

/**
 * Scheduled function to refresh Instagram access token
 * Runs daily at 2:00 AM Helsinki time to check expiration
 */
export const refreshInstagramToken = functions
  .runWith({ 
    timeoutSeconds: 120,
    memory: '256MB',
  })
  .region('europe-west1')
  .pubsub.schedule('0 2 * * *')
  .timeZone('Europe/Helsinki')
  .onRun(async (context) => {
    const startTime = Date.now();
    let reportDetails: any = {};
    
    try {
      functions.logger.info('Instagram token refresh started');
      
      // Fetch secrets
      const { currentToken, sendGridApiKey } = await fetchRefreshSecrets();
      
      // Refresh the token
      const { newToken, expiresIn } = await refreshAccessToken(currentToken);
      
      // Update the secret
      await updateTokenSecret(newToken);
      
      // Calculate expiration details
      const expiresInDays = Math.floor(expiresIn / 86400);
      const newTokenPreview = newToken.substring(0, 20);
      
      reportDetails = {
        expiresIn,
        expiresInDays,
        newTokenPreview,
      };
      
      functions.logger.info('Token refresh completed successfully', { 
        expiresInDays,
        duration: Date.now() - startTime 
      });
      
      // Send success email
      await sendEmailReport(sendGridApiKey, true, reportDetails);
      
      return { 
        success: true, 
        message: 'Token refreshed successfully',
        expiresIn,
        expiresInDays,
        duration: Date.now() - startTime
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      functions.logger.error('Token refresh failed', { 
        error: error?.message,
        stack: error?.stack?.substring(0, 500),
        duration
      });
      
      reportDetails = {
        error: error?.message || 'Unknown error',
        errorDetails: error?.stack?.substring(0, 1000),
      };
      
      // Try to send failure email
      try {
        const { sendGridApiKey } = await fetchRefreshSecrets();
        await sendEmailReport(sendGridApiKey, false, reportDetails);
      } catch (emailError: any) {
        functions.logger.error('Failed to send failure email', { 
          error: emailError?.message 
        });
      }
      
      throw error;
    }
  });
