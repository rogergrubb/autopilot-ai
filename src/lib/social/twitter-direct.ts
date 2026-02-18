import { TwitterApi } from 'twitter-api-v2';

/**
 * Direct Twitter API integration using OAuth 1.0a User Context.
 * Bypasses Pipedream Connect which has issues with X Free tier OAuth flow.
 * 
 * Required env vars:
 * - TWITTER_CONSUMER_KEY (API Key)
 * - TWITTER_CONSUMER_SECRET (API Key Secret)
 * - TWITTER_ACCESS_TOKEN
 * - TWITTER_ACCESS_TOKEN_SECRET
 */

function getTwitterClient(): TwitterApi {
  const appKey = process.env.TWITTER_CONSUMER_KEY;
  const appSecret = process.env.TWITTER_CONSUMER_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    throw new Error(
      'Twitter credentials not configured. Set TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_TOKEN_SECRET in environment variables.'
    );
  }

  return new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });
}

export async function postTweet(text: string): Promise<{ success: boolean; tweetId?: string; tweetUrl?: string; error?: string }> {
  try {
    if (!text?.trim()) {
      return { success: false, error: 'Tweet text is required' };
    }

    // Truncate to 280 chars
    const tweetText = text.substring(0, 280);

    const client = getTwitterClient();
    const rwClient = client.readWrite;

    const result = await rwClient.v2.tweet(tweetText);

    console.log('[Twitter Direct] Tweet posted:', result.data.id);

    return {
      success: true,
      tweetId: result.data.id,
      tweetUrl: `https://x.com/i/status/${result.data.id}`,
    };
  } catch (error: unknown) {
    const err = error as Error & { code?: number; data?: unknown };
    console.error('[Twitter Direct] Error:', err.message, err.data || '');
    return {
      success: false,
      error: `Twitter API error: ${err.message}`,
    };
  }
}

export async function verifyTwitterCredentials(): Promise<{ valid: boolean; username?: string; error?: string }> {
  try {
    const client = getTwitterClient();
    const me = await client.v2.me();
    return { valid: true, username: me.data.username };
  } catch (error: unknown) {
    const err = error as Error;
    return { valid: false, error: err.message };
  }
}

export function isTwitterDirectConfigured(): boolean {
  return !!(
    process.env.TWITTER_CONSUMER_KEY &&
    process.env.TWITTER_CONSUMER_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    process.env.TWITTER_ACCESS_TOKEN_SECRET
  );
}
