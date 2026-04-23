export function formatCents(value: number): string {
  return new Intl.NumberFormat('it-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
  }).format(value / 100);
}

export function parseCentsFromInput(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) {
    throw new Error('Valore non valido');
  }
  return Math.round(parsed * 100);
}
