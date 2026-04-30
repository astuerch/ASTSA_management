import type { WorkType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getLast12MonthlyBuckets, type PeriodRange } from './period';

export interface MonthlyHoursPoint {
  month: string; // label "Apr 26"
  totalMinutes: number;
  extraMinutes: number;
}

export interface RevenueMixSlice {
  workType: string;
  totalCents: number;
}

export interface TopPropertyRow {
  propertyId: number;
  propertyName: string;
  clientName: string;
  totalMinutes: number;
}

/**
 * Trend ore mensili negli ultimi 12 mesi. Una query unica con groupBy
 * sarebbe ideale ma SQLite + Prisma non gruppa per mese fittizio,
 * quindi facciamo 12 aggregate parallele (12 query, ognuna < 5ms).
 */
export async function getMonthlyHoursTrend(now: Date = new Date()): Promise<MonthlyHoursPoint[]> {
  const buckets = getLast12MonthlyBuckets(now);
  const results = await Promise.all(
    buckets.map(async (bucket) => {
      const [total, extra] = await Promise.all([
        sumMinutesInRange(bucket),
        sumMinutesInRange(bucket, 'EXTRA'),
      ]);
      return {
        month: bucket.label,
        totalMinutes: total,
        extraMinutes: extra,
      };
    }),
  );
  return results;
}

async function sumMinutesInRange(
  range: PeriodRange,
  workType?: WorkType,
): Promise<number> {
  const result = await prisma.intervention.aggregate({
    where: {
      ...(workType ? { workType } : {}),
      durationMinutes: { not: null },
      OR: [
        { startedAt: { gte: range.from, lt: range.to } },
        { AND: [{ startedAt: null }, { createdAt: { gte: range.from, lt: range.to } }] },
      ],
    },
    _sum: { durationMinutes: true },
  });
  return result._sum.durationMinutes ?? 0;
}

/**
 * Mix ricavi per workType nel periodo. Aggrega bozze fatture in stato
 * PRONTO_EXPORT/ESPORTATO/REGISTRATO_SAGE collegate a un intervento,
 * raggruppate per `intervention.workType`. Le fatture senza intervento
 * (ricavi manuali) finiscono in "ALTRO".
 */
export async function getRevenueMixByWorkType(
  range: PeriodRange,
): Promise<RevenueMixSlice[]> {
  const drafts = await prisma.invoiceDraft.findMany({
    where: {
      status: { in: ['PRONTO_EXPORT', 'ESPORTATO', 'REGISTRATO_SAGE'] },
      documentDate: { gte: range.from, lt: range.to },
    },
    select: {
      totalCents: true,
      fromIntervention: { select: { workType: true } },
    },
  });

  const buckets = new Map<string, number>();
  for (const draft of drafts) {
    const key = draft.fromIntervention?.workType ?? 'ALTRO';
    buckets.set(key, (buckets.get(key) ?? 0) + draft.totalCents);
  }

  return Array.from(buckets.entries())
    .map(([workType, totalCents]) => ({ workType, totalCents }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

/**
 * Top N stabili per ore consumate nel periodo.
 */
export async function getTopPropertiesByHours(
  range: PeriodRange,
  limit: number = 10,
): Promise<TopPropertyRow[]> {
  const grouped = await prisma.intervention.groupBy({
    by: ['propertyId'],
    where: {
      durationMinutes: { not: null },
      OR: [
        { startedAt: { gte: range.from, lt: range.to } },
        { AND: [{ startedAt: null }, { createdAt: { gte: range.from, lt: range.to } }] },
      ],
    },
    _sum: { durationMinutes: true },
    orderBy: { _sum: { durationMinutes: 'desc' } },
    take: limit,
  });

  if (grouped.length === 0) return [];

  const properties = await prisma.property.findMany({
    where: { id: { in: grouped.map((g) => g.propertyId) } },
    select: {
      id: true,
      name: true,
      client: { select: { businessName: true } },
    },
  });
  const propMap = new Map(properties.map((p) => [p.id, p]));

  return grouped
    .map((g) => {
      const prop = propMap.get(g.propertyId);
      if (!prop) return null;
      return {
        propertyId: g.propertyId,
        propertyName: prop.name,
        clientName: prop.client.businessName,
        totalMinutes: g._sum.durationMinutes ?? 0,
      };
    })
    .filter((r): r is TopPropertyRow => r !== null);
}
