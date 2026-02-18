import { NextRequest, NextResponse } from 'next/server';
import { generateVideo, generateThumbnail } from '@/lib/video/veo';
import { generateVoiceover, VoiceName } from '@/lib/video/elevenlabs';

// Allow up to 5 minutes for video generation
export const maxDuration = 300;

interface VideoGenerateRequest {
  // Video prompt for Veo
  videoPrompt: string;
  // Optional voiceover script
  voiceoverScript?: string;
  // Voice for voiceover
  voice?: VoiceName;
  // Video settings
  aspectRatio?: '16:9' | '9:16';
  resolution?: '720p' | '1080p';
  // Thumbnail
  generateThumbnailImage?: boolean;
  thumbnailPrompt?: string;
  // Metadata
  title?: string;
  description?: string;
  tags?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body: VideoGenerateRequest = await req.json();
    
    if (!body.videoPrompt) {
      return NextResponse.json({ error: 'videoPrompt is required' }, { status: 400 });
    }

    const results: Record<string, unknown> = {
      status: 'generating',
      steps: [],
    };

    // Step 1: Generate video with Veo
    console.log('[VideoGen] Step 1: Generating video with Veo...');
    const video = await generateVideo({
      prompt: body.videoPrompt,
      aspectRatio: body.aspectRatio || '9:16',
      resolution: body.resolution || '720p',
      generateAudio: true,
    });
    
    // Convert to base64 for transport
    const videoBase64 = video.videoData.toString('base64');
    (results.steps as string[]).push('video_generated');
    results.video = {
      size: video.videoData.length,
      mimeType: video.mimeType,
      durationSeconds: video.durationSeconds,
      base64Length: videoBase64.length,
    };

    // Step 2: Generate voiceover if script provided
    let voiceoverBase64: string | undefined;
    if (body.voiceoverScript) {
      console.log('[VideoGen] Step 2: Generating voiceover with 11Labs...');
      try {
        const audio = await generateVoiceover({
          text: body.voiceoverScript,
          voice: body.voice || 'adam',
        });
        voiceoverBase64 = audio.toString('base64');
        (results.steps as string[]).push('voiceover_generated');
        results.voiceover = {
          size: audio.length,
          mimeType: 'audio/mpeg',
        };
      } catch (err: unknown) {
        console.error('[VideoGen] Voiceover failed:', err);
        results.voiceoverError = err instanceof Error ? err.message : String(err);
      }
    }

    // Step 3: Generate thumbnail if requested
    let thumbnailBase64: string | undefined;
    if (body.generateThumbnailImage) {
      console.log('[VideoGen] Step 3: Generating thumbnail...');
      try {
        const thumbnail = await generateThumbnail(
          body.thumbnailPrompt || `Thumbnail for: ${body.title || body.videoPrompt}`
        );
        thumbnailBase64 = thumbnail.imageData.toString('base64');
        (results.steps as string[]).push('thumbnail_generated');
        results.thumbnail = {
          size: thumbnail.imageData.length,
          mimeType: thumbnail.mimeType,
        };
      } catch (err: unknown) {
        console.error('[VideoGen] Thumbnail failed:', err);
        results.thumbnailError = err instanceof Error ? err.message : String(err);
      }
    }

    results.status = 'complete';
    results.videoBase64 = videoBase64;
    if (voiceoverBase64) results.voiceoverBase64 = voiceoverBase64;
    if (thumbnailBase64) results.thumbnailBase64 = thumbnailBase64;
    results.metadata = {
      title: body.title,
      description: body.description,
      tags: body.tags,
    };

    return NextResponse.json(results);
  } catch (error: unknown) {
    console.error('[VideoGen] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Video generation failed' },
      { status: 500 }
    );
  }
}
