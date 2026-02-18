import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, unlinkSync, existsSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

export const maxDuration = 60;

interface VideoPollRequest {
  operationName: string;
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

    // Poll using REST API directly (SDK method doesn't work with deserialized operation names)
    const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${body.operationName}`;
    console.log(`[Veo Poll] Checking: ${pollUrl}`);

    const pollResponse = await fetch(pollUrl, {
      headers: { 'X-goog-api-key': apiKey },
    });

    if (!pollResponse.ok) {
      const errorText = await pollResponse.text();
      console.error(`[Veo Poll] API error ${pollResponse.status}: ${errorText}`);
      return NextResponse.json({
        status: 'error',
        error: `Veo API error (${pollResponse.status}): ${errorText}`,
      }, { status: 500 });
    }

    const operation = await pollResponse.json();
    console.log(`[Veo Poll] Operation done: ${operation.done}, has response: ${!!operation.response}`);

    if (!operation.done) {
      return NextResponse.json({
        status: 'processing',
        operationName: body.operationName,
        done: false,
        message: 'Video is still generating. Poll again in 10-15 seconds.',
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
    const generatedVideos = operation.response?.generatedVideos;
    if (!generatedVideos?.length) {
      return NextResponse.json({
        status: 'error',
        done: true,
        error: 'No videos generated (may have been blocked by safety filters)',
      }, { status: 500 });
    }

    const videoInfo = generatedVideos[0];
    
    // Download the video using the SDK (handles auth properly)
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const tmpPath = `/tmp/veo_${randomUUID()}.mp4`;

    try {
      console.log(`[Veo Poll] Downloading video...`, JSON.stringify(videoInfo.video || {}).substring(0, 200));
      
      // Try SDK download first
      try {
        await ai.files.download({
          file: videoInfo.video,
          downloadPath: tmpPath,
        });
      } catch (downloadErr) {
        // If SDK download fails, try direct URI fetch
        console.log(`[Veo Poll] SDK download failed, trying direct URI...`, downloadErr);
        const videoUri = videoInfo.video?.uri;
        if (!videoUri) {
          throw new Error('No video URI available for download');
        }
        
        const videoFetch = await fetch(videoUri, {
          headers: { 'X-goog-api-key': apiKey },
        });
        
        if (!videoFetch.ok) {
          throw new Error(`Direct video download failed: ${videoFetch.status}`);
        }
        
        const videoBuffer = Buffer.from(await videoFetch.arrayBuffer());
        writeFileSync(tmpPath, videoBuffer);
      }

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
