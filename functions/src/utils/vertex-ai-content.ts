import * as functions from 'firebase-functions/v1';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { GoogleAuth } from 'google-auth-library';
import { SocialPlatform, PLATFORM_LIMITS } from './social-media-utils';

const secretClient = new SecretManagerServiceClient();

/**
 * Content input for social media generation
 */
export interface ContentInput {
  type: 'listing' | 'blog';
  title: string;
  description: string;
  url: string;
  metadata?: {
    location?: string;
    price?: number;
    area?: number;
    bedrooms?: number;
    [key: string]: any;
  };
}

/**
 * Generated social media content
 */
export interface GeneratedContent {
  text: string;
  characterCount: number;
  platform: SocialPlatform;
}

/**
 * Fetch secret from Secret Manager
 */
async function fetchSecret(secretName: string): Promise<string> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: `projects/${project}/secrets/${secretName}/versions/latest`,
    });
    
    const value = version.payload?.data?.toString() || '';
    
    if (!value) {
      throw new Error(`Secret ${secretName} is empty`);
    }
    
    return value;
  } catch (error: any) {
    functions.logger.error(`Failed to fetch secret ${secretName}`, { error: error?.message });
    throw new Error(`secret_fetch_failed: ${secretName}`);
  }
}

/**
 * Build prompt for Vertex AI
 */
function buildPrompt(
  content: ContentInput,
  platform: SocialPlatform,
  trackedUrl: string,
  llmGuide: string
): string {
  const maxChars = PLATFORM_LIMITS[platform];
  const urlLength = trackedUrl.length;
  const textBudget = maxChars - urlLength - 2; // -2 for space and newline
  
  const contentTypeLabel = content.type === 'listing' ? 'Kohde-esittely' : 'Blogiartikkeli';
  
  let metadataText = '';
  if (content.metadata) {
    if (content.metadata.location) metadataText += `Sijainti: ${content.metadata.location}\n`;
    if (content.metadata.price) metadataText += `Hinta: ${content.metadata.price}€\n`;
    if (content.metadata.area) metadataText += `Pinta-ala: ${content.metadata.area}m²\n`;
    if (content.metadata.bedrooms) metadataText += `Makuuhuoneet: ${content.metadata.bedrooms}\n`;
  }
  
  return `${llmGuide}

---

## TEHTÄVÄ

Tuota sosiaalisen median julkaisu seuraavilla parametreilla:

**Sisältömateriaali:**
Tyyppi: ${contentTypeLabel}
Otsikko: ${content.title}
Kuvaus: ${content.description}
${metadataText}

**URL-osoite:** ${trackedUrl}

**Alusta:** ${platform}

**Maksimimerkkimäärä:** ${textBudget} merkkiä (tekstille, linkki lisätään erikseen)

---

## VAATIMUKSET

1. Tuota VAIN julkaisun teksti, ei mitään muuta
2. Teksti saa olla maksimissaan ${textBudget} merkkiä
3. ÄLÄ sisällytä linkkiä tekstiin - se lisätään automaattisesti
4. Noudata ohjeessa määriteltyjä äänensävyjä ja rakenteita
5. Kieliasu on moitteetonta suomea (pilkutus, yhdyssanat, sijamuodot)
6. Alusta määrittää tyylin:
   - X: Tiivis, yksi ajatus
   - Threads: Vapaamuotoinen, henkilökohtainen
   - Bluesky: Pohdiskeleva, keskusteleva
   - Facebook: Pidempi, käytännöllinen

Tuota nyt julkaisu.`;
}

/**
 * Generate social media content using Vertex AI REST API
 */
