import { NextResponse } from 'next/server';
import { pdClient } from '@/lib/pd-client';
import { SOCIAL_PLATFORMS, EXTERNAL_USER_ID } from '@/lib/social/config';
import { postTweet, isTwitterDirectConfigured } from '@/lib/social/twitter-direct';

export const maxDuration = 30;

interface PostRequest {
  platform: string;
  content: string;
  title?: string;         // Required for Reddit
  subreddit?: string;     // Required for Reddit
  pageId?: string;        // Required for Facebook
  url?: string;           // Optional link to include
}

/**
 * POST /api/social/post
 * Body: PostRequest
 * Returns: { success: true, result: any } or { error: string, connectUrl?: string }
 * 
 * Posts content to the specified social platform using Pipedream Connect.
 * If the user hasn't connected their account, returns a connectUrl they can use.
 */
export async function POST(req: Request) {
  try {
    const body: PostRequest = await req.json();
    const { platform, content, title, subreddit, pageId, url } = body;

    const platformConfig = SOCIAL_PLATFORMS[platform];
    if (!platformConfig) {
      return NextResponse.json(
        { error: `Unknown platform: ${platform}` },
        { status: 400 }
      );
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Direct Twitter integration (bypasses Pipedream)
    if (platform === 'twitter' && isTwitterDirectConfigured()) {
      console.log('[Social] Using direct Twitter API');
      const result = await postTweet(content);
      if (result.success) {
        return NextResponse.json({
          success: true,
          platform: 'Twitter/X',
          result: {
            tweetId: result.tweetId,
            tweetUrl: result.tweetUrl,
          },
        });
      } else {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }
    }

    const client = pdClient();

    // Check if user has connected this platform
    const { data: accounts } = await client.accounts.list({
      externalUserId: EXTERNAL_USER_ID,
      includeCredentials: false,
    });

    const account = accounts?.find(
      (acc) => acc.app?.nameSlug === platformConfig.appSlug
    );

    if (!account) {
      // Generate connect link
      const tokenResponse = await client.tokens.create({
        externalUserId: EXTERNAL_USER_ID,
      });
      const connectUrl = `https://pipedream.com/_static/connect.html?token=${tokenResponse.token}&connectLink=true&app=${platformConfig.appSlug}`;
      
      return NextResponse.json({
        error: `${platformConfig.name} account not connected. Please connect your account first.`,
        connectUrl,
        needsConnection: true,
      }, { status: 401 });
    }

    // Build platform-specific props
    let actionProps: Record<string, unknown> = {};

    switch (platform) {
      case 'reddit':
        if (!subreddit) {
          return NextResponse.json({ error: 'subreddit is required for Reddit posts' }, { status: 400 });
        }
        actionProps = {
          reddit: { authProvisionId: account.id },
          subreddit,
          title: title || content.substring(0, 300),
          text: content,
          kind: 'self',  // text post
        };
        break;

      case 'twitter':
        actionProps = {
          twitter: { authProvisionId: account.id },
          text: content.substring(0, 280),
        };
        break;

      case 'facebook':
        actionProps = {
          facebook_pages: { authProvisionId: account.id },
          message: content,
          ...(pageId && { page: pageId }),
          ...(url && { link: url }),
        };
        break;

      case 'linkedin':
        actionProps = {
          linkedin: { authProvisionId: account.id },
          text: content,
          ...(url && { url }),
        };
        break;

      default:
        return NextResponse.json({ error: `Posting to ${platform} not implemented` }, { status: 400 });
    }

    console.log(`[Social] Posting to ${platform} with action: ${platformConfig.postActionKey}`);

    // Execute the Pipedream action
    const result = await client.actions.run({
      externalUserId: EXTERNAL_USER_ID,
      id: platformConfig.postActionKey,
      configuredProps: actionProps,
    });

    console.log(`[Social] Successfully posted to ${platform}`);

    return NextResponse.json({
      success: true,
      platform: platformConfig.name,
      result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Social] Post error:', err.message);
    
    // Check if it's an auth error
    if (err.message?.includes('auth') || err.message?.includes('credential') || err.message?.includes('connect')) {
      return NextResponse.json({
        error: `Authentication error: ${err.message}. Please reconnect your account in Settings.`,
        needsConnection: true,
      }, { status: 401 });
    }

    return NextResponse.json(
      { error: `Failed to post: ${err.message}` },
      { status: 500 }
    );
  }
}
