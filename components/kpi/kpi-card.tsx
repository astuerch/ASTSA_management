import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  /** Valore già formattato (string) per essere flessibili: "CHF 12'500", "342h 15min", "12". */
  value: string;
  /** Delta % vs periodo precedente. null = nessun confronto disponibile. */
  deltaPercent: number | null;
  /**
   * Se true, un delta positivo viene rappresentato come "negativo" (rosso)
   * — utile per i KPI di costo dove "in aumento" è cattiva notizia.
   */
  inverse?: boolean;
  /** Sottotitolo opzionale, es. "vs Marzo 2026". */
  hint?: string;
}

function formatDelta(percent: number): string {
  const rounded = Math.round(percent * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(1)}%`;
}

export function KpiCard({ label, value, deltaPercent, inverse, hint }: KpiCardProps) {
  let deltaColor = 'text-slate-500';
  let deltaArrow = '·';
  let deltaText = '—';

  if (deltaPercent !== null) {
    deltaText = formatDelta(deltaPercent);
    if (deltaPercent > 0) {
      deltaArrow = '↑';
      deltaColor = inverse ? 'text-red-600' : 'text-green-600';
    } else if (deltaPercent < 0) {
      deltaArrow = '↓';
      deltaColor = inverse ? 'text-green-600' : 'text-red-600';
    } else {
      deltaArrow = '·';
      deltaColor = 'text-slate-500';
    }
  }

  return (
    <Card className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className={cn('text-xs font-medium', deltaColor)}>
        <span className="mr-1">{deltaArrow}</span>
        {deltaText}
        {hint && <span className="ml-1 text-slate-400">{hint}</span>}
      </p>
    </Card>
  );
}
