import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { auth } from '@/lib/auth';
import { canAccessRole } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { DailyReportPdf } from '@/lib/pdf/DailyReportPdf';
import type { Locale } from '@/lib/i18n/types';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workerIdStr = searchParams.get('workerId');
  const dateStr = searchParams.get('date');
  const locale = (searchParams.get('locale') ?? 'it') as Locale;

  if (!workerIdStr || !dateStr) {
    return NextResponse.json({ error: 'Parametri mancanti: workerId, date' }, { status: 400 });
  }

  const workerId = parseInt(workerIdStr, 10);
  const userId = parseInt(session.user.id, 10);
  const isAdmin = canAccessRole(session.user.role, ['AMMINISTRAZIONE']);

  if (!isAdmin && userId !== workerId) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 });
  }

  const worker = await prisma.user.findUnique({ where: { id: workerId } });
  if (!worker) return NextResponse.json({ error: 'Dipendente non trovato' }, { status: 404 });

  const date = new Date(dateStr);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const interventions = await prisma.intervention.findMany({
    where: {
      workers: { some: { userId: workerId } },
      startedAt: { gte: startOfDay, lte: endOfDay },
    },
    include: { property: true },
    orderBy: { startedAt: 'asc' },
  });

  const element = React.createElement(DailyReportPdf, {
    data: { worker, date, interventions },
    locale,
  });

  const buffer = await renderToBuffer(element);
  const filename = `rapporto-giornaliero-${dateStr}-${locale}.pdf`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
