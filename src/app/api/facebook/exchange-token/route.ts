import { NextResponse } from 'next/server';

/**
 * Exchange a short-lived Facebook token for a long-lived Page Access Token.
 * 
 * GET /api/facebook/exchange-token?token=SHORT_LIVED_TOKEN
 * 
 * Uses FACEBOOK_APP_ID and FACEBOOK_APP_SECRET from env vars.
 * Returns the permanent Page Access Token.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const shortToken = searchParams.get('token');
  
  const appId = process.env.FACEBOOK_APP_ID || '1566864167729969';
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  
  if (!appSecret) {
    return NextResponse.json({ error: 'FACEBOOK_APP_SECRET not configured' }, { status: 500 });
  }
  
  if (!shortToken) {
    return NextResponse.json({ error: 'Provide ?token=SHORT_LIVED_TOKEN' }, { status: 400 });
  }

  try {
    // Step 1: Exchange short-lived user token for long-lived user token
    const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`;
    const exchangeRes = await fetch(exchangeUrl);
    const exchangeData = await exchangeRes.json();
    
    if (exchangeData.error) {
      return NextResponse.json({ error: 'Token exchange failed', details: exchangeData.error }, { status: 400 });
    }
    
    const longLivedUserToken = exchangeData.access_token;
    
    // Step 2: Get Page Access Token from long-lived user token
    // Page tokens derived from long-lived user tokens are automatically long-lived (no expiry)
    const pageId = process.env.FACEBOOK_PAGE_ID || '61588134012621';
    const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedUserToken}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();
    
    if (pagesData.error) {
      return NextResponse.json({ 
        error: 'Failed to get page tokens', 
        details: pagesData.error,
        longLivedUserToken // Return the user token at least
      }, { status: 400 });
    }
    
    // Find the specific page
    const page = pagesData.data?.find((p: { id: string }) => p.id === pageId);
    
    if (page) {
      return NextResponse.json({
        success: true,
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        message: 'This Page Access Token is permanent (never expires). Set it as FACEBOOK_PAGE_ACCESS_TOKEN in Vercel env vars.',
        allPages: pagesData.data?.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
      });
    } else {
      // Return all available pages so user can pick
      return NextResponse.json({
        success: true,
        message: `Page ID ${pageId} not found. Available pages listed below.`,
        longLivedUserToken,
        allPages: pagesData.data?.map((p: { id: string; name: string; access_token: string }) => ({ 
          id: p.id, 
          name: p.name, 
          pageAccessToken: p.access_token 
        })),
      });
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
