import type { WorkType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { deltaPercent, type PeriodRange } from './period';

export interface KpiValue {
  current: number;
  previous: number;
  /** Delta % rispetto al periodo precedente. null = previous era 0 (no confronto). */
  deltaPercent: number | null;
}

export interface KpiSummary {
  interventionsTotal: KpiValue;
  interventionsExtra: KpiValue;
  interventionsPicket: KpiValue;
  hoursTotal: KpiValue; // in minuti, formattati nel layer di presentazione
  hoursExtra: KpiValue;
  revenueExpectedCents: KpiValue;
  materialsCostCents: KpiValue;
  grossMarginCents: KpiValue;
}

const REVENUE_STATUSES = ['PRONTO_EXPORT', 'ESPORTATO', 'REGISTRATO_SAGE'] as const;
type RevenueStatus = (typeof REVENUE_STATUSES)[number];

/**
 * Conta interventi nel periodo, opzionalmente filtrati per workType.
 * Si basa su `startedAt` (timer mobile) con fallback su `createdAt`
 * per gli interventi creati a mano dall'admin.
 */
async function countInterventions(
  range: PeriodRange,
  workType?: WorkType,
): Promise<number> {
  return prisma.intervention.count({
    where: {
      ...(workType ? { workType } : {}),
      OR: [
        { startedAt: { gte: range.from, lt: range.to } },
        { AND: [{ startedAt: null }, { createdAt: { gte: range.from, lt: range.to } }] },
      ],
    },
  });
}

/**
 * Somma minuti di durata interventi nel periodo.
 * Solo interventi con `durationMinutes` valorizzato (= chiusi).
 */
async function sumInterventionMinutes(
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
 * Ricavi previsti = somma totali bozze fatture in stato PRONTO_EXPORT,
 * ESPORTATO o REGISTRATO_SAGE, datate nel periodo (`documentDate`).
 * Esclude BOZZA e ANNULLATO perché non rappresentano ricavi acquisiti.
 */
async function sumRevenueCents(range: PeriodRange): Promise<number> {
  const result = await prisma.invoiceDraft.aggregate({
    where: {
      status: { in: REVENUE_STATUSES as unknown as RevenueStatus[] },
      documentDate: { gte: range.from, lt: range.to },
    },
    _sum: { totalCents: true },
  });
  return result._sum.totalCents ?? 0;
}

/**
 * Costo materiali consumati nel periodo: somma `quantity * unit_cost_cents`
 * per tutti i materiali collegati a interventi avvenuti nel periodo.
 *
 * Notes: sviluppato come query JS lato Node perché Prisma SQLite non
 * supporta groupBy con expression `quantity * unitCostCents`. Il volume
 * (poche centinaia di righe/mese) lo permette tranquillamente.
 */
async function sumMaterialsCostCents(range: PeriodRange): Promise<number> {
  const rows = await prisma.interventionMaterial.findMany({
    where: {
      intervention: {
        OR: [
          { startedAt: { gte: range.from, lt: range.to } },
          { AND: [{ startedAt: null }, { createdAt: { gte: range.from, lt: range.to } }] },
        ],
      },
    },
    select: {
      quantity: true,
      unitCostCents: true,
      material: { select: { unitCostCents: true } },
    },
  });
  return rows.reduce((acc, row) => {
    const unit = row.unitCostCents ?? row.material.unitCostCents;
    return acc + Math.round(row.quantity * unit);
  }, 0);
}

/**
 * Costo personale stimato: somma `durationMinutes / 60 * hourly_cost_cents`
 * per ogni intervention_worker negli interventi del periodo.
 * Usa il `hourly_cost_cents` corrente dell'utente (no point-in-time).
 */
async function sumLaborCostCents(range: PeriodRange): Promise<number> {
  const rows = await prisma.interventionWorker.findMany({
    where: {
      intervention: {
        durationMinutes: { not: null },
        OR: [
          { startedAt: { gte: range.from, lt: range.to } },
          { AND: [{ startedAt: null }, { createdAt: { gte: range.from, lt: range.to } }] },
        ],
      },
    },
    select: {
      intervention: { select: { durationMinutes: true } },
      user: { select: { hourlyCostCents: true } },
    },
  });
  return rows.reduce((acc, row) => {
    const minutes = row.intervention.durationMinutes ?? 0;
    const rate = row.user.hourlyCostCents ?? 0;
    return acc + Math.round((minutes / 60) * rate);
  }, 0);
}

function buildKpiValue(current: number, previous: number): KpiValue {
  return { current, previous, deltaPercent: deltaPercent(current, previous) };
}

/**
 * Top-line KPIs per la dashboard direzione.
 * Esegue tutte le query in parallelo per il periodo corrente e quello
 * precedente. Tipico runtime: < 100ms su SQLite con qualche centinaio
 * di righe/mese.
 */
export async function getKpiSummary(
  current: PeriodRange,
  previous: PeriodRange,
): Promise<KpiSummary> {
  const [
    interventionsCur,
    interventionsPrev,
    interventionsExtraCur,
    interventionsExtraPrev,
    interventionsPicketCur,
    interventionsPicketPrev,
    hoursCur,
    hoursPrev,
    hoursExtraCur,
    hoursExtraPrev,
    revenueCur,
    revenuePrev,
    materialsCur,
    materialsPrev,
    laborCur,
    laborPrev,
  ] = await Promise.all([
    countInterventions(current),
    countInterventions(previous),
    countInterventions(current, 'EXTRA'),
    countInterventions(previous, 'EXTRA'),
    countInterventions(current, 'PICCHETTO'),
    countInterventions(previous, 'PICCHETTO'),
    sumInterventionMinutes(current),
    sumInterventionMinutes(previous),
    sumInterventionMinutes(current, 'EXTRA'),
    sumInterventionMinutes(previous, 'EXTRA'),
    sumRevenueCents(current),
    sumRevenueCents(previous),
    sumMaterialsCostCents(current),
    sumMaterialsCostCents(previous),
    sumLaborCostCents(current),
    sumLaborCostCents(previous),
  ]);

  const marginCur = revenueCur - materialsCur - laborCur;
  const marginPrev = revenuePrev - materialsPrev - laborPrev;

  return {
    interventionsTotal: buildKpiValue(interventionsCur, interventionsPrev),
    interventionsExtra: buildKpiValue(interventionsExtraCur, interventionsExtraPrev),
    interventionsPicket: buildKpiValue(interventionsPicketCur, interventionsPicketPrev),
    hoursTotal: buildKpiValue(hoursCur, hoursPrev),
    hoursExtra: buildKpiValue(hoursExtraCur, hoursExtraPrev),
    revenueExpectedCents: buildKpiValue(revenueCur, revenuePrev),
    materialsCostCents: buildKpiValue(materialsCur, materialsPrev),
    grossMarginCents: buildKpiValue(marginCur, marginPrev),
  };
}
