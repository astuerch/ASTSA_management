import { Card } from '@/components/ui/card';
import {
  MonthlyHoursTrendChart,
  RevenueMixChart,
  TopPropertiesChart,
} from '@/components/kpi/charts';
import { KpiCard } from '@/components/kpi/kpi-card';
import { requireRole } from '@/lib/auth';
import {
  getMonthlyHoursTrend,
  getRevenueMixByWorkType,
  getTopPropertiesByHours,
} from '@/lib/kpi/charts';
import { getKpiSummary } from '@/lib/kpi/metrics';
import { getCurrentMonthRange, getPreviousPeriodRange } from '@/lib/kpi/period';
import { formatCents } from '@/lib/money';
import { formatDuration } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function KpiPage() {
  await requireRole(['DIREZIONE']);

  const now = new Date();
  const current = getCurrentMonthRange(now);
  const previous = getPreviousPeriodRange(current);

  const [summary, trend, mix, topProperties] = await Promise.all([
    getKpiSummary(current, previous),
    getMonthlyHoursTrend(now),
    getRevenueMixByWorkType(current),
    getTopPropertiesByHours(current, 10),
  ]);

  const hint = `vs ${previous.label}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard KPI</h1>
        <p className="text-sm text-slate-500">
          Periodo: {current.label} · confronto con {previous.label}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Interventi totali"
          value={String(summary.interventionsTotal.current)}
          deltaPercent={summary.interventionsTotal.deltaPercent}
          hint={hint}
        />
        <KpiCard
          label="Interventi EXTRA"
          value={String(summary.interventionsExtra.current)}
          deltaPercent={summary.interventionsExtra.deltaPercent}
          hint={hint}
        />
        <KpiCard
          label="Picchetto"
          value={String(summary.interventionsPicket.current)}
          deltaPercent={summary.interventionsPicket.deltaPercent}
          hint={hint}
        />
        <KpiCard
          label="Ore totali"
          value={formatDuration(summary.hoursTotal.current)}
          deltaPercent={summary.hoursTotal.deltaPercent}
          hint={hint}
        />
        <KpiCard
          label="Ore EXTRA"
          value={formatDuration(summary.hoursExtra.current)}
          deltaPercent={summary.hoursExtra.deltaPercent}
          hint={hint}
        />
        <KpiCard
          label="Ricavi previsti"
          value={formatCents(summary.revenueExpectedCents.current)}
          deltaPercent={summary.revenueExpectedCents.deltaPercent}
          hint={hint}
        />
        <KpiCard
          label="Costo materiali"
          value={formatCents(summary.materialsCostCents.current)}
          deltaPercent={summary.materialsCostCents.deltaPercent}
          inverse
          hint={hint}
        />
        <KpiCard
          label="Margine lordo stimato"
          value={formatCents(summary.grossMarginCents.current)}
          deltaPercent={summary.grossMarginCents.deltaPercent}
          hint={hint}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">Trend ore (12 mesi)</h2>
          <p className="text-xs text-slate-500">Totale e quota EXTRA per mese.</p>
          <MonthlyHoursTrendChart data={trend} />
        </Card>

        <Card className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">Mix ricavi per WorkType</h2>
          <p className="text-xs text-slate-500">Ricavi del periodo, raggruppati per tipologia di intervento.</p>
          <RevenueMixChart data={mix} />
        </Card>

        <Card className="space-y-2 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700">Top stabili per ore consumate</h2>
          <p className="text-xs text-slate-500">I 10 stabili che hanno richiesto più ore nel periodo.</p>
          <TopPropertiesChart data={topProperties} />
        </Card>
      </div>

      <p className="text-xs text-slate-400">
        I ricavi previsti includono bozze fattura in stato PRONTO_EXPORT, ESPORTATO,
        REGISTRATO_SAGE. Il margine lordo stimato sottrae costo personale (ore × tariffa
        oraria utente) e materiali (quantità × costo unitario). Non include costi fissi.
      </p>
    </div>
  );
}
