import { NextResponse } from 'next/server';
import { isVeoConfigured } from '@/lib/video/veo';
import { isElevenLabsConfigured, generateVoiceover, VOICES } from '@/lib/video/elevenlabs';

export const maxDuration = 60;

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    veo: { configured: isVeoConfigured(), status: 'untested' },
    elevenlabs: { configured: isElevenLabsConfigured(), status: 'untested' },
  };

  // Test Veo - just check if we can access the model
  if (isVeoConfigured()) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });
      
      // Quick test: try to list a model or make a simple call
      // We won't actually generate a video (expensive), just test auth
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: 'say "veo test ok" and nothing else',
      });
      const text = response?.candidates?.[0]?.content?.parts?.[0];
      results.veo = { 
        configured: true, 
        status: 'OK',
        note: 'Gemini API accessible. Veo generation requires calling /api/video/generate',
        testResponse: text,
      };
    } catch (err: unknown) {
      results.veo = { 
        configured: true, 
        status: 'ERROR', 
        error: err instanceof Error ? err.message : String(err) 
      };
    }
  }

  // Test 11Labs - generate a tiny audio clip
  if (isElevenLabsConfigured()) {
    try {
      const audio = await generateVoiceover({ 
        text: 'Test.',
        voice: 'adam',
        modelId: 'eleven_monolingual_v1', // faster for test
      });
      results.elevenlabs = { 
        configured: true, 
        status: 'OK', 
        audioBytes: audio.length,
        availableVoices: Object.keys(VOICES),
      };
    } catch (err: unknown) {
      results.elevenlabs = { 
        configured: true, 
        status: 'ERROR', 
        error: err instanceof Error ? err.message : String(err) 
      };
    }
  }

  return NextResponse.json(results);
}
