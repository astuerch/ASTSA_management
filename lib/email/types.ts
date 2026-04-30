/**
 * Tipi condivisi per il modulo email.
 * Indipendenti dal provider (Resend oggi, eventuali altri in futuro).
 */

export type EmailLocale = 'it' | 'de-ch';

export interface EmailAttachment {
  /** Nome del file mostrato al destinatario */
  filename: string;
  /** Contenuto in Buffer (PDF, image, ecc.) */
  content: Buffer;
  /** MIME type, default application/pdf */
  contentType?: string;
}

export interface EmailMessage {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
  /** Sender override; se non fornito usa EMAIL_FROM env */
  from?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  errorMessage?: string;
  /** Provider che ha gestito l'invio (per log) */
  provider: 'resend' | 'mock';
}
