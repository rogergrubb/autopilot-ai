import { generateText } from 'ai';
import { primaryModel } from '@/lib/ai/config';

export const maxDuration = 30;

export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY 
        ? `${process.env.GOOGLE_GENERATIVE_AI_API_KEY.slice(0, 10)}...${process.env.GOOGLE_GENERATIVE_AI_API_KEY.slice(-4)} (${process.env.GOOGLE_GENERATIVE_AI_API_KEY.length} chars)`
        : 'NOT SET',
      PIPEDREAM_CLIENT_ID: process.env.PIPEDREAM_CLIENT_ID ? 'SET' : 'NOT SET',
      PIPEDREAM_CLIENT_SECRET: process.env.PIPEDREAM_CLIENT_SECRET ? 'SET' : 'NOT SET',
      PIPEDREAM_PROJECT_ID: process.env.PIPEDREAM_PROJECT_ID ? 'SET' : 'NOT SET',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      TWITTER_CONSUMER_KEY: process.env.TWITTER_CONSUMER_KEY ? `SET (${process.env.TWITTER_CONSUMER_KEY.length} chars)` : 'NOT SET',
      TWITTER_CONSUMER_SECRET: process.env.TWITTER_CONSUMER_SECRET ? `SET (${process.env.TWITTER_CONSUMER_SECRET.length} chars)` : 'NOT SET',
      TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN ? `SET (${process.env.TWITTER_ACCESS_TOKEN.length} chars)` : 'NOT SET',
      TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET ? `SET (${process.env.TWITTER_ACCESS_TOKEN_SECRET.length} chars)` : 'NOT SET',
    },
  };

  // Test Gemini API
  try {
    const result = await generateText({
      model: primaryModel,
      prompt: 'Say "hello" and nothing else.',
    });
    diagnostics.gemini = { status: 'OK', response: result.text };
  } catch (error: unknown) {
    const err = error as Error;
    diagnostics.gemini = { 
      status: 'ERROR', 
      message: err.message,
      name: err.name,
    };
  }

  // Test Pipedream SDK authentication
  try {
    const { PipedreamClient } = await import('@pipedream/sdk');
    const client = new PipedreamClient();
    const token = await client.rawAccessToken;
    diagnostics.pipedream = {
      status: token ? 'OK' : 'NO_TOKEN',
      tokenPreview: token ? `${String(token).slice(0, 15)}...` : null,
    };
  } catch (error: unknown) {
    const err = error as Error;
    diagnostics.pipedream = {
      status: 'ERROR',
      message: err.message,
    };
  }

  // Test Twitter Direct API
  try {
    const { verifyTwitterCredentials, isTwitterDirectConfigured } = await import('@/lib/social/twitter-direct');
    if (isTwitterDirectConfigured()) {
      const result = await verifyTwitterCredentials();
      diagnostics.twitter = result.valid 
        ? { status: 'OK', username: result.username }
        : { status: 'ERROR', message: result.error };
    } else {
      diagnostics.twitter = { status: 'NOT_CONFIGURED' };
    }
  } catch (error: unknown) {
    const err = error as Error;
    diagnostics.twitter = { status: 'ERROR', message: err.message };
  }

  return Response.json(diagnostics, { status: 200 });
}
