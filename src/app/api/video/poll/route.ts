import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';

export const maxDuration = 60;

interface VideoPollRequest {
  operationName: string;
  // If done, also generate voiceover
  voiceoverScript?: string;
  voice?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: VideoPollRequest = await req.json();

    if (!body.operationName) {
      return NextResponse.json({ error: 'operationName is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GOOGLE_GENERATIVE_AI_API_KEY not set' }, { status: 500 });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    // Poll the operation
    console.log(`[Veo Poll] Checking operation: ${body.operationName}`);

    const operation = await ai.operations.getVideosOperation({
      operation: { name: body.operationName } as Parameters<typeof ai.operations.getVideosOperation>[0]['operation'],
    });

    if (!operation.done) {
      return NextResponse.json({
        status: 'processing',
        operationName: body.operationName,
        done: false,
        message: 'Video is still generating. Poll again in 10 seconds.',
      });
    }

    // Check for errors
    if (operation.error) {
      return NextResponse.json({
        status: 'error',
        operationName: body.operationName,
        done: true,
        error: JSON.stringify(operation.error),
      }, { status: 500 });
    }

    // Get the generated video
    const response = operation.response;
    if (!response?.generatedVideos?.length) {
      return NextResponse.json({
        status: 'error',
        done: true,
        error: 'No videos generated (may have been blocked by safety filters)',
      }, { status: 500 });
    }

    const generatedVideo = response.generatedVideos[0];
    const tmpPath = `/tmp/veo_${randomUUID()}.mp4`;

    try {
      console.log(`[Veo Poll] Downloading video to ${tmpPath}...`);
      await ai.files.download({
        file: generatedVideo.video!,
        downloadPath: tmpPath,
      });

      const videoData = readFileSync(tmpPath);
      console.log(`[Veo Poll] Video downloaded: ${videoData.length} bytes`);

      const result: Record<string, unknown> = {
        status: 'complete',
        operationName: body.operationName,
        done: true,
        video: {
          size: videoData.length,
          mimeType: 'video/mp4',
          base64: videoData.toString('base64'),
        },
      };

      // Generate voiceover if script provided
      if (body.voiceoverScript && process.env.ELEVENLABS_API_KEY) {
        try {
          const { generateVoiceover } = await import('@/lib/video/elevenlabs');
          const audio = await generateVoiceover({
            text: body.voiceoverScript,
            voice: (body.voice as 'adam') || 'adam',
          });
          result.voiceover = {
            size: audio.length,
            mimeType: 'audio/mpeg',
            base64: audio.toString('base64'),
          };
          console.log(`[Veo Poll] Voiceover generated: ${audio.length} bytes`);
        } catch (err: unknown) {
          result.voiceoverError = err instanceof Error ? err.message : String(err);
        }
      }

      return NextResponse.json(result);

    } finally {
      try {
        if (existsSync(tmpPath)) unlinkSync(tmpPath);
      } catch { /* ignore */ }
    }

  } catch (error: unknown) {
    console.error('[Veo Poll] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to poll video status' },
      { status: 500 }
    );
  }
}
