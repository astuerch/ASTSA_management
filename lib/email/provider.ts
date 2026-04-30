import { sendViaMock } from './mock';
import { isResendConfigured, sendViaResend } from './resend';
import { assertAllowedRecipients, EmailSafetyError } from './safety';
import type { EmailMessage, EmailSendResult } from './types';

/**
 * Single entry-point per l'invio email.
 *
 *  1. Applica il safety guard (SAFE_EMAIL_ONLY) sugli indirizzi `to`/`cc`/`bcc`.
 *  2. Se RESEND_API_KEY è presente usa Resend. Altrimenti fallback mock.
 *  3. Catch errori network → ritorna SendResult con errorMessage popolato.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  // Safety check prima di qualunque chiamata di rete: evita di "trapelare"
  // indirizzi al provider anche solo come metadata.
  const recipients = [
    message.to,
    ...(message.cc ?? []),
    ...(message.bcc ?? []),
  ];
  try {
    assertAllowedRecipients(recipients);
  } catch (err) {
    if (err instanceof EmailSafetyError) {
      return {
        success: false,
        errorMessage: err.message,
        provider: isResendConfigured() ? 'resend' : 'mock',
      };
    }
    throw err;
  }

  if (!isResendConfigured()) {
    return sendViaMock(message);
  }

  try {
    return await sendViaResend(message);
  } catch (err) {
    return {
      success: false,
      errorMessage: (err as Error).message,
      provider: 'resend',
    };
  }
}

export type { EmailMessage, EmailSendResult } from './types';
export { isResendConfigured } from './resend';
export { isSafetyGuardActive } from './safety';
