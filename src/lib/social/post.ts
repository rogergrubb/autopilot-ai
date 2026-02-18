/**
 * Social posting tools that the AI agent can call to publish content
 * directly to Reddit, Twitter/X, Facebook, and LinkedIn via Pipedream Connect.
 */

import { pdClient } from '@/lib/pd-client';
import { SOCIAL_PLATFORMS, EXTERNAL_USER_ID } from '@/lib/social/config';
import { postTweet, isTwitterDirectConfigured } from '@/lib/social/twitter-direct';
import { postToFacebookPage, isFacebookDirectConfigured } from '@/lib/social/facebook-direct';

interface PostResult {
  status: 'posted' | 'needs_connection' | 'error';
  platform: string;
  message: string;
  connectUrl?: string;
  data?: unknown;
}

/**
 * Check if a platform account is connected and return the account ID.
 */
async function getConnectedAccount(appSlug: string): Promise<{ id: string } | null> {
  try {
    const client = pdClient();
    const { data: accounts } = await client.accounts.list({
      externalUserId: EXTERNAL_USER_ID,
      includeCredentials: false,
    });
    const found = accounts?.find((acc) => acc.app?.nameSlug === appSlug);
    return found?.id ? { id: found.id } : null;
  } catch {
    return null;
  }
}

/**
 * Generate a connect link for a platform.
 */
async function getConnectUrl(appSlug: string): Promise<string> {
  const client = pdClient();
  const tokenResponse = await client.tokens.create({
    externalUserId: EXTERNAL_USER_ID,
  });
  return `https://pipedream.com/_static/connect.html?token=${tokenResponse.token}&connectLink=true&app=${appSlug}`;
}

/**
 * Post to Reddit
 */
export async function postToReddit(subreddit: string, title: string, content: string): Promise<PostResult> {
  const platform = SOCIAL_PLATFORMS.reddit;
  try {
    const account = await getConnectedAccount(platform.appSlug);
    if (!account) {
      const connectUrl = await getConnectUrl(platform.appSlug);
      return {
        status: 'needs_connection',
        platform: 'reddit',
        message: `Reddit account not connected. Please connect at: ${connectUrl}`,
        connectUrl,
      };
    }

    const client = pdClient();
    const result = await client.actions.run({
      externalUserId: EXTERNAL_USER_ID,
      id: platform.postActionKey,
      configuredProps: {
        reddit: { authProvisionId: account.id },
        subreddit: subreddit.replace(/^r\//, ''),
        title,
        text: content,
        kind: 'self',
      },
    });

    return {
      status: 'posted',
      platform: 'reddit',
      message: `Successfully posted to r/${subreddit}: "${title}"`,
      data: result,
    };
  } catch (error: unknown) {
    return {
      status: 'error',
      platform: 'reddit',
      message: `Failed to post to Reddit: ${(error as Error).message}`,
    };
  }
}

/**
 * Post to Twitter/X — uses direct API when credentials are configured,
 * falls back to Pipedream Connect otherwise.
 */
export async function postToTwitter(content: string): Promise<PostResult> {
  // Prefer direct API (bypasses Pipedream OAuth issues with X Free tier)
  if (isTwitterDirectConfigured()) {
    try {
      const result = await postTweet(content);
      if (result.success) {
        return {
          status: 'posted',
          platform: 'twitter',
          message: `Successfully tweeted (${content.length} chars). View at: ${result.tweetUrl}`,
          data: { tweetId: result.tweetId, tweetUrl: result.tweetUrl },
        };
      } else {
        return {
          status: 'error',
          platform: 'twitter',
          message: `Failed to tweet: ${result.error}`,
        };
      }
    } catch (error: unknown) {
      return {
        status: 'error',
        platform: 'twitter',
        message: `Failed to tweet: ${(error as Error).message}`,
      };
    }
  }

  // Fallback to Pipedream Connect
  const platform = SOCIAL_PLATFORMS.twitter;
  try {
    const account = await getConnectedAccount(platform.appSlug);
    if (!account) {
      const connectUrl = await getConnectUrl(platform.appSlug);
      return {
        status: 'needs_connection',
        platform: 'twitter',
        message: `Twitter/X account not connected. Please connect at: ${connectUrl}`,
        connectUrl,
      };
    }

    const client = pdClient();
    const result = await client.actions.run({
      externalUserId: EXTERNAL_USER_ID,
      id: platform.postActionKey,
      configuredProps: {
        twitter: { authProvisionId: account.id },
        text: content.substring(0, 280),
      },
    });

    return {
      status: 'posted',
      platform: 'twitter',
      message: `Successfully tweeted (${content.length} chars)`,
      data: result,
    };
  } catch (error: unknown) {
    return {
      status: 'error',
      platform: 'twitter',
      message: `Failed to tweet: ${(error as Error).message}`,
    };
  }
}

/**
 * Extract a numeric Facebook Page ID from various formats:
 * - Plain numeric ID: "61588134012621"
 * - URL with id param: "https://www.facebook.com/profile.php?id=61588134012621"
 * - URL with page name: "https://www.facebook.com/somePageName"
 */
function extractFacebookPageId(input?: string): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  // Pure numeric ID
  if (/^\d+$/.test(trimmed)) return trimmed;
  // URL with ?id= parameter  
  const idMatch = trimmed.match(/[?&]id=(\d+)/);
  if (idMatch) return idMatch[1];
  // Try to extract trailing numeric path segment
  const pathMatch = trimmed.match(/facebook\.com\/(\d+)/);
  if (pathMatch) return pathMatch[1];
  // Return as-is (might be a page slug)
  return trimmed;
}

