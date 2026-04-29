'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessRole } from '@/lib/permissions';
import { getNextNumber, formatNumber } from '@/lib/numbering';
import { buildPrimaNotaCSV } from '@/lib/sage/csv-builder';
import { buildExportZip } from '@/lib/sage/zip-builder';
import { invalidateCache } from '@/lib/accounting/config';
import { InvoiceDraftStatus, SageExportStatus } from '@prisma/client';
import { uploadBuffer } from '@/lib/cloudinary';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error('Non autenticato');
  if (!canAccessRole(session.user.role, ['AMMINISTRAZIONE', 'DIREZIONE'])) {
    throw new Error('Accesso non consentito');
  }
  return session.user;
}

async function requireDirezione() {
  const session = await auth();
  if (!session?.user) throw new Error('Non autenticato');
  if (!canAccessRole(session.user.role, ['DIREZIONE'])) {
    throw new Error('Solo DIREZIONE puo modificare la configurazione contabile');
  }
  return session.user;
}

async function generateInvoicePdf(inv: {
  number: string;
  subject: string;
  locale: string;
  documentDate: Date;
  dueDate: Date;
  sequence: number;
  notes: string | null;
  clientId: number;
  client: {
    businessName: string;
    address: string | null;
    sageCustomerNumber: string | null;
  };
  lines: Array<{
    position: number;
    description: string;
    quantity: number;
    unit: string;
    unitPriceCents: number;
    discountCents: number;
    vatCode: string;
    netAmountCents: number;
    vatAmountCents: number;
    totalAmountCents: number;
  }>;
  subtotalCents: number;
  vatTotalCents: number;
  totalCents: number;
}): Promise<Buffer> {
  const { renderToBuffer } = await import('@react-pdf/renderer');
  const React = await import('react');
  const { InvoiceDraftPdf } = await import('@/lib/pdf/InvoiceDraftPdf');

  const pdfData = {
    number: inv.number,
    subject: inv.subject,
    locale: inv.locale,
    documentDate: inv.documentDate,
    dueDate: inv.dueDate,
    sequence: inv.sequence,
    notes: inv.notes,
    client: {
      id: inv.clientId,
      businessName: inv.client.businessName,
      address: inv.client.address,
      sageCustomerNumber: inv.client.sageCustomerNumber,
    },
    lines: inv.lines,
    subtotalCents: inv.subtotalCents,
    vatTotalCents: inv.vatTotalCents,
    totalCents: inv.totalCents,
  };

  const element = React.createElement(InvoiceDraftPdf, { data: pdfData }) as React.ReactElement<unknown>;
  return Buffer.from(await renderToBuffer(element));
}

