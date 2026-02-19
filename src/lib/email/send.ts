/**
 * Email integration — send emails via SMTP (Gmail App Password or SendGrid).
 * 
 * Required env vars:
 * - SMTP_HOST (default: smtp.gmail.com)
 * - SMTP_PORT (default: 587)
 * - SMTP_USER (your Gmail address)
 * - SMTP_PASS (Gmail App Password — NOT your regular password)
 * - SMTP_FROM_NAME (display name, default: "AutoPilot AI")
 * 
 * How to get a Gmail App Password:
 * 1. Go to https://myaccount.google.com/apppasswords
 * 2. Sign in with your Google account
 * 3. Select "Mail" and "Other" (name it "AutoPilot AI")
 * 4. Copy the 16-character password
 * 5. Use that as SMTP_PASS
 */

import nodemailer from 'nodemailer';

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error(
      'Email not configured. Set SMTP_USER and SMTP_PASS in environment variables. ' +
      'For Gmail, use an App Password from https://myaccount.google.com/apppasswords'
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/**
 * Send an email.
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const { to, subject, body, isHtml, cc, bcc, replyTo } = options;

    if (!to || !subject || !body) {
      return { success: false, error: 'Missing required fields: to, subject, body' };
    }

    const transporter = getTransporter();
    const fromName = process.env.SMTP_FROM_NAME || 'AutoPilot AI';
    const fromAddr = process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      ...(isHtml ? { html: body } : { text: body }),
      ...(cc && { cc: Array.isArray(cc) ? cc.join(', ') : cc }),
      ...(bcc && { bcc: Array.isArray(bcc) ? bcc.join(', ') : bcc }),
      ...(replyTo && { replyTo }),
    });

    console.log('[Email] Sent:', info.messageId, 'to:', to);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Email] Error:', err.message);
    return {
      success: false,
      error: `Email error: ${err.message}`,
    };
  }
}

/**
 * Send a templated HTML email.
 */
export async function sendHtmlEmail(
  to: string | string[],
  subject: string,
  htmlBody: string,
  plainTextFallback?: string
): Promise<EmailResult> {
  try {
    const transporter = getTransporter();
    const fromName = process.env.SMTP_FROM_NAME || 'AutoPilot AI';
    const fromAddr = process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html: htmlBody,
      text: plainTextFallback || htmlBody.replace(/<[^>]*>/g, ''),
    });

    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

/**
 * Check if email is configured.
 */
export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * Verify SMTP connection.
 */
export async function verifyEmailConnection(): Promise<{ valid: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { valid: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { valid: false, error: err.message };
  }
}
