import { NextResponse } from 'next/server';

/**
 * Step 1: Redirect user to Facebook OAuth with the correct permissions.
 * Visit /api/facebook/auth to start the flow.
 */
export async function GET(req: Request) {
  const appId = process.env.FACEBOOK_APP_ID || '1566864167729969';
  
  // Build the redirect URI (same host)
  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/facebook/callback`;
  
  const permissions = [
    'pages_manage_posts',
    'pages_read_engagement',
    'pages_show_list',
  ].join(',');

  const facebookAuthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${permissions}&response_type=code`;

  return NextResponse.redirect(facebookAuthUrl);
}
