import { describe, it, expect } from 'vitest';
import { formatNumber } from '@/lib/numbering';

describe('formatNumber', () => {
  it('formats PR number correctly', () => {
    expect(formatNumber('PR', 2026, 1)).toBe('PR-2026-0001');
  });

  it('formats BZ number correctly', () => {
    expect(formatNumber('BZ', 2026, 42)).toBe('BZ-2026-0042');
  });

  it('pads sequence to 4 digits', () => {
    expect(formatNumber('PR', 2026, 100)).toBe('PR-2026-0100');
  });

  it('supports 4-digit sequences', () => {
    expect(formatNumber('BZ', 2026, 9999)).toBe('BZ-2026-9999');
  });

  it('uses correct year', () => {
    expect(formatNumber('PR', 2025, 3)).toBe('PR-2025-0003');
  });
});
