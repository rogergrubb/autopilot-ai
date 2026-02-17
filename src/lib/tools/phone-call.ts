import { tool } from 'ai';
import { z } from 'zod';

/**
 * Make a phone call using AI voice via Twilio.
 * The recipient hears a natural-sounding voice read the message aloud.
 */
export const makePhoneCall = tool({
  description: 'Make a phone call using AI voice. The agent will call the provided phone number and speak the given message aloud using a natural-sounding AI voice. Use this to deliver messages, reminders, notifications, or any spoken communication. US phone numbers can be 10 digits (e.g. 4155551234) or with country code (+14155551234). Always confirm the phone number and message with the user before calling.',
  inputSchema: z.object({
    to: z.string().describe('Phone number to call (e.g. +14155551234 or 4155551234)'),
    message: z.string().describe('The message to speak aloud during the call. Write it conversationally as if speaking to someone.'),
    voice: z.enum(['joanna', 'matthew', 'amy', 'brian', 'kendra', 'joey']).optional()
      .describe('Voice: joanna (female US, default), matthew (male US), amy (female British), brian (male British)'),
  }),
  execute: async ({ to, message, voice }) => {
    try {
      const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.NEXTAUTH_URL || 'http://localhost:3000';

      const res = await fetch(`${baseUrl}/api/calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message, voice: voice || 'joanna' }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Call failed',
          to,
        };
      }

      return {
        success: true,
        to: data.to || to,
        message: `Call initiated to ${data.to}. The recipient will hear your message spoken by an AI voice.`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to make call',
        to,
      };
    }
  },
});
