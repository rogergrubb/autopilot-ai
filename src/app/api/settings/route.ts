import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const DEFAULT_USER_ID = 'd30ca60b-0f38-498c-895d-30af8356af4a';

// Which env vars power which features
const ENV_VAR_MAP = {
  GOOGLE_GENERATIVE_AI_API_KEY: { label: 'Google Gemini', feature: 'AI Chat (Gemini 2.5 Pro/Flash)', where: 'Google AI Studio → API Keys' },
  ANTHROPIC_API_KEY: { label: 'Anthropic', feature: 'Deep Research (Claude Haiku)', where: 'console.anthropic.com → API Keys' },
  OPENAI_API_KEY: { label: 'OpenAI', feature: 'Image Generation (DALL-E 3)', where: 'platform.openai.com → API Keys' },
  BROWSERBASE_API_KEY: { label: 'Browserbase', feature: 'Web Browser (Playwright)', where: 'browserbase.com → Settings → API Keys' },
  BROWSERBASE_PROJECT_ID: { label: 'Browserbase Project', feature: 'Web Browser sessions', where: 'browserbase.com → Overview → Project ID' },
  E2B_API_KEY: { label: 'E2B', feature: 'Code Sandbox (Python/JS)', where: 'e2b.dev → Dashboard → API Keys' },
  PIPEDREAM_CLIENT_ID: { label: 'Pipedream', feature: '3000+ App Integrations', where: 'pipedream.com → Project → OAuth Clients' },
  PIPEDREAM_CLIENT_SECRET: { label: 'Pipedream Secret', feature: '3000+ App Integrations', where: 'pipedream.com → Project → OAuth Clients' },
  PIPEDREAM_PROJECT_ID: { label: 'Pipedream Project', feature: 'MCP Server', where: 'pipedream.com → Project Settings' },
  DATABASE_URL: { label: 'Database', feature: 'Chat history, Projects, Knowledge, Notifications', where: 'Neon → Dashboard → Connection String' },
  NEXTAUTH_SECRET: { label: 'NextAuth', feature: 'Authentication', where: 'Generate with: openssl rand -base64 32' },
  TWILIO_ACCOUNT_SID: { label: 'Twilio', feature: 'AI Phone Calls', where: 'twilio.com → Console → Account Info → Account SID' },
  TWILIO_AUTH_TOKEN: { label: 'Twilio Auth', feature: 'AI Phone Calls', where: 'twilio.com → Console → Account Info → Auth Token' },
  TWILIO_PHONE_NUMBER: { label: 'Twilio Number', feature: 'AI Phone Calls (caller ID)', where: 'twilio.com → Phone Numbers → Manage → Active Numbers' },
} as const;

// GET /api/settings — return user settings + env var status
export async function GET() {
  // Build env var status (never expose actual values)
  const envStatus = Object.entries(ENV_VAR_MAP).map(([key, info]) => ({
    key,
    label: info.label,
    feature: info.feature,
    where: info.where,
    configured: !!process.env[key],
  }));

  const configured = envStatus.filter(e => e.configured).length;
  const total = envStatus.length;

  // Get user settings from DB
  let userSettings: Record<string, unknown> = {};
  let userName = 'User';
  let userEmail = '';
  if (db) {
    try {
      const row = await db.select().from(users).where(eq(users.id, DEFAULT_USER_ID)).limit(1);
      if (row.length) {
        userSettings = (row[0].settings as Record<string, unknown>) || {};
        userName = row[0].name || 'User';
        userEmail = row[0].email || '';
      }
    } catch {}
  }

  return NextResponse.json({
    user: { name: userName, email: userEmail },
    settings: userSettings,
    envVars: envStatus,
    summary: { configured, total, percentage: Math.round((configured / total) * 100) },
  });
}

// PUT /api/settings — update user settings
export async function PUT(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const body = await req.json();
    const { name, email, settings } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (settings !== undefined) updates.settings = settings;

    await db.update(users).set(updates).where(eq(users.id, DEFAULT_USER_ID));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Settings PUT]', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
