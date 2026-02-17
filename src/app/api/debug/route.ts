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

  return Response.json(diagnostics, { status: 200 });
}
