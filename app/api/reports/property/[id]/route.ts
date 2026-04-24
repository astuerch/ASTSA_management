import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { auth } from '@/lib/auth';
import { canAccessRole } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { PropertyHistoryReportPdf } from '@/lib/pdf/PropertyHistoryReportPdf';
import type { Locale } from '@/lib/i18n/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  if (!canAccessRole(session.user.role, ['AMMINISTRAZIONE'])) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const locale = (searchParams.get('locale') ?? 'it') as Locale;
  const variant = (searchParams.get('variant') ?? 'client') as 'client' | 'internal';
  const fromStr = searchParams.get('from');
  const toStr = searchParams.get('to');

  if (!fromStr || !toStr) {
    return NextResponse.json({ error: 'Parametri mancanti: from, to' }, { status: 400 });
  }

  const propertyId = parseInt(id, 10);
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { client: true },
  });
  if (!property) return NextResponse.json({ error: 'Non trovato' }, { status: 404 });

  const from = new Date(fromStr);
  const to = new Date(toStr);

  const interventions = await prisma.intervention.findMany({
    where: {
      propertyId,
      startedAt: { gte: from, lte: to },
    },
    include: {
      workers: { include: { user: true } },
      materials: { include: { material: true } },
    },
    orderBy: { startedAt: 'asc' },
  });

  const element = React.createElement(PropertyHistoryReportPdf, {
    data: { property, periodFrom: from, periodTo: to, interventions, variant },
    locale,
  }) as React.ReactElement<any>;

  const buffer = Buffer.from(await renderToBuffer(element));
  const filename = `storico-stabile-${id}-${locale}-${variant}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
