import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { auth } from '@/lib/auth';
import { canAccessRole } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { MonthlyHoursReportPdf } from '@/lib/pdf/MonthlyHoursReportPdf';
import type { Locale } from '@/lib/i18n/types';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workerIdStr = searchParams.get('workerId');
  const yearStr = searchParams.get('year');
  const monthStr = searchParams.get('month');
  const locale = (searchParams.get('locale') ?? 'it') as Locale;

  if (!workerIdStr || !yearStr || !monthStr) {
    return NextResponse.json({ error: 'Parametri mancanti: workerId, year, month' }, { status: 400 });
  }

  const workerId = parseInt(workerIdStr, 10);
  const userId = parseInt(session.user.id, 10);
  const isAdmin = canAccessRole(session.user.role, ['AMMINISTRAZIONE']);

  if (!isAdmin && userId !== workerId) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 });
  }

  const worker = await prisma.user.findUnique({ where: { id: workerId } });
  if (!worker) return NextResponse.json({ error: 'Dipendente non trovato' }, { status: 404 });

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59, 999);

  const interventions = await prisma.intervention.findMany({
    where: {
      workers: { some: { userId: workerId } },
      startedAt: { gte: from, lte: to },
    },
    orderBy: { startedAt: 'asc' },
  });

  const element = React.createElement(MonthlyHoursReportPdf, {
    data: { worker, year, month, interventions },
    locale,
  }) as React.ReactElement<any>;

  const buffer = Buffer.from(await renderToBuffer(element));
  const filename = `ore-mensili-${yearStr}-${monthStr.padStart(2, '0')}-${locale}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