export async function generateExport(invoiceIds: string[]) {
  const user = await requireAdmin();
  const userId = parseInt(user.id, 10);

  if (!invoiceIds || invoiceIds.length === 0) {
    throw new Error('Seleziona almeno una fattura da esportare');
  }

  const invoices = await prisma.invoiceDraft.findMany({
    where: { id: { in: invoiceIds } },
    include: {
      client: true,
      lines: { orderBy: { position: 'asc' } },
    },
  });

  if (invoices.length !== invoiceIds.length) {
    throw new Error('Alcune fatture non trovate');
  }

  const notReady = invoices.filter((inv) => inv.status !== InvoiceDraftStatus.PRONTO_EXPORT);
  if (notReady.length > 0) {
    throw new Error(
      `Fatture non in stato PRONTO_EXPORT: ${notReady.map((i) => i.number).join(', ')}`,
    );
  }

  const missingCustomerNumber = invoices.filter((inv) => !inv.client.sageCustomerNumber);
  if (missingCustomerNumber.length > 0) {
    throw new Error(
      `Clienti senza numero cliente Sage: ${missingCustomerNumber.map((i) => i.client.businessName).join(', ')}`,
    );
  }

  const alreadyExported = invoices.filter((inv) => inv.exportedBatchId !== null);
  if (alreadyExported.length > 0) {
    throw new Error(
      `Fatture gia esportate in altro batch: ${alreadyExported.map((i) => i.number).join(', ')}`,
    );
  }

  const year = new Date().getFullYear();
  const sequence = await getNextNumber('EXP', year);
  const batchNumber = formatNumber('EXP', year, sequence);

  const csvInvoices = invoices.map((inv) => ({
    number: inv.number,
    documentDate: inv.documentDate,
    client: { sageCustomerNumber: inv.client.sageCustomerNumber },
    subject: inv.subject,
    totalCents: inv.totalCents,
    subtotalCents: inv.subtotalCents,
    vatTotalCents: inv.vatTotalCents,
    vatCode: inv.lines[0]?.vatCode ?? 'STANDARD',
    workType: undefined as string | undefined,
    lines: inv.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      totalAmountCents: l.totalAmountCents,
      discountCents: l.discountCents,
    })),
  }));

  const csvContent = await buildPrimaNotaCSV(csvInvoices);

  const zipInvoices = await Promise.all(
    invoices.map(async (inv) => {
      const pdfBuffer = await generateInvoicePdf({
        number: inv.number,
        subject: inv.subject,
        locale: inv.locale,
        documentDate: inv.documentDate,
        dueDate: inv.dueDate,
        sequence: inv.sequence,
        notes: inv.notes,
        clientId: inv.clientId,
        client: {
          businessName: inv.client.businessName,
          address: inv.client.address,
          sageCustomerNumber: inv.client.sageCustomerNumber,
        },
        lines: inv.lines.map((l) => ({
          position: l.position,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          unitPriceCents: l.unitPriceCents,
          discountCents: l.discountCents,
          vatCode: l.vatCode,
          netAmountCents: l.netAmountCents,
          vatAmountCents: l.vatAmountCents,
          totalAmountCents: l.totalAmountCents,
        })),
        subtotalCents: inv.subtotalCents,
        vatTotalCents: inv.vatTotalCents,
        totalCents: inv.totalCents,
      });
      return { number: inv.number, pdfBuffer };
    }),
  );

  const totalAmountCents = invoices.reduce((sum, inv) => sum + inv.totalCents, 0);

  const zipBuffer = await buildExportZip({
    batchNumber,
    csvContent,
    invoices: zipInvoices,
    totalAmountCents,
  });

  const csvFileName = `registrazioni-${batchNumber}.csv`;
  let zipUrl: string | null = null;
  let zipPublicId: string | null = null;

  try {
    const uploaded = await uploadBuffer(zipBuffer, {
      folder: 'astsa/exports/sage',
      publicId: `sage-export-${batchNumber}`,
      resourceType: 'raw',
    });
    zipUrl = uploaded.url;
    zipPublicId = uploaded.publicId;
  } catch {
    // Cloudinary not configured - continue without URL
  }

  const exportRecord = await prisma.$transaction(async (tx) => {
    const exp = await tx.sageExport.create({
      data: {
        batchNumber,
        exportedById: userId,
        invoiceCount: invoices.length,
        totalAmountCents,
        csvFileName,
        zipUrl,
        zipPublicId,
        status: 'GENERATED',
      },
    });

    await tx.invoiceDraft.updateMany({
      where: { id: { in: invoiceIds } },
      data: {
        status: InvoiceDraftStatus.ESPORTATO,
        exportedAt: new Date(),
        exportedBatchId: exp.id,
      },
    });

    return exp;
  });

  revalidatePath('/dashboard/sage/exports');
  revalidatePath('/dashboard/invoices');

  return { batchNumber: exportRecord.batchNumber, zipBuffer, exportId: exportRecord.id };
}

export async function confirmSageImport(batchId: string) {
  const user = await requireAdmin();
  const userId = parseInt(user.id, 10);

  const batch = await prisma.sageExport.findUniqueOrThrow({ where: { id: batchId } });
  if (batch.status !== SageExportStatus.GENERATED) {
    throw new Error('Solo batch in stato GENERATED possono essere confermati');
  }

  await prisma.$transaction(async (tx) => {
    await tx.sageExport.update({
      where: { id: batchId },
      data: {
        status: SageExportStatus.CONFIRMED_IMPORT,
        importedAt: new Date(),
        importedById: userId,
      },
    });
    await tx.invoiceDraft.updateMany({
      where: { exportedBatchId: batchId },
      data: { status: InvoiceDraftStatus.REGISTRATO_SAGE },
    });
  });

  revalidatePath('/dashboard/sage/exports');
  revalidatePath('/dashboard/invoices');
}

