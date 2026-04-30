import { describe, expect, it } from 'vitest';
import {
  deltaPercent,
  getCurrentMonthRange,
  getLast12MonthlyBuckets,
  getPreviousPeriodRange,
} from '@/lib/kpi/period';

describe('getCurrentMonthRange', () => {
  it('inizia il primo del mese a mezzanotte', () => {
    const now = new Date(2026, 3, 15, 14, 30); // 15 aprile 2026 14:30
    const range = getCurrentMonthRange(now);
    expect(range.from.getFullYear()).toBe(2026);
    expect(range.from.getMonth()).toBe(3);
    expect(range.from.getDate()).toBe(1);
    expect(range.from.getHours()).toBe(0);
  });

  it('finisce all\'istante now (non a fine mese)', () => {
    const now = new Date(2026, 3, 15, 14, 30);
    const range = getCurrentMonthRange(now);
    expect(range.to.getTime()).toBe(now.getTime());
  });
});

describe('getPreviousPeriodRange', () => {
  it('su mese parziale prende lo stesso lasso del mese precedente', () => {
    const now = new Date(2026, 3, 15, 12, 0); // 15 aprile
    const current = getCurrentMonthRange(now);
    const previous = getPreviousPeriodRange(current);

    expect(previous.from.getMonth()).toBe(2); // marzo
    expect(previous.from.getDate()).toBe(1);
    expect(previous.to.getMonth()).toBe(2); // marzo
    expect(previous.to.getDate()).toBe(15);
    expect(previous.label).toContain('Marzo');
  });

  it('su mese pieno prende il mese precedente intero', () => {
    // Simula "ora" = ultimo istante di aprile (mese pieno)
    const fullMonthEnd = new Date(2026, 4, 1, 0, 0, 0); // 1 maggio = fine aprile incluso
    const current = {
      from: new Date(2026, 3, 1),
      to: fullMonthEnd,
      label: 'Aprile 2026',
    };
    const previous = getPreviousPeriodRange(current);
    expect(previous.from.getMonth()).toBe(2); // marzo
    expect(previous.to.getMonth()).toBe(3); // 1 aprile
    expect(previous.to.getDate()).toBe(1);
  });

  it('attraversa correttamente il cambio anno', () => {
    const now = new Date(2026, 0, 15); // 15 gennaio 2026
    const current = getCurrentMonthRange(now);
    const previous = getPreviousPeriodRange(current);
    expect(previous.from.getFullYear()).toBe(2025);
    expect(previous.from.getMonth()).toBe(11); // dicembre
  });
});

describe('getLast12MonthlyBuckets', () => {
  it('restituisce esattamente 12 bucket', () => {
    const buckets = getLast12MonthlyBuckets(new Date(2026, 3, 15));
    expect(buckets).toHaveLength(12);
  });

  it('l\'ultimo bucket termina nel mese del now (esclusivo)', () => {
    const buckets = getLast12MonthlyBuckets(new Date(2026, 3, 15));
    const last = buckets[11];
    expect(last.from.getMonth()).toBe(3); // aprile
    expect(last.to.getMonth()).toBe(4); // maggio (esclusivo)
  });

  it('il primo bucket è 11 mesi prima', () => {
    const buckets = getLast12MonthlyBuckets(new Date(2026, 3, 15));
    const first = buckets[0];
    expect(first.from.getFullYear()).toBe(2025);
    expect(first.from.getMonth()).toBe(4); // maggio 2025
  });
});

describe('deltaPercent', () => {
  it('calcola correttamente delta positivi e negativi', () => {
    expect(deltaPercent(150, 100)).toBe(50);
    expect(deltaPercent(80, 100)).toBe(-20);
    expect(deltaPercent(100, 100)).toBe(0);
  });

  it('restituisce null se il precedente è zero', () => {
    expect(deltaPercent(50, 0)).toBeNull();
    expect(deltaPercent(0, 0)).toBeNull();
  });

  it('gestisce il calo a zero', () => {
    expect(deltaPercent(0, 100)).toBe(-100);
  });
});
