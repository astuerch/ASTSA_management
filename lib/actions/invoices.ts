'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessRole } from '@/lib/permissions';
import { getNextNumber, formatNumber } from '@/lib/numbering';
import { calculateLineAmounts, roundSwiss } from '@/lib/swiss-rounding';
import { InvoiceDraftStatus, VatCode, InvoiceLineSource } from '@prisma/client';

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const lineSchema = z.object({
  description: z.string().min(1, 'Descrizione obbligatoria'),
  quantity: z.coerce.number().positive('Quantità deve essere positiva'),
  unit: z.string().min(1, 'Unità obbligatoria'),
  unitPriceCents: z.coerce.number().int().nonnegative(),
  discountCents: z.coerce.number().int().nonnegative().default(0),
  vatCode: z.nativeEnum(VatCode).default('STANDARD'),
  source: z.nativeEnum(InvoiceLineSource).default('MANUAL'),
  sourceRefId: z.string().optional().nullable(),
  position: z.coerce.number().int().nonnegative().default(0),
});

const createInvoiceSchema = z.object({
  clientId: z.coerce.number().int().positive('Cliente obbligatorio'),
  propertyId: z.coerce.number().int().positive().optional().nullable(),
  subject: z.string().min(1, 'Oggetto obbligatorio'),
  documentDate: z.coerce.date().default(() => new Date()),
  dueDate: z.coerce.date(),
  paymentTermsDays: z.coerce.number().int().nonnegative().default(30),
  notes: z.string().optional().nullable(),
  locale: z.enum(['it', 'de-ch']).default('it'),
  lines: z.array(lineSchema).default([]),
});

