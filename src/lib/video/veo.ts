import { GoogleGenAI } from '@google/genai';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';

const getClient = () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not set');
  return new GoogleGenAI({ apiKey });
};

export interface VeoVideoOptions {
  prompt: string;
  aspectRatio?: '16:9' | '9:16'; // landscape or portrait (shorts)
  resolution?: '720p' | '1080p' | '4k';
  durationSeconds?: 4 | 6 | 8;
  negativePrompt?: string;
}

export interface VeoVideoResult {
  videoData: Buffer;
  mimeType: string;
  durationSeconds: number;
}

// Model fallback chain
const VEO_MODELS = [
  'veo-3.1-generate-preview',
  'veo-3.0-generate-preview',
  'veo-2.0-generate-001',
];

/**
 * Generate a video using Google Veo (3.1 → 3.0 → 2.0 fallback)
 * Returns raw video bytes as a Buffer
 */
export async function generateVideo(options: VeoVideoOptions): Promise<VeoVideoResult> {
  const ai = getClient();
  const aspectRatio = options.aspectRatio || '9:16';
  const resolution = options.resolution || '720p';
  // 1080p and 4k only support 8s duration
  const durationSeconds = (resolution === '1080p' || resolution === '4k') ? 8 : (options.durationSeconds || 8);

  console.log('[Veo] Starting video generation:', {
    prompt: options.prompt.substring(0, 80) + '...',
    aspectRatio,
    resolution,
    durationSeconds,
  });

  // Try each model in the fallback chain
  let operation: Awaited<ReturnType<typeof ai.models.generateVideos>> | null = null;
  let usedModel = '';

  for (const model of VEO_MODELS) {
    try {
      console.log(`[Veo] Trying model: ${model}`);

      // Build config based on model version
      const isVeo31 = model.includes('3.1');
      const isVeo3 = model.includes('3.0') || isVeo31;

      operation = await ai.models.generateVideos({
        model,
        prompt: options.prompt,
        config: {
          aspectRatio,
          // Resolution only supported in Veo 3.x+
          ...(isVeo3 ? { resolution } : {}),
          // Duration
          ...(durationSeconds ? { durationSeconds } : {}),
          numberOfVideos: 1,
          // Text-to-video: Veo 3.1 requires "allow_all", Veo 3 requires "allow_all"
          // Veo 2 supports "allow_adult", "allow_all", "dont_allow"
          personGeneration: (isVeo31 || isVeo3) ? 'allow_all' : 'allow_adult',
          // Negative prompt
          ...(options.negativePrompt ? { negativePrompt: options.negativePrompt } : {}),
        },
      });

      usedModel = model;
      console.log(`[Veo] Operation started with ${model}:`, operation.name, 'done:', operation.done);
      break; // Success, exit fallback loop

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[Veo] ${model} failed: ${msg}`);
      if (model === VEO_MODELS[VEO_MODELS.length - 1]) {
        throw new Error(`All Veo models failed. Last error: ${msg}`);
      }
      // Continue to next model
    }
  }

  if (!operation) {
    throw new Error('No Veo model was able to start generation');
  }

  // Poll until complete (video gen takes ~11s to 6 minutes per docs)
  const maxWait = 360_000; // 6 minutes max
  const pollInterval = 10_000; // 10 seconds (matches docs examples)
  const startTime = Date.now();

  while (!operation.done) {
    if (Date.now() - startTime > maxWait) {
      throw new Error('Video generation timed out after 6 minutes');
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Veo] Polling... (${elapsed}s elapsed)`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    // Poll using the SDK's operation polling method
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (operation.error) {
    throw new Error(`Video generation failed: ${JSON.stringify(operation.error)}`);
  }

  const response = operation.response;
  if (!response?.generatedVideos?.length) {
    throw new Error('No videos were generated (may have been blocked by safety filters)');
  }

  const generatedVideo = response.generatedVideos[0];

  // Download using the SDK's file download (saves to /tmp on Vercel)
  const tmpPath = `/tmp/veo_${randomUUID()}.mp4`;

  try {
    console.log(`[Veo] Downloading video to ${tmpPath}...`);
    await ai.files.download({
      file: generatedVideo.video!,
      downloadPath: tmpPath,
    });

    // Read the file into a Buffer
    const videoData = readFileSync(tmpPath);
    console.log(`[Veo] Video downloaded: ${videoData.length} bytes (model: ${usedModel})`);

    return {
      videoData,
      mimeType: 'video/mp4',
      durationSeconds,
    };
  } finally {
    // Clean up temp file
    try {
      if (existsSync(tmpPath)) unlinkSync(tmpPath);
    } catch {
      // ignore cleanup errors
    }
  }
}

/**
 * Generate an image using Gemini for use as video thumbnail or reference
 */
export async function generateThumbnail(prompt: string): Promise<{ imageData: Buffer; mimeType: string }> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-05-20',
    contents: prompt,
    config: {
      responseModalities: ['IMAGE'],
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.[0];
  if (part && 'inlineData' in part && part.inlineData?.data) {
    return {
      imageData: Buffer.from(part.inlineData.data, 'base64'),
      mimeType: part.inlineData.mimeType || 'image/png',
    };
  }

  throw new Error('No image generated');
}

export function isVeoConfigured(): boolean {
  return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}
