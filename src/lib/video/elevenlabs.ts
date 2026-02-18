const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Popular default voices
export const VOICES = {
  rachel: '21m00Tcm4TlvDq8ikWAM', // calm, warm female
  drew: '29vD33N1CtxCmqQRPOHJ',   // confident male
  clyde: '2EiwWnXFnvU5JabPnv8n',  // deep male
  domi: 'AZnzlk1XvdvUeBnXmlld',   // strong female
  dave: 'CYw3kZ02Hs0563khs1Fj',   // conversational male
  fin: 'D38z5RcWu1voky8WS1ja',    // sharp male
  sarah: 'EXAVITQu4vr4xnSDxMaL',  // soft female
  adam: 'pNInz6obpgDQGcFmaJgB',   // deep narrator
  sam: 'yoZ06aMxZJJ28mfd3POQ',    // raspy male
} as const;

export type VoiceName = keyof typeof VOICES;

export interface VoiceoverOptions {
  text: string;
  voice?: VoiceName | string; // voice name or ID
  modelId?: string;
  stability?: number;       // 0-1, default 0.5
  similarityBoost?: number; // 0-1, default 0.75
  style?: number;           // 0-1, default 0
  speakerBoost?: boolean;
}

/**
 * Generate voiceover audio using 11Labs TTS
 * Returns MP3 audio bytes
 */
export async function generateVoiceover(options: VoiceoverOptions): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');

  // Resolve voice ID
  let voiceId: string;
  if (options.voice && options.voice in VOICES) {
    voiceId = VOICES[options.voice as VoiceName];
  } else if (options.voice) {
    voiceId = options.voice; // assume it's a voice ID
  } else {
    voiceId = VOICES.adam; // default to adam (deep narrator)
  }

  console.log(`[11Labs] Generating voiceover: ${options.text.substring(0, 60)}... (voice: ${options.voice || 'adam'})`);

  const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: options.text,
      model_id: options.modelId || 'eleven_multilingual_v2',
      voice_settings: {
        stability: options.stability ?? 0.5,
        similarity_boost: options.similarityBoost ?? 0.75,
        style: options.style ?? 0.3,
        use_speaker_boost: options.speakerBoost ?? true,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`11Labs TTS failed (${response.status}): ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioData = Buffer.from(arrayBuffer);

  console.log(`[11Labs] Voiceover generated: ${audioData.length} bytes`);
  return audioData;
}

/**
 * Get available voices
 */
export async function listVoices(): Promise<Array<{ voice_id: string; name: string; category: string }>> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');

  const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
    headers: { 'xi-api-key': apiKey },
  });

  if (!response.ok) {
    throw new Error(`Failed to list voices: ${response.status}`);
  }

  const data = await response.json();
  return (data.voices || []).map((v: Record<string, unknown>) => ({
    voice_id: v.voice_id,
    name: v.name,
    category: v.category || 'premade',
  }));
}

export function isElevenLabsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}
