import { NextResponse } from 'next/server';
import { pdClient } from '@/lib/pd-client';
import { SOCIAL_PLATFORMS, EXTERNAL_USER_ID } from '@/lib/social/config';

export const maxDuration = 15;

/**
 * POST /api/social/connect
 * Body: { platform: "reddit" | "twitter" | "facebook" | "linkedin" }
 * Returns: { connectUrl: string }
 * 
 * Generates a Pipedream Connect Link that opens in a new tab for the user
 * to OAuth into the requested platform.
 */
export async function POST(req: Request) {
  try {
    const { platform } = await req.json();
    
    const platformConfig = SOCIAL_PLATFORMS[platform];
    if (!platformConfig) {
      return NextResponse.json(
        { error: `Unknown platform: ${platform}. Supported: ${Object.keys(SOCIAL_PLATFORMS).join(', ')}` },
        { status: 400 }
      );
    }

    const client = pdClient();
    
    // Create a connect token for the OAuth flow
    const tokenResponse = await client.tokens.create({
      externalUserId: EXTERNAL_USER_ID,
    });

    // Build the Connect Link URL
    const connectUrl = `https://pipedream.com/_static/connect.html?token=${tokenResponse.token}&connectLink=true&app=${platformConfig.appSlug}`;

    console.log(`[Social] Generated connect link for ${platform}: token=${tokenResponse.token}`);

    return NextResponse.json({ 
      connectUrl,
      platform: platformConfig.name,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Social] Connect error:', err.message);
    return NextResponse.json(
      { error: `Failed to generate connect link: ${err.message}` },
      { status: 500 }
    );
  }
}
