/**
 * Helpers periodo per la dashboard KPI.
 *
 * Convenzione: tutti i range sono [from, to) — `from` incluso, `to` escluso.
 * Permette confronti puliti senza ambiguità sull'ultimo millisecondo del giorno.
 */

export interface PeriodRange {
  /** Inclusivo */
  from: Date;
  /** Esclusivo */
  to: Date;
  /** Etichetta human-readable, es. "Aprile 2026" o "1-29 Aprile 2026" */
  label: string;
}

const MONTH_LABELS_IT = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
];

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1, 0, 0, 0, 0);
}

function startOfNextMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 1, 0, 0, 0, 0);
}

/**
 * Mese corrente fino a "ora" (inclusivo del giorno corrente, fino a istante now).
 * Default per la dashboard quando l'utente non specifica nulla.
 */
export function getCurrentMonthRange(now: Date = new Date()): PeriodRange {
  const from = startOfMonth(now.getFullYear(), now.getMonth());
  // L'estremo `to` è "ora": permette il confronto a parità di giorni col mese precedente.
  const to = new Date(now.getTime());
  return {
    from,
    to,
    label: `1-${now.getDate()} ${MONTH_LABELS_IT[now.getMonth()]} ${now.getFullYear()}`,
  };
}

/**
 * Periodo precedente con la stessa lunghezza in giorni.
 * Es. mese corrente 1-29 aprile → periodo precedente 1-29 marzo.
 * Per il mese pieno → mese intero precedente.
 */
export function getPreviousPeriodRange(current: PeriodRange): PeriodRange {
  const monthsBack = 1;
  const fromYear = current.from.getFullYear();
  const fromMonth = current.from.getMonth() - monthsBack;
  const previousFrom = startOfMonth(fromYear, fromMonth);

  // Se il `to` corrente è strettamente dentro il mese, prendiamo lo stesso giorno
  // (stesso lasso). Altrimenti prendiamo il mese precedente intero.
  const currentMonthEnd = startOfNextMonth(fromYear, current.from.getMonth());
  const isPartialMonth = current.to.getTime() < currentMonthEnd.getTime();

  if (isPartialMonth) {
    const dayOfMonth = current.to.getDate();
    const hour = current.to.getHours();
    const minute = current.to.getMinutes();
    const previousTo = new Date(
      previousFrom.getFullYear(),
      previousFrom.getMonth(),
      dayOfMonth,
      hour,
      minute,
      0,
      0,
    );
    return {
      from: previousFrom,
      to: previousTo,
      label: `1-${dayOfMonth} ${MONTH_LABELS_IT[previousFrom.getMonth()]} ${previousFrom.getFullYear()}`,
    };
  }

  return {
    from: previousFrom,
    to: startOfNextMonth(previousFrom.getFullYear(), previousFrom.getMonth()),
    label: `${MONTH_LABELS_IT[previousFrom.getMonth()]} ${previousFrom.getFullYear()}`,
  };
}

/**
 * 12 finestre mensili che terminano nel mese del `now`.
 * Usate per il line chart "Trend ore 12 mesi".
 */
export function getLast12MonthlyBuckets(now: Date = new Date()): PeriodRange[] {
  const buckets: PeriodRange[] = [];
  const baseYear = now.getFullYear();
  const baseMonth = now.getMonth();
  for (let i = 11; i >= 0; i--) {
    const from = new Date(baseYear, baseMonth - i, 1, 0, 0, 0, 0);
    const to = new Date(baseYear, baseMonth - i + 1, 1, 0, 0, 0, 0);
    buckets.push({
      from,
      to,
      label: `${MONTH_LABELS_IT[from.getMonth()].slice(0, 3)} ${String(from.getFullYear()).slice(2)}`,
    });
  }
  return buckets;
}

/**
 * Calcola il delta percentuale fra valore corrente e precedente.
 * Restituisce null se il precedente è 0 (evita divisione per zero,
 * il consumer mostra "—" o "N/A").
 */
export function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
