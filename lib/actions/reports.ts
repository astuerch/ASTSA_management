'use server';

import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessRole } from '@/lib/permissions';
import { uploadImage } from '@/lib/cloudinary';
import { InterventionReportPdf } from '@/lib/pdf/InterventionReportPdf';
import { DailyReportPdf } from '@/lib/pdf/DailyReportPdf';
import { PropertyHistoryReportPdf } from '@/lib/pdf/PropertyHistoryReportPdf';
import { MonthlyHoursReportPdf } from '@/lib/pdf/MonthlyHoursReportPdf';
import type { Locale } from '@/lib/i18n/types';
import type { ReportKind } from '@prisma/client';

async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non autenticato');
  return session.user;
}

export async function generateInterventionReport(
  interventionId: number,
  locale: Locale,
  variant: 'client' | 'internal',
): Promise<{ url: string; reportId: string }> {
  const user = await getCurrentUser();
  const userId = parseInt(user.id, 10);
  const isAdmin = canAccessRole(user.role, ['AMMINISTRAZIONE']);
  const isCapo = canAccessRole(user.role, ['CAPOSQUADRA']);

  if (variant === 'internal' && !isCapo) {
    throw new Error('Solo caposquadra e amministrazione possono generare la variante interna');
  }

  const iv = await prisma.intervention.findUnique({
    where: { id: interventionId },
    include: {
      property: { include: { client: true } },
      workers: { include: { user: true } },
      photos: true,
      materials: { include: { material: true } },
    },
  });

  if (!iv) throw new Error('Intervento non trovato');

  if (!isAdmin) {
    const isWorker = iv.workers.some((w) => w.userId === userId);
    if (!isWorker) throw new Error('Accesso negato');
  }

  const element = React.createElement(InterventionReportPdf, {
    data: iv as Parameters<typeof InterventionReportPdf>[0]['data'],
    locale,
    variant,
  });

  const buffer = Buffer.from(await renderToBuffer(element));
  const folder = `astsa/reports/interventions`;
  const { url, publicId } = await uploadImage(buffer, folder);

  const report = await prisma.generatedReport.create({
    data: {
      kind: 'INTERVENTION' as ReportKind,
      locale,
      variant,
      interventionId,
      pdfUrl: url,
      pdfPublicId: publicId,
      generatedById: userId,
    },
  });

  return { url, reportId: report.id };
}

export async function generateDailyReport(
  workerId: number,
  date: Date,
  locale: Locale,
): Promise<{ url: string; reportId: string }> {
  const user = await getCurrentUser();
  const userId = parseInt(user.id, 10);
  const isAdmin = canAccessRole(user.role, ['AMMINISTRAZIONE']);

  if (!isAdmin && userId !== workerId) {
    throw new Error('Accesso negato');
  }

  const worker = await prisma.user.findUnique({ where: { id: workerId } });
  if (!worker) throw new Error('Dipendente non trovato');

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

  const buffer = Buffer.from(await renderToBuffer(element));
  const { url, publicId } = await uploadImage(buffer, `astsa/reports/daily`);

  const report = await prisma.generatedReport.create({
    data: {
      kind: 'DAILY' as ReportKind,
      locale,
      workerId,
      periodFrom: startOfDay,
      periodTo: endOfDay,
      pdfUrl: url,
      pdfPublicId: publicId,
      generatedById: userId,
    },
  });

  return { url, reportId: report.id };
}

export async function generatePropertyReport(
  propertyId: number,
  from: Date,
  to: Date,
  locale: Locale,
  variant: 'client' | 'internal',
): Promise<{ url: string; reportId: string }> {
  const user = await getCurrentUser();
  const userId = parseInt(user.id, 10);
  const isAdmin = canAccessRole(user.role, ['AMMINISTRAZIONE']);

  if (!isAdmin) throw new Error('Solo amministrazione può generare storico stabile');

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { client: true },
  });
  if (!property) throw new Error('Stabile non trovato');

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
  });

  const buffer = Buffer.from(await renderToBuffer(element));
  const { url, publicId } = await uploadImage(buffer, `astsa/reports/properties`);

  const report = await prisma.generatedReport.create({
    data: {
      kind: 'PROPERTY_HISTORY' as ReportKind,
      locale,
      variant,
      propertyId,
      periodFrom: from,
      periodTo: to,
      pdfUrl: url,
      pdfPublicId: publicId,
      generatedById: userId,
    },
  });

  return { url, reportId: report.id };
}

export async function generateMonthlyReport(
  workerId: number,
  year: number,
  month: number,
  locale: Locale,
): Promise<{ url: string; reportId: string }> {
  const user = await getCurrentUser();
  const userId = parseInt(user.id, 10);
  const isAdmin = canAccessRole(user.role, ['AMMINISTRAZIONE']);

  if (!isAdmin && userId !== workerId) throw new Error('Accesso negato');

  const worker = await prisma.user.findUnique({ where: { id: workerId } });
  if (!worker) throw new Error('Dipendente non trovato');

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
  });

  const buffer = Buffer.from(await renderToBuffer(element));
  const { url, publicId } = await uploadImage(buffer, `astsa/reports/monthly`);

  const report = await prisma.generatedReport.create({
    data: {
      kind: 'MONTHLY_HOURS' as ReportKind,
      locale,
      workerId,
      periodFrom: from,
      periodTo: to,
      pdfUrl: url,
      pdfPublicId: publicId,
      generatedById: userId,
    },
  });

  return { url, reportId: report.id };
}
