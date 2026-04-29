'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth, requireRole } from '@/lib/auth';
import { uploadBuffer } from '@/lib/cloudinary';
import { extractDocument } from '@/lib/ocr/provider';
import type { ExtractedDocument, OcrDocumentKind } from '@/lib/ocr/types';
import { prisma } from '@/lib/prisma';
import {
  incomingDocumentDiscardSchema,
  incomingDocumentUpdateSchema,
  incomingDocumentUploadSchema,
} from '@/lib/validation';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB hard limit lato server

const ADMIN_ROLES = ['AMMINISTRAZIONE', 'DIREZIONE'];
const UPLOAD_ROLES = ['DIPENDENTE', 'CAPOSQUADRA', 'AMMINISTRAZIONE', 'DIREZIONE'];

function ocrKindForType(type: string): OcrDocumentKind {
  return type === 'RICEVUTA' ? 'RECEIPT' : 'INVOICE';
}

function dateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pickInitialFromExtracted(extracted: ExtractedDocument) {
  return {
    supplierName: extracted.supplierName.value,
    supplierVat: extracted.supplierVat.value,
    docNumber: extracted.docNumber.value,
    docDate: dateOrNull(extracted.docDate.value),
    dueDate: dateOrNull(extracted.dueDate.value),
    currency: extracted.currency.value ?? 'CHF',
    subtotalCents: extracted.subtotalCents.value,
    vatCents: extracted.vatCents.value,
    totalCents: extracted.totalCents.value,
    iban: extracted.iban.value,
  };
}

