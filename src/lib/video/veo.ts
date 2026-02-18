import { GoogleGenAI } from '@google/genai';
import type { GenerateVideosOperation } from '@google/genai';

const getClient = () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not set');
  return new GoogleGenAI({ apiKey });
};

export interface VeoVideoOptions {
  prompt: string;
  aspectRatio?: '16:9' | '9:16'; // landscape or portrait (shorts)
  resolution?: '720p' | '1080p';
  durationSeconds?: number; // up to 8
  generateAudio?: boolean;
  negativePrompt?: string;
}

export interface VeoVideoResult {
  videoData: Buffer;
  mimeType: string;
  durationSeconds: number;
}

/**
 * Generate a video using Google Veo 3.1
 * Returns the raw video bytes
 */
export async function generateVideo(options: VeoVideoOptions): Promise<VeoVideoResult> {
  const ai = getClient();

  console.log('[Veo] Starting video generation:', {
    prompt: options.prompt.substring(0, 80) + '...',
    aspectRatio: options.aspectRatio || '9:16',
    resolution: options.resolution || '720p',
  });

  // Start the video generation operation
  let operation: GenerateVideosOperation;
  try {
    operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: options.prompt,
      config: {
        aspectRatio: options.aspectRatio || '9:16', // default portrait for shorts
        resolution: options.resolution || '720p',
        durationSeconds: options.durationSeconds || 8,
        generateAudio: options.generateAudio ?? true,
        negativePrompt: options.negativePrompt,
        numberOfVideos: 1,
        personGeneration: 'allow_adult',
      },
    });
  } catch (err: unknown) {
    // Fallback to Veo 3.0 if 3.1 not available
    console.log('[Veo] 3.1 failed, trying Veo 3.0...');
    try {
      operation = await ai.models.generateVideos({
        model: 'veo-3.0-generate-preview',
        prompt: options.prompt,
        config: {
          aspectRatio: options.aspectRatio || '9:16',
          numberOfVideos: 1,
          personGeneration: 'allow_adult',
          generateAudio: options.generateAudio ?? true,
        },
      });
    } catch (err2: unknown) {
      // Try Veo 2
      console.log('[Veo] 3.0 failed, trying Veo 2.0...');
      operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: options.prompt,
        config: {
          aspectRatio: options.aspectRatio || '9:16',
          numberOfVideos: 1,
          personGeneration: 'allow_adult',
        },
      });
    }
  }

  console.log('[Veo] Operation started:', operation.name, 'done:', operation.done);

  // Poll until complete (video gen takes 1-3 minutes)
  const maxWait = 300_000; // 5 minutes max
  const pollInterval = 10_000; // 10 seconds
  const startTime = Date.now();

  while (!operation.done) {
    if (Date.now() - startTime > maxWait) {
      throw new Error('Video generation timed out after 5 minutes');
    }

    console.log(`[Veo] Polling... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    operation = await ai.operations.getVideosOperation({
      operation: operation,
    });
  }

  if (operation.error) {
    throw new Error(`Video generation failed: ${JSON.stringify(operation.error)}`);
  }

  const response = operation.response;
  if (!response?.generatedVideos?.length) {
    throw new Error('No videos were generated');
  }

  const video = response.generatedVideos[0];
  
  // Get video bytes - videoBytes is base64 encoded string
  let videoData: Buffer;
  if (video.video?.videoBytes) {
    videoData = Buffer.from(video.video.videoBytes, 'base64');
  } else if (video.video?.uri) {
    // Download from URI using API key
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const uri = video.video.uri.includes('?') 
      ? `${video.video.uri}&key=${apiKey}` 
      : `${video.video.uri}?key=${apiKey}`;
    const resp = await fetch(uri);
    if (!resp.ok) throw new Error(`Failed to download video: ${resp.status}`);
    const arrayBuffer = await resp.arrayBuffer();
    videoData = Buffer.from(arrayBuffer);
  } else {
    throw new Error('No video data in response');
  }

  console.log(`[Veo] Video generated successfully: ${videoData.length} bytes`);

  return {
    videoData,
    mimeType: 'video/mp4',
    durationSeconds: options.durationSeconds || 8,
  };
}

/**
 * Generate an image using Gemini for use as video thumbnail
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
