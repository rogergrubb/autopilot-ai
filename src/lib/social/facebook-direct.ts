/**
 * Direct Facebook Pages API integration using Graph API.
 * Bypasses Pipedream Connect which has OAuth token issues with Pages.
 *
 * Required env vars:
 * - FACEBOOK_PAGE_ID (numeric Page ID, e.g. "61588134012621")
 * - FACEBOOK_PAGE_ACCESS_TOKEN (long-lived Page Access Token)
 *
 * How to get a Page Access Token:
 * 1. Go to https://developers.facebook.com/tools/explorer/
 * 2. Select your app (or create one at developers.facebook.com)
 * 3. Click "Get Token" → "Get Page Access Token"
 * 4. Select your Page and grant pages_manage_posts + pages_read_engagement permissions
 * 5. Copy the token
 * 6. To make it long-lived (60 days), exchange it:
 *    GET https://graph.facebook.com/v21.0/oauth/access_token?
 *      grant_type=fb_exchange_token&
 *      client_id={APP_ID}&
 *      client_secret={APP_SECRET}&
 *      fb_exchange_token={SHORT_LIVED_TOKEN}
 * 7. Then get the Page token from the long-lived user token:
 *    GET https://graph.facebook.com/v21.0/me/accounts?access_token={LONG_LIVED_USER_TOKEN}
 *    The page access_token in that response is automatically long-lived.
 */

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface FacebookPostResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

function getPageId(): string {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  if (!pageId) {
    throw new Error(
      'FACEBOOK_PAGE_ID not configured. Set it in environment variables.'
    );
  }
  return pageId;
}

function getPageAccessToken(): string {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'FACEBOOK_PAGE_ACCESS_TOKEN not configured. Get one from https://developers.facebook.com/tools/explorer/'
    );
  }
  return token;
}

/**
 * Post a text message to the Facebook Page.
 */
export async function postToFacebookPage(
  message: string,
  link?: string
): Promise<FacebookPostResult> {
  try {
    if (!message?.trim()) {
      return { success: false, error: 'Post message is required' };
    }

    const pageId = getPageId();
    const accessToken = getPageAccessToken();

    const body: Record<string, string> = {
      message: message,
      access_token: accessToken,
    };

    if (link) {
      body.link = link;
    }

    const response = await fetch(`${GRAPH_API_BASE}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}`;
      console.error('[Facebook Direct] API error:', data);
      return {
        success: false,
        error: `Facebook API error: ${errorMsg}`,
      };
    }

    const postId = data.id; // format: "pageId_postId"
    console.log('[Facebook Direct] Post created:', postId);

    return {
      success: true,
      postId,
      postUrl: `https://www.facebook.com/${postId?.replace('_', '/posts/')}`,
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Facebook Direct] Error:', err.message);
    return {
      success: false,
      error: `Facebook API error: ${err.message}`,
    };
  }
}

/**
 * Verify the Page Access Token is valid and get page info.
 */
export async function verifyFacebookCredentials(): Promise<{
  valid: boolean;
  pageName?: string;
  pageId?: string;
  error?: string;
}> {
  try {
    const pageId = getPageId();
    const accessToken = getPageAccessToken();

    const response = await fetch(
      `${GRAPH_API_BASE}/${pageId}?fields=name,id,fan_count&access_token=${accessToken}`
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        valid: false,
        error: data?.error?.message || `HTTP ${response.status}`,
      };
    }

    return {
      valid: true,
      pageName: data.name,
      pageId: data.id,
    };
  } catch (error: unknown) {
    const err = error as Error;
    return { valid: false, error: err.message };
  }
}

/**
 * Check if direct Facebook credentials are configured.
 */
export function isFacebookDirectConfigured(): boolean {
  return !!(
    process.env.FACEBOOK_PAGE_ID &&
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  );
}