export async function cancelExport(batchId: string, reason?: string) {
  await requireAdmin();

  const batch = await prisma.sageExport.findUniqueOrThrow({ where: { id: batchId } });
  if (batch.status !== SageExportStatus.GENERATED) {
    throw new Error('Solo batch in stato GENERATED possono essere annullati');
  }

  await prisma.$transaction(async (tx) => {
    await tx.sageExport.update({
      where: { id: batchId },
      data: {
        status: SageExportStatus.CANCELLED,
        notes: reason ?? null,
      },
    });
    await tx.invoiceDraft.updateMany({
      where: { exportedBatchId: batchId },
      data: {
        status: InvoiceDraftStatus.PRONTO_EXPORT,
        exportedAt: null,
        exportedBatchId: null,
      },
    });
  });

  revalidatePath('/dashboard/sage/exports');
  revalidatePath('/dashboard/invoices');
}

export async function regenerateZip(batchId: string) {
  await requireAdmin();

  const batch = await prisma.sageExport.findUniqueOrThrow({
    where: { id: batchId },
    include: {
      invoices: {
        include: {
          client: true,
          lines: { orderBy: { position: 'asc' } },
        },
      },
    },
  });

  const csvInvoices = batch.invoices.map((inv) => ({
    number: inv.number,
    documentDate: inv.documentDate,
    client: { sageCustomerNumber: inv.client.sageCustomerNumber },
    subject: inv.subject,
    totalCents: inv.totalCents,
    subtotalCents: inv.subtotalCents,
    vatTotalCents: inv.vatTotalCents,
    vatCode: inv.lines[0]?.vatCode ?? 'STANDARD',
    workType: undefined as string | undefined,
    lines: inv.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      totalAmountCents: l.totalAmountCents,
      discountCents: l.discountCents,
    })),
  }));

  const csvContent = await buildPrimaNotaCSV(csvInvoices);

  const zipInvoices = await Promise.all(
    batch.invoices.map(async (inv) => {
      const pdfBuffer = await generateInvoicePdf({
        number: inv.number,
        subject: inv.subject,
        locale: inv.locale,
        documentDate: inv.documentDate,
        dueDate: inv.dueDate,
        sequence: inv.sequence,
        notes: inv.notes,
        clientId: inv.clientId,
        client: {
          businessName: inv.client.businessName,
          address: inv.client.address,
          sageCustomerNumber: inv.client.sageCustomerNumber,
        },
        lines: inv.lines.map((l) => ({
          position: l.position,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          unitPriceCents: l.unitPriceCents,
          discountCents: l.discountCents,
          vatCode: l.vatCode,
          netAmountCents: l.netAmountCents,
          vatAmountCents: l.vatAmountCents,
          totalAmountCents: l.totalAmountCents,
        })),
        subtotalCents: inv.subtotalCents,
        vatTotalCents: inv.vatTotalCents,
        totalCents: inv.totalCents,
      });
      return { number: inv.number, pdfBuffer };
    }),
  );

  const totalAmountCents = batch.invoices.reduce((sum, inv) => sum + inv.totalCents, 0);

  const zipBuffer = await buildExportZip({
    batchNumber: batch.batchNumber,
    csvContent,
    invoices: zipInvoices,
    totalAmountCents,
  });

  revalidatePath('/dashboard/sage/exports');
  return { zipBuffer };
}

export async function updateAccountingConfig(key: string, value: string) {
  const user = await requireDirezione();
  const userId = parseInt(user.id, 10);
  const { setConfig } = await import('@/lib/accounting/config');
  await setConfig(key, value, userId);
  invalidateCache();
  revalidatePath('/dashboard/sage/config');
}

export async function listAccountingConfigs() {
  await requireAdmin();
  return prisma.accountingConfig.findMany({ orderBy: [{ category: 'asc' }, { key: 'asc' }] });
}
