'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessRole } from '@/lib/permissions';
import { getNextNumber, formatNumber } from '@/lib/numbering';
import { calculateLineAmounts } from '@/lib/swiss-rounding';
import { notifyQuoteAccepted } from '@/lib/email/notifications';
import { QuoteStatus, VatCode } from '@prisma/client';

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const lineSchema = z.object({
  description: z.string().min(1, 'Descrizione obbligatoria'),
  quantity: z.coerce.number().positive('Quantità deve essere positiva'),
  unit: z.string().min(1, 'Unità obbligatoria'),
  unitPriceCents: z.coerce.number().int().nonnegative(),
  discountCents: z.coerce.number().int().nonnegative().default(0),
  vatCode: z.nativeEnum(VatCode).default('STANDARD'),
  position: z.coerce.number().int().nonnegative().default(0),
});

const createQuoteSchema = z.object({
  clientId: z.coerce.number().int().positive('Cliente obbligatorio'),
  propertyId: z.coerce.number().int().positive().optional().nullable(),
  subject: z.string().min(1, 'Oggetto obbligatorio'),
  validUntil: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  locale: z.enum(['it', 'de-ch']).default('it'),
  lines: z.array(lineSchema).default([]),
});

const updateQuoteSchema = createQuoteSchema.partial().omit({ lines: true }).extend({
  lines: z.array(lineSchema.extend({ id: z.string().optional() })).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non autenticato');
  const role = session.user.role as string;
  if (!canAccessRole(role, ['AMMINISTRAZIONE'])) {
    throw new Error('Accesso non autorizzato');
  }
  return session.user;
}

function computeLineAmounts(line: z.infer<typeof lineSchema>) {
  return calculateLineAmounts(line.quantity, line.unitPriceCents, line.discountCents, line.vatCode);
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function createQuote(input: z.infer<typeof createQuoteSchema>) {
  const user = await requireAdmin();
  const data = createQuoteSchema.parse(input);
  const year = new Date().getFullYear();
  const sequence = await getNextNumber('PR', year);
  const number = formatNumber('PR', year, sequence);

  let subtotalCents = 0;
  let vatTotalCents = 0;

  const lineData = data.lines.map((line, idx) => {
    const amounts = computeLineAmounts(line);
    subtotalCents += amounts.netAmountCents;
    vatTotalCents += amounts.vatAmountCents;
    return {
      position: idx + 1,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitPriceCents: line.unitPriceCents,
      discountCents: line.discountCents,
      vatCode: line.vatCode,
      ...amounts,
    };
  });

  const quote = await prisma.quote.create({
    data: {
      number,
      year,
      sequence,
      clientId: data.clientId,
      propertyId: data.propertyId ?? null,
      subject: data.subject,
      validUntil: data.validUntil ?? null,
      notes: data.notes ?? null,
      locale: data.locale,
      subtotalCents,
      vatTotalCents,
      totalCents: subtotalCents + vatTotalCents,
      createdById: parseInt(user.id, 10),
      lines: { create: lineData },
    },
    include: { lines: true, client: true },
  });

  revalidatePath('/dashboard/quotes');
  return quote;
}

export async function updateQuote(id: string, input: z.infer<typeof updateQuoteSchema>) {
  await requireAdmin();
  const data = updateQuoteSchema.parse(input);

  const existing = await prisma.quote.findUniqueOrThrow({ where: { id } });
  if (existing.status !== QuoteStatus.BOZZA) {
    throw new Error('Solo i preventivi in bozza possono essere modificati');
  }

  let subtotalCents = 0;
  let vatTotalCents = 0;
  const lineUpdates = (data.lines ?? []).map((line, idx) => {
    const amounts = computeLineAmounts(line);
    subtotalCents += amounts.netAmountCents;
    vatTotalCents += amounts.vatAmountCents;
    return {
      position: idx + 1,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitPriceCents: line.unitPriceCents,
      discountCents: line.discountCents,
      vatCode: line.vatCode,
      ...amounts,
    };
  });

  await prisma.$transaction(async (tx) => {
    if (data.lines !== undefined) {
      await tx.quoteLine.deleteMany({ where: { quoteId: id } });
    }
    await tx.quote.update({
      where: { id },
      data: {
        ...(data.clientId !== undefined && { clientId: data.clientId }),
        ...(data.propertyId !== undefined && { propertyId: data.propertyId }),
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.validUntil !== undefined && { validUntil: data.validUntil }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.locale !== undefined && { locale: data.locale }),
        ...(data.lines !== undefined && {
          subtotalCents,
          vatTotalCents,
          totalCents: subtotalCents + vatTotalCents,
          lines: { create: lineUpdates },
        }),
      },
    });
  });

  revalidatePath('/dashboard/quotes');
  revalidatePath(`/dashboard/quotes/${id}`);
}

export async function markAsSent(id: string) {
  await requireAdmin();
  const existing = await prisma.quote.findUniqueOrThrow({ where: { id } });
  if (existing.status !== QuoteStatus.BOZZA) {
    throw new Error('Solo i preventivi in bozza possono essere marcati come inviati');
  }
  await prisma.quote.update({
    where: { id },
    data: { status: QuoteStatus.INVIATO, sentAt: new Date() },
  });
  revalidatePath(`/dashboard/quotes/${id}`);
}

export async function markAsAccepted(id: string) {
  const user = await requireAdmin();
  const existing = await prisma.quote.findUniqueOrThrow({ where: { id } });
  if (existing.status !== QuoteStatus.INVIATO) {
    throw new Error('Solo i preventivi inviati possono essere marcati come accettati');
  }
  await prisma.quote.update({
    where: { id },
    data: { status: QuoteStatus.ACCETTATO, acceptedAt: new Date() },
  });

  // Auto-trigger Phase 6: alert admin "prepara bozza fattura"
  await notifyQuoteAccepted(id, parseInt(user.id, 10));

  revalidatePath(`/dashboard/quotes/${id}`);
}

export async function markAsRejected(id: string) {
  await requireAdmin();
  const existing = await prisma.quote.findUniqueOrThrow({ where: { id } });
  if (!['INVIATO', 'ACCETTATO'].includes(existing.status)) {
    throw new Error('Solo i preventivi inviati o accettati possono essere rifiutati');
  }
  await prisma.quote.update({
    where: { id },
    data: { status: QuoteStatus.RIFIUTATO, rejectedAt: new Date() },
  });
  revalidatePath(`/dashboard/quotes/${id}`);
}

export async function deleteQuote(id: string) {
  await requireAdmin();
  const existing = await prisma.quote.findUniqueOrThrow({ where: { id } });
  if (existing.status !== QuoteStatus.BOZZA) {
    throw new Error('Solo i preventivi in bozza possono essere eliminati');
  }
  await prisma.quote.delete({ where: { id } });
  revalidatePath('/dashboard/quotes');
}

export async function recalculateTotals(quoteId: string) {
  await requireAdmin();
  const lines = await prisma.quoteLine.findMany({ where: { quoteId } });
  let subtotalCents = 0;
  let vatTotalCents = 0;
  for (const line of lines) {
    subtotalCents += line.netAmountCents;
    vatTotalCents += line.vatAmountCents;
  }
  await prisma.quote.update({
    where: { id: quoteId },
    data: { subtotalCents, vatTotalCents, totalCents: subtotalCents + vatTotalCents },
  });
}

export async function convertToInvoiceDraft(quoteId: string, dueDate?: Date) {
  const user = await requireAdmin();
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: { lines: true },
  });
  if (quote.status !== QuoteStatus.ACCETTATO) {
    throw new Error('Solo i preventivi accettati possono essere trasformati in bozza fattura');
  }
  if (quote.convertedToInvoiceId) {
    throw new Error('Preventivo già trasformato in bozza fattura');
  }

  const year = new Date().getFullYear();
  const sequence = await getNextNumber('BZ', year);
  const number = formatNumber('BZ', year, sequence);
  const now = new Date();
  const due = dueDate ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoiceDraft.create({
      data: {
        number,
        year,
        sequence,
        clientId: quote.clientId,
        propertyId: quote.propertyId,
        subject: quote.subject,
        documentDate: now,
        dueDate: due,
        notes: quote.notes,
        locale: quote.locale,
        subtotalCents: quote.subtotalCents,
        vatTotalCents: quote.vatTotalCents,
        totalCents: quote.totalCents,
        fromQuoteId: quote.id,
        createdById: parseInt(user.id, 10),
        lines: {
          create: quote.lines.map((line) => ({
            position: line.position,
            description: line.description,
            quantity: line.quantity,
            unit: line.unit,
            unitPriceCents: line.unitPriceCents,
            discountCents: line.discountCents,
            vatCode: line.vatCode,
            source: 'QUOTE_LINE' as const,
            sourceRefId: line.id,
            netAmountCents: line.netAmountCents,
            vatAmountCents: line.vatAmountCents,
            totalAmountCents: line.totalAmountCents,
          })),
        },
      },
    });
    await tx.quote.update({
      where: { id: quoteId },
      data: { convertedToInvoiceId: inv.id },
    });
    return inv;
  });

  revalidatePath('/dashboard/quotes');
  revalidatePath('/dashboard/invoices');
  return invoice;
}
