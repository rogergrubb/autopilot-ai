/**
 * Image Generation Tool
 * 
 * Uses OpenAI's DALL-E 3 API to generate images from text descriptions.
 * Returns the image URL which can be displayed in chat.
 * 
 * Cost: ~$0.04 per standard image, $0.08 per HD image
 */

const DALLE_API_URL = 'https://api.openai.com/v1/images/generations';

export interface ImageResult {
  status: 'success' | 'error';
  prompt: string;
  imageUrl?: string;
  revisedPrompt?: string;
  size: string;
  quality: string;
  error?: string;
}

export async function generateImage(
  prompt: string,
  options?: {
    size?: '1024x1024' | '1792x1024' | '1024x1792';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
  },
): Promise<ImageResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      status: 'error',
      prompt,
      size: options?.size || '1024x1024',
      quality: options?.quality || 'standard',
      error: 'OPENAI_API_KEY not set — needed for image generation',
    };
  }

  const size = options?.size || '1024x1024';
  const quality = options?.quality || 'standard';
  const style = options?.style || 'vivid';

  try {
    console.log(`[ImageGen] Generating: "${prompt.slice(0, 80)}..." (${size}, ${quality})`);
    const startTime = Date.now();

    const response = await fetch(DALLE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
        quality,
        style,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const image = data.data?.[0];
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[ImageGen] Generated in ${elapsed}s`);

    return {
      status: 'success',
      prompt,
      imageUrl: image?.url,
      revisedPrompt: image?.revised_prompt,
      size,
      quality,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ImageGen] Failed:`, message);
    return {
      status: 'error',
      prompt,
      size,
      quality,
      error: message,
    };
  }
}
