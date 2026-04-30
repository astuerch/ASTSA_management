'use server';

import { renderToBuffer } from '@react-pdf/renderer';
import { revalidatePath } from 'next/cache';
import React from 'react';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { sendEmail } from '@/lib/email/provider';
import {
  buildInterventionReportEmail,
  buildQuoteEmail,
} from '@/lib/email/templates';
import type { EmailLocale } from '@/lib/email/types';
import { InterventionReportPdf } from '@/lib/pdf/InterventionReportPdf';
import { QuotePdf } from '@/lib/pdf/QuotePdf';
import { formatDuration } from '@/lib/time';
import { prisma } from '@/lib/prisma';

const ADMIN_ROLES = ['AMMINISTRAZIONE', 'DIREZIONE'];

const sendInterventionReportSchema = z.object({
  interventionId: z.coerce.number().int().positive(),
  locale: z.enum(['it', 'de-ch']).default('it'),
  recipientOverride: z.string().email().optional().or(z.literal('')),
});

const sendQuoteSchema = z.object({
  quoteId: z.string().min(1),
  locale: z.enum(['it', 'de-ch']).default('it'),
  recipientOverride: z.string().email().optional().or(z.literal('')),
});

function buildBccList(): string[] {
  const admin = process.env.EMAIL_BCC_ADMIN;
  return admin ? [admin] : [];
}

function formatDateForLocale(d: Date | null | undefined): string {
  if (!d) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export async function sendInterventionReportEmail(formData: FormData) {
  const session = await requireRole(ADMIN_ROLES);
  const userId = Number(session.user?.id);
  if (!userId) throw new Error('Sessione non valida');

  const parsed = sendInterventionReportSchema.safeParse({
    interventionId: formData.get('interventionId'),
    locale: formData.get('locale') ?? 'it',
    recipientOverride: formData.get('recipientOverride') ?? '',
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Dati non validi');
  }
  const { interventionId, locale, recipientOverride } = parsed.data;

  const intervention = await prisma.intervention.findUnique({
    where: { id: interventionId },
    include: {
      property: { include: { client: true } },
      workers: { include: { user: true } },
      photos: true,
      materials: { include: { material: true } },
    },
  });
  if (!intervention) throw new Error('Intervento non trovato');

  const recipient = recipientOverride || intervention.property.client?.billingEmail;
  if (!recipient) {
    throw new Error('Nessuna email cliente: impostala in anagrafica oppure usa override');
  }

  // Render PDF lato server (variant client = senza costi)
  const element = React.createElement(InterventionReportPdf, {
    data: intervention as Parameters<typeof InterventionReportPdf>[0]['data'],
    locale: locale as EmailLocale,
    variant: 'client',
  }) as React.ReactElement;
  const pdfBuffer = Buffer.from(await renderToBuffer(element));

  const dateStr = formatDateForLocale(intervention.startedAt ?? intervention.createdAt);
  const durationLabel =
    intervention.durationMinutes != null ? formatDuration(intervention.durationMinutes) : '—';

  const message = buildInterventionReportEmail(locale, {
    clientName: intervention.property.client?.businessName ?? 'Cliente',
    propertyName: intervention.property.name,
    interventionDate: dateStr,
    interventionId: intervention.id,
    durationLabel,
    signerName: intervention.clientSignerName,
  });

  const bcc = buildBccList();
  const filename = `rapporto-intervento-${intervention.id}-${locale}.pdf`;

  const result = await sendEmail({
    to: recipient,
    bcc: bcc.length > 0 ? bcc : undefined,
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: [
      { filename, content: pdfBuffer, contentType: 'application/pdf' },
    ],
  });

  await prisma.emailLog.create({
    data: {
      type: 'INTERVENTION_REPORT',
      status: result.success ? 'INVIATO' : 'FALLITO',
      referenceId: String(intervention.id),
      recipientEmail: recipient,
      ccEmails: bcc.length > 0 ? bcc.join(',') : null,
      subject: message.subject,
      locale,
      errorMessage: result.errorMessage ?? null,
      providerMessageId: result.messageId ?? null,
      attachmentName: filename,
      sentById: userId,
    },
  });

  revalidatePath(`/dashboard/interventions/${intervention.id}`);
  revalidatePath('/dashboard/email-log');

  if (!result.success) {
    throw new Error(`Invio fallito: ${result.errorMessage ?? 'errore sconosciuto'}`);
  }
}

export async function sendQuoteEmail(formData: FormData) {
  const session = await requireRole(ADMIN_ROLES);
  const userId = Number(session.user?.id);
  if (!userId) throw new Error('Sessione non valida');

  const parsed = sendQuoteSchema.safeParse({
    quoteId: formData.get('quoteId'),
    locale: formData.get('locale') ?? 'it',
    recipientOverride: formData.get('recipientOverride') ?? '',
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Dati non validi');
  }
  const { quoteId, locale, recipientOverride } = parsed.data;

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      client: true,
      lines: { orderBy: { position: 'asc' } },
    },
  });
  if (!quote) throw new Error('Preventivo non trovato');

  const recipient = recipientOverride || quote.client.billingEmail;
  if (!recipient) {
    throw new Error('Nessuna email cliente: impostala in anagrafica oppure usa override');
  }

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
  const pdfBuffer = Buffer.from(await renderToBuffer(element));

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

  const bcc = buildBccList();
  const filename = `preventivo-${quote.number}-${locale}.pdf`;

  const result = await sendEmail({
    to: recipient,
    bcc: bcc.length > 0 ? bcc : undefined,
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: [
      { filename, content: pdfBuffer, contentType: 'application/pdf' },
    ],
  });

  await prisma.emailLog.create({
    data: {
      type: 'QUOTE',
      status: result.success ? 'INVIATO' : 'FALLITO',
      referenceId: quote.id,
      recipientEmail: recipient,
      ccEmails: bcc.length > 0 ? bcc.join(',') : null,
      subject: message.subject,
      locale,
      errorMessage: result.errorMessage ?? null,
      providerMessageId: result.messageId ?? null,
      attachmentName: filename,
      sentById: userId,
    },
  });

  // Se l'invio è riuscito e il preventivo era ancora in BOZZA, lo portiamo a INVIATO
  // (allineato con il workflow esistente: l'invio email è proprio l'azione che lo "invia").
  if (result.success && quote.status === 'BOZZA') {
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: 'INVIATO', sentAt: new Date() },
    });
  }

  revalidatePath(`/dashboard/quotes/${quote.id}`);
  revalidatePath('/dashboard/email-log');

  if (!result.success) {
    throw new Error(`Invio fallito: ${result.errorMessage ?? 'errore sconosciuto'}`);
  }
}
