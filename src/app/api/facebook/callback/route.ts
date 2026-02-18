import { NextResponse } from 'next/server';

/**
 * Step 2: Facebook redirects here with a code.
 * We exchange it for tokens automatically and display the result.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return new NextResponse(renderHTML('Error', `Facebook authorization failed: ${error}`), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (!code) {
    return new NextResponse(renderHTML('Error', 'No authorization code received from Facebook.'), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const appId = process.env.FACEBOOK_APP_ID || '1566864167729969';
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appSecret) {
    return new NextResponse(renderHTML('Error', 'FACEBOOK_APP_SECRET not configured in environment variables.'), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const redirectUri = `${url.origin}/api/facebook/callback`;

  try {
    // Step 1: Exchange code for short-lived user token
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return new NextResponse(renderHTML('Error', `Token exchange failed: ${tokenData.error.message}`), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const shortLivedToken = tokenData.access_token;

    // Step 2: Exchange for long-lived user token
    const longLivedUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData = await longLivedRes.json();

    if (longLivedData.error) {
      return new NextResponse(renderHTML('Error', `Long-lived token exchange failed: ${longLivedData.error.message}`), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const longLivedUserToken = longLivedData.access_token;

    // Step 3: Get all pages and their permanent tokens
    const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedUserToken}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      return new NextResponse(renderHTML('Error', `Failed to get pages: ${pagesData.error.message}`), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return new NextResponse(renderHTML('No Pages Found', 'No Facebook Pages were found for your account. Make sure you selected a Page during authorization.'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Step 4: Test posting with the first page (or configured page)
    const configuredPageId = process.env.FACEBOOK_PAGE_ID;
    const targetPage = pages.find((p: { id: string }) => p.id === configuredPageId) || pages[0];

    // Step 5: Verify the token works by getting page info
    const verifyUrl = `https://graph.facebook.com/v21.0/${targetPage.id}?fields=name,id,fan_count&access_token=${targetPage.access_token}`;
    const verifyRes = await fetch(verifyUrl);
    const verifyData = await verifyRes.json();

    const html = renderSuccessHTML(
      targetPage.id,
      targetPage.name || verifyData.name || 'Unknown Page',
      targetPage.access_token,
      pages.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
    );

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (err: unknown) {
    return new NextResponse(renderHTML('Error', `Unexpected error: ${(err as Error).message}`), {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

function renderHTML(title: string, message: string): string {
  return `<!DOCTYPE html>
<html><head><title>Facebook Setup - ${title}</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:60px auto;padding:20px;background:#f5f5f5;}
.card{background:white;border-radius:12px;padding:30px;box-shadow:0 2px 10px rgba(0,0,0,0.1);}
h1{color:#1877F2;margin-top:0;} .error{color:#e74c3c;}</style></head>
<body><div class="card"><h1 class="error">${title}</h1><p>${message}</p></div></body></html>`;
}

function renderSuccessHTML(pageId: string, pageName: string, pageToken: string, allPages: { id: string; name: string }[]): string {
  return `<!DOCTYPE html>
<html><head><title>Facebook Setup Complete!</title>
<style>
body{font-family:-apple-system,system-ui,sans-serif;max-width:700px;margin:60px auto;padding:20px;background:#f5f5f5;}
.card{background:white;border-radius:12px;padding:30px;box-shadow:0 2px 10px rgba(0,0,0,0.1);margin-bottom:20px;}
h1{color:#22c55e;margin-top:0;} h2{color:#333;margin-top:0;}
.success{background:#f0fdf4;border:1px solid #22c55e;border-radius:8px;padding:15px;margin:15px 0;}
.token-box{background:#f8f9fa;border:1px solid #ddd;border-radius:8px;padding:12px;font-family:monospace;font-size:11px;word-break:break-all;margin:10px 0;position:relative;}
.copy-btn{background:#1877F2;color:white;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;font-size:14px;margin-top:8px;}
.copy-btn:hover{background:#1565C0;}
.step{background:#f8f9fa;border-radius:8px;padding:15px;margin:10px 0;}
.step-num{background:#1877F2;color:white;border-radius:50%;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;margin-right:8px;}
table{width:100%;border-collapse:collapse;margin:10px 0;}
td{padding:8px;border-bottom:1px solid #eee;font-size:14px;}
td:first-child{font-weight:bold;color:#555;width:200px;}
</style></head>
<body>
<div class="card">
  <h1>✅ Facebook Setup Complete!</h1>
  <div class="success">
    <strong>Permanent Page Token generated for "${pageName}"</strong><br>
    This token never expires. You only need to do this once.
  </div>
  
  <table>
    <tr><td>Page Name</td><td>${pageName}</td></tr>
    <tr><td>Page ID</td><td><code>${pageId}</code></td></tr>
  </table>
</div>

<div class="card">
  <h2>Update Vercel Environment Variables</h2>
  <p>Copy these values and update them in your Vercel project settings:</p>
  
  <div class="step">
    <span class="step-num">1</span> Set <strong>FACEBOOK_PAGE_ID</strong> to:
    <div class="token-box" id="pageId">${pageId}</div>
    <button class="copy-btn" onclick="copyText('pageId')">📋 Copy Page ID</button>
  </div>

  <div class="step">
    <span class="step-num">2</span> Set <strong>FACEBOOK_PAGE_ACCESS_TOKEN</strong> to:
    <div class="token-box" id="pageToken">${pageToken}</div>
    <button class="copy-btn" onclick="copyText('pageToken')">📋 Copy Page Token</button>
  </div>

  <div class="step">
    <span class="step-num">3</span> <strong>Redeploy</strong> your Vercel project
  </div>
  
  <p style="margin-top:20px;">
    <a href="https://vercel.com/roger-grubbs-projects-2e0adcba/fullsendai/settings/environment-variables" 
       target="_blank" class="copy-btn" style="text-decoration:none;display:inline-block;">
      🔧 Open Vercel Env Settings
    </a>
  </p>
</div>

${allPages.length > 1 ? `
<div class="card">
  <h2>All Available Pages</h2>
  <table>
    ${allPages.map(p => `<tr><td>${p.name}</td><td><code>${p.id}</code></td></tr>`).join('')}
  </table>
</div>` : ''}

<script>
function copyText(id) {
  const text = document.getElementById(id).innerText;
  navigator.clipboard.writeText(text).then(() => {
    event.target.textContent = '✅ Copied!';
    setTimeout(() => { event.target.textContent = '📋 Copy'; }, 2000);
  });
}
</script>
</body></html>`;
}
