import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { buildIncomingDocumentsCsv } from '@/lib/documents/csv-export';
import { prisma } from '@/lib/prisma';

const ALLOWED_STATUSES = ['DA_VALIDARE', 'VALIDATO', 'PRONTO_EXPORT', 'SCARTATO'] as const;
const ALLOWED_TYPES = [
  'FATTURA_FORNITORE',
  'RICEVUTA',
  'BOLLA_CONSEGNA',
  'PREVENTIVO_RICEVUTO',
] as const;

export async function GET(req: NextRequest) {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get('status');
  const typeParam = searchParams.get('type');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  const where: Prisma.IncomingDocumentWhereInput = {};

  // Default: solo documenti pronti per l'export
  if (statusParam && (ALLOWED_STATUSES as readonly string[]).includes(statusParam)) {
    where.status = statusParam as Prisma.IncomingDocumentWhereInput['status'];
  } else if (!statusParam) {
    where.status = 'PRONTO_EXPORT';
  }

  if (typeParam && (ALLOWED_TYPES as readonly string[]).includes(typeParam)) {
    where.type = typeParam as Prisma.IncomingDocumentWhereInput['type'];
  }

  if (fromParam || toParam) {
    const range: { gte?: Date; lte?: Date } = {};
    const from = fromParam ? new Date(fromParam) : null;
    const to = toParam ? new Date(toParam) : null;
    if (from && !Number.isNaN(from.getTime())) range.gte = from;
    if (to && !Number.isNaN(to.getTime())) range.lte = to;
    if (Object.keys(range).length > 0) where.docDate = range;
  }

  const docs = await prisma.incomingDocument.findMany({
    where,
    orderBy: { docDate: 'desc' },
    include: {
      client: { select: { businessName: true } },
      property: { select: { name: true } },
    },
  });

  const csv = buildIncomingDocumentsCsv(
    docs.map((d) => ({
      id: d.id,
      type: d.type,
      status: d.status,
      docDate: d.docDate,
      dueDate: d.dueDate,
      supplierName: d.supplierName,
      supplierVat: d.supplierVat,
      docNumber: d.docNumber,
      currency: d.currency,
      subtotalCents: d.subtotalCents,
      vatCents: d.vatCents,
      totalCents: d.totalCents,
      iban: d.iban,
      category: d.category,
      client: d.client,
      property: d.property,
      interventionId: d.interventionId,
      fileUrl: d.fileUrl,
      notes: d.notes,
    })),
  );

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="documenti-entrata-${today}.csv"`,
    },
  });
}
