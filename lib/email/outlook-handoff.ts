import { renderToBuffer, Document, Page, Text } from '@react-pdf/renderer';
import React from 'react';
import {
  buildInterventionReportEmail,
  buildInvoiceReminder,
  buildQuoteEmail,
} from '@/lib/email/templates';
import type { EmailLocale } from '@/lib/email/types';
import { InterventionReportPdf } from '@/lib/pdf/InterventionReportPdf';
import { QuotePdf } from '@/lib/pdf/QuotePdf';
import { formatDuration } from '@/lib/time';
import { prisma } from '@/lib/prisma';

/**
 * Outlook handoff: invece di mandare la mail al cliente da Resend,
 * generiamo un link `mailto:` con subject + body precompilati e
 * restituiamo il PDF al browser perché l'admin lo trascini in Outlook.
 *
 * Vantaggi:
 *  - L'admin vede e controlla l'email prima di mandarla.
 *  - L'invio parte dall'account Outlook aziendale (mittente uniforme).
 *  - Niente sub-processor email per i clienti, niente DKIM/SPF da
 *    configurare su `astsa.ch`.
 *  - Logghiamo comunque la "preparazione" su EmailLog.
 *
 * Il PDF non viene salvato server-side: torna come base64 al client e
 * viene scaricato direttamente nei Download del Mac.
 */

export type HandoffType = 'INTERVENTION_REPORT' | 'QUOTE' | 'INVOICE_REMINDER';

export interface HandoffPayload {
  type: HandoffType;
  /** ID intervento (numero) o cuid del documento */
  id: string;
  locale: EmailLocale;
  recipientOverride?: string | null;
}

export interface HandoffResult {
  mailtoUrl: string;
  filename: string;
  pdfBase64: string;
  logId: string;
}

/**
 * Costruisce un mailto URL conforme RFC 6068.
 * Esportata per essere testabile in isolamento.
 */
export function buildMailtoUrl(opts: {
  to: string;
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
}): string {
  const params: string[] = [];
  params.push(`subject=${encodeURIComponent(opts.subject)}`);
  params.push(`body=${encodeURIComponent(opts.body)}`);
  if (opts.cc && opts.cc.length > 0) {
    params.push(`cc=${encodeURIComponent(opts.cc.join(','))}`);
  }
  if (opts.bcc && opts.bcc.length > 0) {
    params.push(`bcc=${encodeURIComponent(opts.bcc.join(','))}`);
  }
  // RFC 6068: l'indirizzo `to` non è url-encoded, va dopo "mailto:" diretto
  return `mailto:${opts.to}?${params.join('&')}`;
}

function formatDateForLocale(d: Date | null | undefined): string {
  if (!d) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

interface PreparedEmail {
  subject: string;
  body: string; // text-only, va bene per mailto
  pdfBuffer: Buffer | null;
  filename: string;
  defaultRecipient: string | null;
  referenceId: string;
}

async function prepareInterventionReport(
  id: string,
  locale: EmailLocale,
): Promise<PreparedEmail> {
  const interventionId = parseInt(id, 10);
  if (Number.isNaN(interventionId)) throw new Error('ID intervento non valido');

  const iv = await prisma.intervention.findUnique({
    where: { id: interventionId },
    include: {
      property: { include: { client: true } },
      workers: { include: { user: true } },
      photos: true,
      materials: { include: { material: true } },
    },
  });
  if (!iv) throw new Error('Intervento non trovato');

  let pdfBuffer: Buffer;
  try {
    // Test 1: prova render minimo prima del PDF reale
    console.log('[outlook-handoff] attempting minimal PDF render test...');
    const minimalElement = React.createElement(
      Document,
      null,
      React.createElement(Page, { size: 'A4' },
        React.createElement(Text, null, 'Test minimal PDF')
      )
    );
    await renderToBuffer(minimalElement as React.ReactElement);
    console.log('[outlook-handoff] minimal PDF render OK');

    // Test 2: render del PDF reale
    console.log('[outlook-handoff] attempting real PDF render...');
    console.log('[outlook-handoff] intervention data shape:', {
      id: iv.id,
      workType: iv.workType,
      workTypeType: typeof iv.workType,
      hasProperty: !!iv.property,
      hasClient: !!iv.property?.client,
      materialsCount: iv.materials.length,
      workersCount: iv.workers.length,
      photosCount: iv.photos.length,
      startedAtType: typeof iv.startedAt,
      startedAtIsDate: iv.startedAt instanceof Date,
    });

    const element = React.createElement(InterventionReportPdf, {
      data: iv as Parameters<typeof InterventionReportPdf>[0]['data'],
      locale,
      variant: 'client',
    }) as React.ReactElement;
    pdfBuffer = Buffer.from(await renderToBuffer(element));
    console.log('[outlook-handoff] real PDF render OK, bytes:', pdfBuffer.length);
  } catch (renderErr) {
    console.error('[outlook-handoff] PDF render failed at:', renderErr instanceof Error ? renderErr.stack : renderErr);
    throw renderErr;
  }

  const dateStr = formatDateForLocale(iv.startedAt ?? iv.createdAt);
  const durationLabel =
    iv.durationMinutes != null ? formatDuration(iv.durationMinutes) : '—';

  const message = buildInterventionReportEmail(locale, {
    clientName: iv.property.client?.businessName ?? 'Cliente',
    propertyName: iv.property.name,
    interventionDate: dateStr,
    interventionId: iv.id,
    durationLabel,
    signerName: iv.clientSignerName,
  });

  return {
    subject: message.subject,
    body: message.text,
    pdfBuffer,
    filename: `rapporto-intervento-${iv.id}-${locale}.pdf`,
    defaultRecipient: iv.property.client?.billingEmail ?? null,
    referenceId: String(iv.id),
  };
}

async function prepareQuote(id: string, locale: EmailLocale): Promise<PreparedEmail> {
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { client: true, lines: { orderBy: { position: 'asc' } } },
  });
  if (!quote) throw new Error('Preventivo non trovato');

  let pdfBuffer: Buffer;
  try {
    // Test 1: prova render minimo prima del PDF reale
    console.log('[outlook-handoff] attempting minimal PDF render test (quote)...');
    const minimalElement = React.createElement(
      Document,
      null,
      React.createElement(Page, { size: 'A4' },
        React.createElement(Text, null, 'Test minimal PDF')
      )
    );
    await renderToBuffer(minimalElement as React.ReactElement);
    console.log('[outlook-handoff] minimal PDF render OK (quote)');

    // Test 2: render del PDF reale
    console.log('[outlook-handoff] attempting real PDF render (quote)...');
    const element = React.createElement(QuotePdf, {
      data: {
        number: quote.number,
        subject: quote.subject,
        locale: quote.locale,
        documentDate: quote.createdAt,
        validUntil: quote.validUntil,
        notes: quote.notes,
        client: {
          businessName: quote.client.businessName,
          address: quote.client.address,
          sageCustomerNumber: quote.client.sageCustomerNumber,
        },
        lines: quote.lines,
        subtotalCents: quote.subtotalCents,
        vatTotalCents: quote.vatTotalCents,
        totalCents: quote.totalCents,
      },
    }) as React.ReactElement;
    pdfBuffer = Buffer.from(await renderToBuffer(element));
    console.log('[outlook-handoff] real PDF render OK (quote), bytes:', pdfBuffer.length);
  } catch (renderErr) {
    console.error('[outlook-handoff] PDF render failed at (quote):', renderErr instanceof Error ? renderErr.stack : renderErr);
    throw renderErr;
  }

  const totalChf = (quote.totalCents / 100).toLocaleString('de-CH', {
    minimumFractionDigits: 2,
  });
  const message = buildQuoteEmail(locale, {
    clientName: quote.client.businessName,
    quoteNumber: quote.number,
    totalChf,
    validUntil: quote.validUntil ? formatDateForLocale(quote.validUntil) : null,
    subject: quote.subject,
  });

  return {
    subject: message.subject,
    body: message.text,
    pdfBuffer,
    filename: `preventivo-${quote.number}-${locale}.pdf`,
    defaultRecipient: quote.client.billingEmail,
    referenceId: quote.id,
  };
}

