import { describe, it, expect } from 'vitest';
import { formatNumber } from '@/lib/numbering';

describe('formatNumber – EXP prefix', () => {
  it('formats EXP number correctly', () => {
    expect(formatNumber('EXP', 2026, 1)).toBe('EXP-2026-0001');
  });

  it('pads EXP sequence to 4 digits', () => {
    expect(formatNumber('EXP', 2026, 42)).toBe('EXP-2026-0042');
  });

  it('formats large EXP sequence', () => {
    expect(formatNumber('EXP', 2026, 9999)).toBe('EXP-2026-9999');
  });

  it('uses correct year for EXP', () => {
    expect(formatNumber('EXP', 2025, 3)).toBe('EXP-2025-0003');
  });

  it('still formats PR correctly', () => {
    expect(formatNumber('PR', 2026, 1)).toBe('PR-2026-0001');
  });

  it('still formats BZ correctly', () => {
    expect(formatNumber('BZ', 2026, 42)).toBe('BZ-2026-0042');
  });
});
