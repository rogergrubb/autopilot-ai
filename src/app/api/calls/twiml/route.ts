import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { calls } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/calls/twiml?callId=xxx — Twilio fetches this when call connects
export async function GET(req: NextRequest) {
  const callId = req.nextUrl.searchParams.get('callId');

  if (!callId || !db) {
    // Fallback TwiML
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Sorry, there was an error with this call. Goodbye.</Say>
  <Hangup/>
</Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }

  try {
    const [call] = await db
      .select()
      .from(calls)
      .where(eq(calls.id, callId))
      .limit(1);

    if (!call) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Sorry, this call could not be found. Goodbye.</Say>
  <Hangup/>
</Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Update status to in-progress
    await db.update(calls)
      .set({ status: 'in-progress' })
      .where(eq(calls.id, callId));

    const voice = call.voice || 'Polly.Joanna';

    // Escape XML special chars in message
    const safeMessage = escapeXml(call.message);

    // Build TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="${voice}">${safeMessage}</Say>
  <Pause length="1"/>
  <Say voice="${voice}">This message was sent by your AI assistant on Full Send AI. Goodbye!</Say>
  <Hangup/>
</Response>`;

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('[TwiML GET]', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">An error occurred. Goodbye.</Say>
  <Hangup/>
</Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
}

// POST /api/calls/twiml?callId=xxx&event=status — Twilio status callback
export async function POST(req: NextRequest) {
  const callId = req.nextUrl.searchParams.get('callId');
  const event = req.nextUrl.searchParams.get('event');

  if (event === 'status' && callId && db) {
    try {
      const formData = await req.formData();
      const callStatus = formData.get('CallStatus') as string;
      const callDuration = formData.get('CallDuration') as string;

      await db.update(calls)
        .set({
          status: callStatus || 'completed',
          duration: callDuration ? parseInt(callDuration) : undefined,
        })
        .where(eq(calls.id, callId));
    } catch (error) {
      console.error('[TwiML POST status]', error);
    }
  }

  return NextResponse.json({ ok: true });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
