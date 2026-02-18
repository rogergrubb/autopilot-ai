import { NextResponse } from 'next/server';
import { db } from '@/db';
import { calls } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import twilio from 'twilio';

const DEFAULT_USER_ID = 'd30ca60b-0f38-498c-895d-30af8356af4a';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const isTwilioConfigured = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);

// Available voices
const VOICES: Record<string, string> = {
  'joanna': 'Polly.Joanna',       // Female, US English (natural)
  'matthew': 'Polly.Matthew',     // Male, US English (natural)
  'amy': 'Polly.Amy',             // Female, British English
  'brian': 'Polly.Brian',         // Male, British English
  'kendra': 'Polly.Kendra',      // Female, US English
  'joey': 'Polly.Joey',          // Male, US English
  'default': 'Polly.Joanna',
};

// GET /api/calls — list call history
export async function GET() {
  if (!db) return NextResponse.json({ calls: [] });
  try {
    const rows = await db
      .select()
      .from(calls)
      .where(eq(calls.userId, DEFAULT_USER_ID))
      .orderBy(desc(calls.createdAt))
      .limit(50);
    return NextResponse.json({ calls: rows });
  } catch (error) {
    console.error('[Calls GET]', error);
    return NextResponse.json({ calls: [] });
  }
}

// POST /api/calls — initiate a phone call
export async function POST(req: Request) {
  if (!isTwilioConfigured) {
    return NextResponse.json(
      { error: 'Twilio not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to environment variables.' },
      { status: 500 }
    );
  }
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { to, message, voice: voiceChoice } = await req.json();

    if (!to || !message) {
      return NextResponse.json({ error: 'Both "to" (phone number) and "message" (what to say) are required' }, { status: 400 });
    }

    // Normalize phone number
    const toNumber = normalizePhoneNumber(to);
    if (!toNumber) {
      return NextResponse.json({ error: 'Invalid phone number format. Use E.164 format like +14155551234' }, { status: 400 });
    }

    // Resolve voice
    const voiceName = VOICES[voiceChoice?.toLowerCase()] || VOICES['default'];

    // Create call record in DB
    const callId = nanoid(12);
    await db.insert(calls).values({
      id: callId,
      userId: DEFAULT_USER_ID,
      toNumber,
      fromNumber: TWILIO_PHONE_NUMBER!,
      message,
      voice: voiceName,
      status: 'initiating',
    });

    // Build TwiML URL — Twilio will fetch this when the call connects
    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.NEXTAUTH_URL || 'https://autopilotai.vercel.app';

    const twimlUrl = `${baseUrl}/api/calls/twiml?callId=${callId}`;

    // Make the call via Twilio
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const twilioCall = await client.calls.create({
      to: toNumber,
      from: TWILIO_PHONE_NUMBER!,
      url: twimlUrl,
      statusCallback: `${baseUrl}/api/calls/twiml?callId=${callId}&event=status`,
      statusCallbackEvent: ['completed', 'failed', 'busy', 'no-answer'],
      statusCallbackMethod: 'POST',
    });

    // Update with Twilio SID
    await db.update(calls)
      .set({ twilioSid: twilioCall.sid, status: 'queued' })
      .where(eq(calls.id, callId));

    return NextResponse.json({
      success: true,
      callId,
      twilioSid: twilioCall.sid,
      to: toNumber,
      message: `Call initiated to ${toNumber}`,
      voice: voiceName,
    });
  } catch (error: unknown) {
    console.error('[Calls POST]', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to make call';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

function normalizePhoneNumber(input: string): string | null {
  // Strip spaces, dashes, parens
  let num = input.replace(/[\s\-\(\)\.]/g, '');

  // If starts with 1 and no +, add +
  if (/^1\d{10}$/.test(num)) num = '+' + num;
  // If 10 digits, assume US
  if (/^\d{10}$/.test(num)) num = '+1' + num;
  // Must be E.164 format
  if (/^\+\d{10,15}$/.test(num)) return num;

  return null;
}