export async function generateSocialContent(
  content: ContentInput,
  platform: SocialPlatform,
  trackedUrl: string
): Promise<GeneratedContent> {
  try {
    functions.logger.info('Generating social content', {
      platform,
      contentType: content.type,
      title: content.title,
    });
    
    const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    
    // Fetch secrets
    const llmGuide = await fetchSecret('SOCIAL_MEDIA_LLM_GUIDE');
    const model = await fetchSecret('GEMINI_COSTOPTIMIZED_MODEL');
    const location = 'europe-west1';
    
    // Build prompt
    const prompt = buildPrompt(content, platform, trackedUrl, llmGuide);
    
    // Get auth token
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const client = await auth.getClient();
    const token = await (client as any).getAccessToken();
    
    // Call Vertex AI REST API
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
    
    // Calculate token budget from character limit
    // Finnish text: ~1 token = 3.5 characters
    const charLimit = PLATFORM_LIMITS[platform] - trackedUrl.length - 2;
    const estimatedTokens = Math.ceil(charLimit / 3.5);
    const safeTokenBudget = Math.floor(estimatedTokens * 0.9); // 10% safety margin (increased from 20%)
    
    functions.logger.info('Token budget calculation', {
      platform,
      charLimit,
      estimatedTokens,
      safeTokenBudget,
      urlLength: trackedUrl.length,
    });
    
    const requestBody = {
      systemInstruction: {
        role: 'system',
        parts: [{ text: llmGuide }]
      },
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        maxOutputTokens: Math.max(safeTokenBudget, 100), // Minimum 100 tokens
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        candidateCount: 1,
      },
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      functions.logger.error('Vertex AI API error', {
        status: response.status,
        error: errorText,
      });
      throw new Error(`vertex_ai_error_${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    // Log full response for debugging
    functions.logger.info('Vertex AI response', {
      candidateCount: data.candidates?.length || 0,
      finishReason: data.candidates?.[0]?.finishReason,
      safetyRatings: data.candidates?.[0]?.safetyRatings,
      tokenCount: data.usageMetadata,
    });
    
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!generatedText) {
      functions.logger.error('No content generated', { 
        response: JSON.stringify(data).substring(0, 500) 
      });
      throw new Error('No content generated');
    }
    
    // Clean up the text (remove any markdown formatting, extra whitespace)
    const cleanedText = generatedText
      .trim()
      .replace(/^```.*\n?/gm, '')
      .replace(/```$/gm, '')
      .trim();
    
    const maxChars = PLATFORM_LIMITS[platform];
    const urlLength = trackedUrl.length;
    const textBudget = maxChars - urlLength - 2;
    
    // Verify length
    if (cleanedText.length > textBudget) {
      functions.logger.warn('Generated text exceeds budget, truncating', {
        generated: cleanedText.length,
        budget: textBudget,
      });
      
      // Truncate at last sentence boundary
      const truncated = cleanedText.substring(0, textBudget);
      const lastPeriod = truncated.lastIndexOf('.');
      const lastExclamation = truncated.lastIndexOf('!');
      const lastQuestion = truncated.lastIndexOf('?');
      const lastSentence = Math.max(lastPeriod, lastExclamation, lastQuestion);
      
      // Try sentence boundary first
      if (lastSentence > textBudget * 0.7) {
        const finalText = truncated.substring(0, lastSentence + 1);
        return {
          text: finalText,
          characterCount: finalText.length,
          platform,
        };
      }
      
      // No good sentence boundary, try word boundary
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > textBudget * 0.5) {
        const finalText = truncated.substring(0, lastSpace) + '...';
        return {
          text: finalText,
          characterCount: finalText.length,
          platform,
        };
      }
      
      // Last resort: hard truncate with ellipsis
      const finalText = truncated.substring(0, textBudget - 3) + '...';
      
      return {
        text: finalText,
        characterCount: finalText.length,
        platform,
      };
    }
    
    functions.logger.info('Content generated successfully', {
      platform,
      characterCount: cleanedText.length,
      budget: textBudget,
    });
    
    return {
      text: cleanedText,
      characterCount: cleanedText.length,
      platform,
    };
    
  } catch (error: any) {
    functions.logger.error('Failed to generate social content', {
      error: error?.message,
      platform,
      contentType: content.type,
    });
    throw new Error(`content_generation_failed: ${error?.message}`);
  }
}

/**
 * Format final post with link for platform
 */
export function formatPostWithLink(
  generatedText: string,
  trackedUrl: string,
  platform: SocialPlatform
): string {
  // Platform-specific formatting
  switch (platform) {
    case 'x':
    case 'threads':
      // X and Threads: text + newline + link
      return `${generatedText}\n\n${trackedUrl}`;
    
    case 'bluesky':
      // Bluesky: text + newline + link (will be converted to facet)
      return `${generatedText}\n\n${trackedUrl}`;
    
    case 'facebook':
      // Facebook: text + newline + link (Facebook auto-generates preview)
      return `${generatedText}\n\n${trackedUrl}`;
    
    default:
      return `${generatedText}\n\n${trackedUrl}`;
  }
}