async function uploadIncomingDocumentCore(formData: FormData): Promise<string> {
  const session = await requireRole(UPLOAD_ROLES);
  const userId = Number(session.user?.id);
  if (!userId) throw new Error('Sessione non valida');

  const parsed = incomingDocumentUploadSchema.safeParse({
    type: formData.get('type'),
    notes: formData.get('notes') ?? '',
    clientId: formData.get('clientId') ?? '',
    propertyId: formData.get('propertyId') ?? '',
    interventionId: formData.get('interventionId') ?? '',
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Dati non validi');
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('File mancante');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('File troppo grande (max 10 MB)');
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const upload = await uploadBuffer(buffer, {
    folder: 'astsa/incoming-documents',
    resourceType: 'auto',
  });

  const ocr = await extractDocument(buffer, file.name, ocrKindForType(parsed.data.type));
  const initial = pickInitialFromExtracted(ocr.extracted);

  const created = await prisma.incomingDocument.create({
    data: {
      type: parsed.data.type,
      status: 'DA_VALIDARE',
      fileUrl: upload.url,
      filePublicId: upload.publicId,
      mimeType: file.type || null,
      rawOcrData: JSON.stringify(ocr.raw),
      extracted: JSON.stringify(ocr.extracted),
      ocrConfidence: ocr.extracted.overallConfidence,
      ocrProvider: ocr.extracted.provider,
      supplierName: initial.supplierName,
      supplierVat: initial.supplierVat,
      docNumber: initial.docNumber,
      docDate: initial.docDate,
      dueDate: initial.dueDate,
      currency: initial.currency,
      subtotalCents: initial.subtotalCents,
      vatCents: initial.vatCents,
      totalCents: initial.totalCents,
      iban: initial.iban,
      clientId: parsed.data.clientId ?? null,
      propertyId: parsed.data.propertyId ?? null,
      interventionId: parsed.data.interventionId ?? null,
      notes: parsed.data.notes ?? null,
      createdById: userId,
    },
  });

  revalidatePath('/dashboard/documents');
  return created.id;
}

export async function uploadIncomingDocument(formData: FormData): Promise<void> {
  await uploadIncomingDocumentCore(formData);
}

export async function uploadAndRedirectFromMobile(formData: FormData) {
  const id = await uploadIncomingDocumentCore(formData);
  redirect(`/work/scan/done?id=${id}`);
}

export async function updateIncomingDocument(formData: FormData) {
  const session = await requireRole(ADMIN_ROLES);
  const userId = Number(session.user?.id);

  const parsed = incomingDocumentUpdateSchema.safeParse({
    id: formData.get('id'),
    type: formData.get('type'),
    supplierName: formData.get('supplierName') ?? '',
    supplierVat: formData.get('supplierVat') ?? '',
    docNumber: formData.get('docNumber') ?? '',
    docDate: formData.get('docDate') ?? '',
    dueDate: formData.get('dueDate') ?? '',
    currency: formData.get('currency') ?? '',
    subtotalCents: formData.get('subtotalCents') ?? '',
    vatCents: formData.get('vatCents') ?? '',
    totalCents: formData.get('totalCents') ?? '',
    iban: formData.get('iban') ?? '',
    category: formData.get('category') ?? '',
    clientId: formData.get('clientId') ?? '',
    propertyId: formData.get('propertyId') ?? '',
    interventionId: formData.get('interventionId') ?? '',
    notes: formData.get('notes') ?? '',
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Dati non validi');
  }
  const data = parsed.data;

  await prisma.incomingDocument.update({
    where: { id: data.id },
    data: {
      type: data.type,
      supplierName: data.supplierName ?? null,
      supplierVat: data.supplierVat ?? null,
      docNumber: data.docNumber ?? null,
      docDate: dateOrNull(data.docDate ?? null),
      dueDate: dateOrNull(data.dueDate ?? null),
      currency: data.currency ?? 'CHF',
      subtotalCents: data.subtotalCents ?? null,
      vatCents: data.vatCents ?? null,
      totalCents: data.totalCents ?? null,
      iban: data.iban ?? null,
      category: data.category ?? null,
      clientId: data.clientId ?? null,
      propertyId: data.propertyId ?? null,
      interventionId: data.interventionId ?? null,
      notes: data.notes ?? null,
      verifiedData: JSON.stringify({
        ...data,
        verifiedById: userId,
        verifiedAt: new Date().toISOString(),
      }),
    },
  });

  revalidatePath('/dashboard/documents');
  revalidatePath(`/dashboard/documents/${data.id}`);
}

export async function validateIncomingDocument(formData: FormData) {
  const session = await requireRole(ADMIN_ROLES);
  const userId = Number(session.user?.id);
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('ID documento mancante');

  await prisma.incomingDocument.update({
    where: { id },
    data: {
      status: 'VALIDATO',
      validatedById: userId,
      validatedAt: new Date(),
    },
  });

  revalidatePath('/dashboard/documents');
  revalidatePath(`/dashboard/documents/${id}`);
}

export async function markReadyForExport(formData: FormData) {
  await requireRole(ADMIN_ROLES);
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('ID documento mancante');

  await prisma.incomingDocument.update({
    where: { id },
    data: { status: 'PRONTO_EXPORT' },
  });

  revalidatePath('/dashboard/documents');
  revalidatePath(`/dashboard/documents/${id}`);
}

export async function discardIncomingDocument(formData: FormData) {
  await requireRole(ADMIN_ROLES);
  const parsed = incomingDocumentDiscardSchema.safeParse({
    id: formData.get('id'),
    discardReason: formData.get('discardReason') ?? '',
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Motivo di scarto richiesto');
  }

  await prisma.incomingDocument.update({
    where: { id: parsed.data.id },
    data: {
      status: 'SCARTATO',
      discardReason: parsed.data.discardReason,
    },
  });

  revalidatePath('/dashboard/documents');
  revalidatePath(`/dashboard/documents/${parsed.data.id}`);
}

/**
 * Helper di lettura tipato per le pagine.
 */
export async function getIncomingDocument(id: string) {
  await auth(); // garantisce contesto autenticato
  return prisma.incomingDocument.findUnique({
    where: { id },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      validatedBy: { select: { firstName: true, lastName: true } },
      client: { select: { id: true, businessName: true } },
      property: { select: { id: true, name: true } },
      intervention: { select: { id: true, startedAt: true } },
    },
  });
}

export type IncomingDocumentDetail = NonNullable<
  Awaited<ReturnType<typeof getIncomingDocument>>
>;
