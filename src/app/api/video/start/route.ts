import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

interface VideoStartRequest {
  prompt: string;
  aspectRatio?: '16:9' | '9:16';
  resolution?: '720p' | '1080p' | '4k';
  durationSeconds?: 4 | 6 | 8;
  negativePrompt?: string;
  // Optional voiceover
  voiceoverScript?: string;
  voice?: string;
  // Metadata
  title?: string;
  description?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: VideoStartRequest = await req.json();

    if (!body.prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GOOGLE_GENERATIVE_AI_API_KEY not set' }, { status: 500 });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const aspectRatio = body.aspectRatio || '9:16';
    const resolution = body.resolution || '720p';
    const durationSeconds = (resolution === '1080p' || resolution === '4k') ? 8 : (body.durationSeconds || 8);

    // Model fallback chain
    const models = [
      'veo-3.1-generate-preview',
      'veo-3.0-generate-preview',
      'veo-2.0-generate-001',
    ];

    let operation = null;
    let usedModel = '';
    const errors: string[] = [];

    for (const model of models) {
      try {
        console.log(`[Veo] Trying model: ${model}`);
        const isVeo3 = model.includes('3.0') || model.includes('3.1');

        operation = await ai.models.generateVideos({
          model,
          prompt: body.prompt,
          config: {
            aspectRatio,
            ...(isVeo3 ? { resolution } : {}),
            ...(durationSeconds ? { durationSeconds } : {}),
            numberOfVideos: 1,
            personGeneration: 'allow_all',
            ...(body.negativePrompt ? { negativePrompt: body.negativePrompt } : { negativePrompt: 'low quality, blurry, distorted' }),
          },
        });

        usedModel = model;
        console.log(`[Veo] Operation started: ${operation.name}, done: ${operation.done}`);
        break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${model}: ${msg}`);
        console.log(`[Veo] ${model} failed: ${msg}`);
      }
    }

    if (!operation?.name) {
      return NextResponse.json({
        error: 'All Veo models failed to start generation',
        details: errors,
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'processing',
      operationName: operation.name,
      model: usedModel,
      config: { aspectRatio, resolution, durationSeconds },
      prompt: body.prompt,
      voiceoverScript: body.voiceoverScript,
      voice: body.voice,
      title: body.title,
      description: body.description,
      done: operation.done || false,
    });

  } catch (error: unknown) {
    console.error('[Veo Start] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start video generation' },
      { status: 500 }
    );
  }
}
