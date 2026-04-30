import type { EmailMessage, EmailSendResult } from './types';

const RESEND_API_URL = 'https://api.resend.com/emails';

interface ResendApiResponse {
  id?: string;
  error?: { message?: string; name?: string };
}

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Invia una email via Resend REST API.
 * Throws solo per errori di rete; il fallback mock è gestito dal provider.
 */
export async function sendViaResend(message: EmailMessage): Promise<EmailSendResult> {
  if (!isResendConfigured()) {
    throw new Error('RESEND_API_KEY non configurata');
  }

  const from = message.from ?? process.env.EMAIL_FROM;
  if (!from) {
    throw new Error('EMAIL_FROM non configurato');
  }

  const body: Record<string, unknown> = {
    from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  };
  if (message.cc && message.cc.length > 0) body.cc = message.cc;
  if (message.bcc && message.bcc.length > 0) body.bcc = message.bcc;
  if (message.attachments && message.attachments.length > 0) {
    body.attachments = message.attachments.map((a) => ({
      filename: a.filename,
      content: a.content.toString('base64'),
      content_type: a.contentType ?? 'application/pdf',
    }));
  }

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as ResendApiResponse;

  if (!res.ok || !json.id) {
    return {
      success: false,
      errorMessage: json.error?.message ?? `Resend HTTP ${res.status}`,
      provider: 'resend',
    };
  }

  return {
    success: true,
    messageId: json.id,
    provider: 'resend',
  };
}
