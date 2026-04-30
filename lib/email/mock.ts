import type { EmailMessage, EmailSendResult } from './types';

/**
 * Provider mock usato in dev/CI quando RESEND_API_KEY non è configurata.
 * Logga la mail e ritorna successo. Nessun side effect esterno.
 */
export function sendViaMock(message: EmailMessage): EmailSendResult {
  const attachmentInfo = message.attachments?.length
    ? ` (con ${message.attachments.length} allegati)`
    : '';
  // eslint-disable-next-line no-console
  console.log(
    `[email-mock] → ${message.to}${attachmentInfo}: "${message.subject}"`,
  );
  return {
    success: true,
    messageId: `mock_${Date.now()}`,
    provider: 'mock',
  };
}