const updateInvoiceSchema = createInvoiceSchema.partial().omit({ lines: true }).extend({
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

export async function createInvoiceDraft(input: z.infer<typeof createInvoiceSchema>) {
  const user = await requireAdmin();
  const data = createInvoiceSchema.parse(input);
  const year = new Date().getFullYear();
  const sequence = await getNextNumber('BZ', year);
  const number = formatNumber('BZ', year, sequence);

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
      source: line.source,
      sourceRefId: line.sourceRefId ?? null,
      ...amounts,
    };
  });

  const invoice = await prisma.invoiceDraft.create({
    data: {
      number,
      year,
      sequence,
      clientId: data.clientId,
      propertyId: data.propertyId ?? null,
      subject: data.subject,
      documentDate: data.documentDate,
      dueDate: data.dueDate,
      paymentTermsDays: data.paymentTermsDays,
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

  revalidatePath('/dashboard/invoices');
  return invoice;
}

export async function createInvoiceFromIntervention(
  interventionId: number,
  opts?: { dueDate?: Date; markupPercent?: number },
) {
  const user = await requireAdmin();

  const intervention = await prisma.intervention.findUniqueOrThrow({
    where: { id: interventionId },
    include: {
      property: { include: { client: true } },
      materials: { include: { material: true } },
    },
  });

  if (!intervention.isExtra) {
    throw new Error('Solo interventi extra possono essere fatturati');
  }
  if (!['PRONTO_FATTURA', 'VALIDATO'].includes(intervention.status)) {
    throw new Error('Intervento non in stato fatturabile');
  }

  // Find default hourly rate from price list
  const oreStdItem = await prisma.priceListItem.findUnique({ where: { code: 'ORE_STD' } });
  const hourlyRateCents = oreStdItem?.unitPriceCents ?? 6500;
  const markupPercent = opts?.markupPercent ?? 20;

  const lines: Array<{
    position: number;
    description: string;
    quantity: number;
    unit: string;
    unitPriceCents: number;
    discountCents: number;
    vatCode: VatCode;
    source: InvoiceLineSource;
    sourceRefId: string | null;
    netAmountCents: number;
    vatAmountCents: number;
    totalAmountCents: number;
  }> = [];

  let position = 1;

  // Hours line
  if (intervention.durationMinutes && intervention.durationMinutes > 0) {
    const hours = intervention.durationMinutes / 60;
    const amounts = calculateLineAmounts(hours, hourlyRateCents, 0, 'STANDARD');
    lines.push({
      position: position++,
      description: `Ore lavoro – ${intervention.property.name}`,
      quantity: hours,
      unit: 'h',
      unitPriceCents: hourlyRateCents,
      discountCents: 0,
      vatCode: 'STANDARD',
      source: 'INTERVENTION_HOURS',
      sourceRefId: String(intervention.id),
      ...amounts,
    });
  }

  // Material lines
  for (const mat of intervention.materials) {
    const baseCost = mat.unitCostCents ?? mat.material.unitCostCents;
    const unitPriceCents = roundSwiss(Math.round(baseCost * (1 + markupPercent / 100)));
    const amounts = calculateLineAmounts(mat.quantity, unitPriceCents, 0, 'STANDARD');
    lines.push({
      position: position++,
      description: mat.material.name,
      quantity: mat.quantity,
      unit: mat.material.unit,
      unitPriceCents,
      discountCents: 0,
      vatCode: 'STANDARD',
      source: 'INTERVENTION_MATERIAL',
      sourceRefId: String(mat.id),
      ...amounts,
    });
  }

  const subtotalCents = lines.reduce((s, l) => s + l.netAmountCents, 0);
  const vatTotalCents = lines.reduce((s, l) => s + l.vatAmountCents, 0);

  const year = new Date().getFullYear();
  const sequence = await getNextNumber('BZ', year);
  const number = formatNumber('BZ', year, sequence);
  const now = new Date();
  const dueDate = opts?.dueDate ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const subject = `${intervention.property.name} – intervento extra #${intervention.id}`;

  const invoice = await prisma.invoiceDraft.create({
    data: {
      number,
      year,
      sequence,
      clientId: intervention.property.clientId,
      propertyId: intervention.propertyId,
      subject,
      documentDate: now,
      dueDate,
      fromInterventionId: intervention.id,
      locale: 'it',
      subtotalCents,
      vatTotalCents,
      totalCents: subtotalCents + vatTotalCents,
      createdById: parseInt(user.id, 10),
      lines: { create: lines },
    },
    include: { lines: true, client: true },
  });

  revalidatePath('/dashboard/invoices');
  return invoice;
}

export async function updateInvoiceDraft(id: string, input: z.infer<typeof updateInvoiceSchema>) {
  await requireAdmin();
  const data = updateInvoiceSchema.parse(input);

  const existing = await prisma.invoiceDraft.findUniqueOrThrow({ where: { id } });
  if (existing.status !== InvoiceDraftStatus.BOZZA) {
    throw new Error('Solo le bozze in lavorazione possono essere modificate');
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
      source: line.source ?? 'MANUAL',
      sourceRefId: line.sourceRefId ?? null,
      ...amounts,
    };
  });

  await prisma.$transaction(async (tx) => {
    if (data.lines !== undefined) {
      await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
    }
    await tx.invoiceDraft.update({
      where: { id },
      data: {
        ...(data.clientId !== undefined && { clientId: data.clientId }),
        ...(data.propertyId !== undefined && { propertyId: data.propertyId }),
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.documentDate !== undefined && { documentDate: data.documentDate }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.paymentTermsDays !== undefined && { paymentTermsDays: data.paymentTermsDays }),
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

  revalidatePath('/dashboard/invoices');
  revalidatePath(`/dashboard/invoices/${id}`);
}

export async function addLine(invoiceId: string, line: z.infer<typeof lineSchema>) {
  await requireAdmin();
  const existing = await prisma.invoiceDraft.findUniqueOrThrow({ where: { id: invoiceId } });
  if (existing.status !== InvoiceDraftStatus.BOZZA) {
    throw new Error('Solo le bozze in lavorazione possono essere modificate');
  }
  const maxPos = await prisma.invoiceLine.aggregate({
    where: { invoiceId },
    _max: { position: true },
  });
  const position = (maxPos._max.position ?? 0) + 1;
  const data = lineSchema.parse(line);
  const amounts = computeLineAmounts(data);
  await prisma.invoiceLine.create({
    data: {
      invoiceId,
      position,
      description: data.description,
      quantity: data.quantity,
      unit: data.unit,
      unitPriceCents: data.unitPriceCents,
      discountCents: data.discountCents,
      vatCode: data.vatCode,
      source: data.source,
      sourceRefId: data.sourceRefId ?? null,
      ...amounts,
    },
  });
  await recalculateTotals(invoiceId);
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
}

export async function deleteLine(invoiceId: string, lineId: string) {
  await requireAdmin();
  await prisma.invoiceLine.delete({ where: { id: lineId } });
  // Re-number positions
  const remaining = await prisma.invoiceLine.findMany({
    where: { invoiceId },
    orderBy: { position: 'asc' },
  });
  for (let i = 0; i < remaining.length; i++) {
    await prisma.invoiceLine.update({
      where: { id: remaining[i].id },
      data: { position: i + 1 },
    });
  }
  await recalculateTotals(invoiceId);
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
}

export async function markReadyForExport(id: string) {
  await requireAdmin();
  const existing = await prisma.invoiceDraft.findUniqueOrThrow({ where: { id } });
  if (existing.status !== InvoiceDraftStatus.BOZZA) {
    throw new Error('Solo le bozze in lavorazione possono essere marcate pronte per export');
  }
  await prisma.invoiceDraft.update({
    where: { id },
    data: { status: InvoiceDraftStatus.PRONTO_EXPORT },
  });
  revalidatePath(`/dashboard/invoices/${id}`);
}

export async function cancelInvoice(id: string) {
  await requireAdmin();
  await prisma.invoiceDraft.update({
    where: { id },
    data: { status: InvoiceDraftStatus.ANNULLATO },
  });
  revalidatePath(`/dashboard/invoices/${id}`);
}

export async function recalculateTotals(invoiceId: string) {
  const lines = await prisma.invoiceLine.findMany({ where: { invoiceId } });
  let subtotalCents = 0;
  let vatTotalCents = 0;
  for (const line of lines) {
    subtotalCents += line.netAmountCents;
    vatTotalCents += line.vatAmountCents;
  }
  await prisma.invoiceDraft.update({
    where: { id: invoiceId },
    data: { subtotalCents, vatTotalCents, totalCents: subtotalCents + vatTotalCents },
  });
}