async function prepareInvoiceReminder(
  id: string,
  locale: EmailLocale,
): Promise<PreparedEmail> {
  const invoice = await prisma.invoiceDraft.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!invoice) throw new Error('Bozza fattura non trovata');

  const totalChf = (invoice.totalCents / 100).toLocaleString('de-CH', {
    minimumFractionDigits: 2,
  });
  const dueDateStr = formatDateForLocale(invoice.dueDate);

  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const dueUtc = Date.UTC(
    invoice.dueDate.getFullYear(),
    invoice.dueDate.getMonth(),
    invoice.dueDate.getDate(),
  );
  const daysToDue = Math.round((dueUtc - todayUtc) / (1000 * 60 * 60 * 24));

  const message = buildInvoiceReminder(locale, {
    clientName: invoice.client.businessName,
    invoiceNumber: invoice.number,
    totalChf,
    dueDate: dueDateStr,
    daysToDue,
  });

  // Nessun PDF allegato per il reminder: il cliente dovrebbe già avere la fattura
  // generata in Sage. L'admin può comunque allegarla manualmente da Outlook.
  return {
    subject: message.subject,
    body: message.text,
    pdfBuffer: null,
    filename: `promemoria-${invoice.number}-${locale}.pdf`,
    defaultRecipient: invoice.client.billingEmail,
    referenceId: invoice.id,
  };
}

/**
 * Entry-point principale: prepara l'handoff Outlook + logga su EmailLog.
 */
export async function prepareOutlookHandoff(
  payload: HandoffPayload,
  triggeredById: number,
): Promise<HandoffResult> {
  let prepared: PreparedEmail;
  if (payload.type === 'INTERVENTION_REPORT') {
    prepared = await prepareInterventionReport(payload.id, payload.locale);
  } else if (payload.type === 'QUOTE') {
    prepared = await prepareQuote(payload.id, payload.locale);
  } else if (payload.type === 'INVOICE_REMINDER') {
    prepared = await prepareInvoiceReminder(payload.id, payload.locale);
  } else {
    throw new Error(`Tipo handoff non supportato: ${payload.type}`);
  }

  const recipient = payload.recipientOverride || prepared.defaultRecipient || '';

  const mailtoUrl = buildMailtoUrl({
    to: recipient,
    subject: prepared.subject,
    body: prepared.body,
  });

  const log = await prisma.emailLog.create({
    data: {
      type: payload.type,
      status: 'PREPARATO',
      referenceId: prepared.referenceId,
      recipientEmail: recipient || '(non impostato)',
      subject: prepared.subject,
      locale: payload.locale,
      providerMessageId: 'outlook-handoff',
      attachmentName: prepared.pdfBuffer ? prepared.filename : null,
      sentById: triggeredById,
    },
  });

  return {
    mailtoUrl,
    filename: prepared.filename,
    pdfBase64: prepared.pdfBuffer ? prepared.pdfBuffer.toString('base64') : '',
    logId: log.id,
  };
}
