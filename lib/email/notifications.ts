/**
 * Notifiche admin auto-trigger.
 *
 * Tutte le funzioni sono pensate per essere chiamate IN-LINE dentro le Server
 * Actions che cambiano lo stato (validateIntervention, markAsAccepted, ecc.).
 * Per design **non lanciano mai eccezioni**: un fallimento di invio non deve
 * bloccare l'azione utente. L'errore viene loggato in EmailLog con status
 * `FALLITO` e in console per debug.
 */

import { sendEmail } from './provider';
import { nextRetryAtFor } from './retry';
import {
  buildAlertInterventionExtraClosed,
  buildAlertInvoiceReadyExport,
  buildAlertOcrDocToValidate,
  buildAlertQuoteAccepted,
} from './templates';
import type { EmailLocale } from './types';
import { prisma } from '@/lib/prisma';

const ADMIN_LOCALE: EmailLocale = 'it'; // gli alert interni vanno sempre in italiano per ASTSA

function adminRecipient(): string | null {
  return (
    process.env.EMAIL_TO_ADMIN ||
    process.env.EMAIL_BCC_ADMIN ||
    null
  );
}

function appBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

interface NotifyResult {
  attempted: boolean;
  success: boolean;
  errorMessage?: string;
}

async function logAndReturn(opts: {
  type: import('@prisma/client').EmailLogType;
  referenceId: string;
  recipient: string;
  subject: string;
  errorMessage?: string;
  providerMessageId?: string;
  triggeredById: number;
  success: boolean;
}): Promise<NotifyResult> {
  try {
    await prisma.emailLog.create({
      data: {
        type: opts.type,
        status: opts.success ? 'INVIATO' : 'FALLITO',
        referenceId: opts.referenceId,
        recipientEmail: opts.recipient,
        subject: opts.subject,
        locale: ADMIN_LOCALE,
        errorMessage: opts.errorMessage ?? null,
        providerMessageId: opts.providerMessageId ?? null,
        // Gli alert admin sono short-text senza allegato → eligible retry cron
        nextRetryAt: opts.success ? null : nextRetryAtFor(0),
        sentById: opts.triggeredById,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email-notifications] log write failed:', err);
  }
  return {
    attempted: true,
    success: opts.success,
    errorMessage: opts.errorMessage,
  };
}

async function noRecipientResult(): Promise<NotifyResult> {
  // eslint-disable-next-line no-console
  console.warn('[email-notifications] EMAIL_TO_ADMIN/EMAIL_BCC_ADMIN non configurate, skip alert');
  return { attempted: false, success: false, errorMessage: 'Recipient admin non configurato' };
}

/* ──────────────────────────────────────────────────────────────────────────
 * 1. Intervento EXTRA chiuso → admin
 * ────────────────────────────────────────────────────────────────────────── */

export async function notifyInterventionExtraClosed(
  interventionId: number,
  triggeredById: number,
): Promise<NotifyResult> {
  const recipient = adminRecipient();
  if (!recipient) return noRecipientResult();

  try {
    const iv = await prisma.intervention.findUnique({
      where: { id: interventionId },
      include: {
        property: { include: { client: true } },
        workers: { include: { user: true } },
      },
    });
    if (!iv) return { attempted: false, success: false };

    const message = buildAlertInterventionExtraClosed(ADMIN_LOCALE, {
      interventionId: iv.id,
      propertyName: iv.property.name,
      clientName: iv.property.client?.businessName ?? '—',
      workerNames: iv.workers.map((w) => `${w.user.firstName} ${w.user.lastName}`),
      durationLabel:
        iv.durationMinutes != null
          ? `${Math.floor(iv.durationMinutes / 60)}h ${iv.durationMinutes % 60}min`
          : '—',
      url: `${appBaseUrl()}/dashboard/interventions/${iv.id}`,
    });

    const result = await sendEmail({
      to: recipient,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    return logAndReturn({
      type: 'ADMIN_ALERT_INTERVENTION_EXTRA_CLOSED',
      referenceId: String(iv.id),
      recipient,
      subject: message.subject,
      errorMessage: result.errorMessage,
      providerMessageId: result.messageId,
      triggeredById,
      success: result.success,
    });
  } catch (err) {
    return logAndReturn({
      type: 'ADMIN_ALERT_INTERVENTION_EXTRA_CLOSED',
      referenceId: String(interventionId),
      recipient,
      subject: 'Alert (errore)',
      errorMessage: (err as Error).message,
      triggeredById,
      success: false,
    });
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * 2. Preventivo ACCETTATO → admin
 * ────────────────────────────────────────────────────────────────────────── */

export async function notifyQuoteAccepted(
  quoteId: string,
  triggeredById: number,
): Promise<NotifyResult> {
  const recipient = adminRecipient();
  if (!recipient) return noRecipientResult();

  try {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { client: true },
    });
    if (!quote) return { attempted: false, success: false };

    const message = buildAlertQuoteAccepted(ADMIN_LOCALE, {
      quoteNumber: quote.number,
      clientName: quote.client.businessName,
      totalChf: (quote.totalCents / 100).toLocaleString('de-CH', { minimumFractionDigits: 2 }),
      url: `${appBaseUrl()}/dashboard/quotes/${quote.id}`,
    });

    const result = await sendEmail({
      to: recipient,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    return logAndReturn({
      type: 'ADMIN_ALERT_QUOTE_ACCEPTED',
      referenceId: quote.id,
      recipient,
      subject: message.subject,
      errorMessage: result.errorMessage,
      providerMessageId: result.messageId,
      triggeredById,
      success: result.success,
    });
  } catch (err) {
    return logAndReturn({
      type: 'ADMIN_ALERT_QUOTE_ACCEPTED',
      referenceId: quoteId,
      recipient,
      subject: 'Alert (errore)',
      errorMessage: (err as Error).message,
      triggeredById,
      success: false,
    });
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * 3. Bozza fattura PRONTO_EXPORT → admin
 * ────────────────────────────────────────────────────────────────────────── */

export async function notifyInvoiceReadyExport(
  invoiceId: string,
  triggeredById: number,
): Promise<NotifyResult> {
  const recipient = adminRecipient();
  if (!recipient) return noRecipientResult();

  try {
    const invoice = await prisma.invoiceDraft.findUnique({
      where: { id: invoiceId },
      include: { client: true },
    });
    if (!invoice) return { attempted: false, success: false };

    const message = buildAlertInvoiceReadyExport(ADMIN_LOCALE, {
      invoiceNumber: invoice.number,
      clientName: invoice.client.businessName,
      totalChf: (invoice.totalCents / 100).toLocaleString('de-CH', {
        minimumFractionDigits: 2,
      }),
      url: `${appBaseUrl()}/dashboard/invoices/${invoice.id}`,
    });

    const result = await sendEmail({
      to: recipient,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    return logAndReturn({
      type: 'ADMIN_ALERT_INVOICE_READY_EXPORT',
      referenceId: invoice.id,
      recipient,
      subject: message.subject,
      errorMessage: result.errorMessage,
      providerMessageId: result.messageId,
      triggeredById,
      success: result.success,
    });
  } catch (err) {
    return logAndReturn({
      type: 'ADMIN_ALERT_INVOICE_READY_EXPORT',
      referenceId: invoiceId,
      recipient,
      subject: 'Alert (errore)',
      errorMessage: (err as Error).message,
      triggeredById,
      success: false,
    });
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * 4. Documento OCR DA_VALIDARE → admin
 * ────────────────────────────────────────────────────────────────────────── */

const DOC_TYPE_LABELS_IT: Record<string, string> = {
  FATTURA_FORNITORE: 'Fattura fornitore',
  RICEVUTA: 'Ricevuta',
  BOLLA_CONSEGNA: 'Bolla di consegna',
  PREVENTIVO_RICEVUTO: 'Preventivo ricevuto',
};

export async function notifyOcrDocToValidate(
  documentId: string,
  triggeredById: number,
): Promise<NotifyResult> {
  const recipient = adminRecipient();
  if (!recipient) return noRecipientResult();

  try {
    const doc = await prisma.incomingDocument.findUnique({
      where: { id: documentId },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    });
    if (!doc) return { attempted: false, success: false };

    const totalChf =
      doc.totalCents != null
        ? (doc.totalCents / 100).toLocaleString('de-CH', { minimumFractionDigits: 2 })
        : null;

    const message = buildAlertOcrDocToValidate(ADMIN_LOCALE, {
      documentType: DOC_TYPE_LABELS_IT[doc.type] ?? doc.type,
      uploaderName: `${doc.createdBy.firstName} ${doc.createdBy.lastName}`,
      supplierName: doc.supplierName,
      totalChf,
      url: `${appBaseUrl()}/dashboard/documents/${doc.id}`,
    });

    const result = await sendEmail({
      to: recipient,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    return logAndReturn({
      type: 'ADMIN_ALERT_OCR_DOC_TO_VALIDATE',
      referenceId: doc.id,
      recipient,
      subject: message.subject,
      errorMessage: result.errorMessage,
      providerMessageId: result.messageId,
      triggeredById,
      success: result.success,
    });
  } catch (err) {
    return logAndReturn({
      type: 'ADMIN_ALERT_OCR_DOC_TO_VALIDATE',
      referenceId: documentId,
      recipient,
      subject: 'Alert (errore)',
      errorMessage: (err as Error).message,
      triggeredById,
      success: false,
    });
  }
}