/**
 * Post to Facebook Page — uses direct Graph API when credentials are configured,
 * falls back to Pipedream Connect otherwise.
 */
export async function postToFacebook(content: string, pageId?: string): Promise<PostResult> {
  // Prefer direct API (bypasses Pipedream OAuth token issues)
  if (isFacebookDirectConfigured()) {
    try {
      const result = await postToFacebookPage(content);
      if (result.success) {
        return {
          status: 'posted',
          platform: 'facebook',
          message: `Successfully posted to Facebook Page. View at: ${result.postUrl}`,
          data: { postId: result.postId, postUrl: result.postUrl },
        };
      } else {
        return {
          status: 'error',
          platform: 'facebook',
          message: `Failed to post to Facebook: ${result.error}`,
        };
      }
    } catch (error: unknown) {
      return {
        status: 'error',
        platform: 'facebook',
        message: `Failed to post to Facebook: ${(error as Error).message}`,
      };
    }
  }

  // Fallback to Pipedream Connect
  const platform = SOCIAL_PLATFORMS.facebook;
  const resolvedPageId = extractFacebookPageId(pageId);
  try {
    const account = await getConnectedAccount(platform.appSlug);
    if (!account) {
      const connectUrl = await getConnectUrl(platform.appSlug);
      return {
        status: 'needs_connection',
        platform: 'facebook',
        message: `Facebook Pages account not connected. Please connect at: ${connectUrl}`,
        connectUrl,
      };
    }

    const client = pdClient();
    const result = await client.actions.run({
      externalUserId: EXTERNAL_USER_ID,
      id: platform.postActionKey,
      configuredProps: {
        facebook_pages: { authProvisionId: account.id },
        message: content,
        ...(resolvedPageId && { page: resolvedPageId }),
      },
    });

    return {
      status: 'posted',
      platform: 'facebook',
      message: `Successfully posted to Facebook Page${resolvedPageId ? ` (ID: ${resolvedPageId})` : ''}`,
      data: result,
    };
  } catch (error: unknown) {
    return {
      status: 'error',
      platform: 'facebook',
      message: `Failed to post to Facebook: ${(error as Error).message}`,
    };
  }
}

/**
 * Post to LinkedIn
 */
export async function postToLinkedIn(content: string, url?: string): Promise<PostResult> {
  const platform = SOCIAL_PLATFORMS.linkedin;
  try {
    const account = await getConnectedAccount(platform.appSlug);
    if (!account) {
      const connectUrl = await getConnectUrl(platform.appSlug);
      return {
        status: 'needs_connection',
        platform: 'linkedin',
        message: `LinkedIn account not connected. Please connect at: ${connectUrl}`,
        connectUrl,
      };
    }

    const client = pdClient();
    const result = await client.actions.run({
      externalUserId: EXTERNAL_USER_ID,
      id: platform.postActionKey,
      configuredProps: {
        linkedin: { authProvisionId: account.id },
        text: content,
        ...(url && { url }),
      },
    });

    return {
      status: 'posted',
      platform: 'linkedin',
      message: `Successfully posted to LinkedIn`,
      data: result,
    };
  } catch (error: unknown) {
    return {
      status: 'error',
      platform: 'linkedin',
      message: `Failed to post to LinkedIn: ${(error as Error).message}`,
    };
  }
}
