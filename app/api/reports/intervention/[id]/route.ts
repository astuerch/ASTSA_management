import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { auth } from '@/lib/auth';
import { canAccessRole } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { InterventionReportPdf } from '@/lib/pdf/InterventionReportPdf';
import type { Locale } from '@/lib/i18n/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const locale = (searchParams.get('locale') ?? 'it') as Locale;
  const variant = (searchParams.get('variant') ?? 'client') as 'client' | 'internal';

  const isAdmin = canAccessRole(session.user.role, ['AMMINISTRAZIONE']);
  const isCapo = canAccessRole(session.user.role, ['CAPOSQUADRA']);

  if (variant === 'internal' && !isCapo) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 });
  }

  const userId = parseInt(session.user.id, 10);
  const interventionId = parseInt(id, 10);

  const iv = await prisma.intervention.findUnique({
    where: { id: interventionId },
    include: {
      property: { include: { client: true } },
      workers: { include: { user: true } },
      photos: true,
      materials: { include: { material: true } },
    },
  });

  if (!iv) return NextResponse.json({ error: 'Non trovato' }, { status: 404 });

  if (!isAdmin) {
    const isWorker = iv.workers.some((w) => w.userId === userId);
    if (!isWorker) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 });
  }

  const element = React.createElement(InterventionReportPdf, {
    data: iv as Parameters<typeof InterventionReportPdf>[0]['data'],
    locale,
    variant,
  }) as React.ReactElement<any>;

  const buffer = Buffer.from(await renderToBuffer(element));

  const filename = `rapporto-intervento-${id}-${locale}-${variant}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
