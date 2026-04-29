import { describe, it, expect } from 'vitest';
import { roundSwiss, getVatRate, calculateLineAmounts } from '@/lib/swiss-rounding';

describe('roundSwiss', () => {
  it('rounds to nearest 5 centimes', () => {
    expect(roundSwiss(9713)).toBe(9715);  // 97.13 → 97.15
    expect(roundSwiss(9712)).toBe(9710);  // 97.12 → 97.10
    expect(roundSwiss(9715)).toBe(9715);  // already on boundary
    expect(roundSwiss(9717)).toBe(9715);  // 97.17 → 97.15
    expect(roundSwiss(9718)).toBe(9720);  // 97.18 → 97.20
  });

  it('handles 78.643 → 78.65', () => {
    expect(roundSwiss(7864)).toBe(7865);  // 78.64 → 78.65
  });

  it('handles zero', () => {
    expect(roundSwiss(0)).toBe(0);
  });

  it('handles negative amounts (discounts)', () => {
    expect(roundSwiss(-1850)).toBe(-1850);  // exact
    expect(roundSwiss(-1853)).toBe(-1855);
  });
});

describe('getVatRate', () => {
  it('returns 8.1% for STANDARD', () => {
    expect(getVatRate('STANDARD')).toBe(0.081);
  });

  it('returns 2.6% for RIDOTTA', () => {
    expect(getVatRate('RIDOTTA')).toBe(0.026);
  });

  it('returns 3.8% for ALLOGGIO', () => {
    expect(getVatRate('ALLOGGIO')).toBe(0.038);
  });

  it('returns 0 for ESENTE', () => {
    expect(getVatRate('ESENTE')).toBe(0);
  });
});

describe('calculateLineAmounts', () => {
  it('calculates correctly for standard VAT 8.1%', () => {
    // 10 hours × 65.00/h = 650.00 net, VAT 8.1% = 52.65, total = 702.65
    const result = calculateLineAmounts(10, 6500, 0, 'STANDARD');
    expect(result.netAmountCents).toBe(65000);
    expect(result.vatAmountCents).toBe(5265);  // 65000 * 0.081 = 5265, round to 5: 5265
    expect(result.totalAmountCents).toBe(70265);
  });

  it('applies discount before VAT', () => {
    // 100 CHF gross - 18.50 discount = 81.50 net, VAT 8.1% of 81.50 = 6.60
    const result = calculateLineAmounts(1, 10000, 1850, 'STANDARD');
    expect(result.netAmountCents).toBe(8150);
    const expectedVat = roundSwiss(Math.round(8150 * 0.081));
    expect(result.vatAmountCents).toBe(expectedVat);
  });

  it('calculates zero VAT for ESENTE', () => {
    const result = calculateLineAmounts(5, 1000, 0, 'ESENTE');
    expect(result.netAmountCents).toBe(5000);
    expect(result.vatAmountCents).toBe(0);
    expect(result.totalAmountCents).toBe(5000);
  });

  it('handles fractional quantity', () => {
    // 2.5 hours × 65.00 = 162.50 CHF
    const result = calculateLineAmounts(2.5, 6500, 0, 'STANDARD');
    expect(result.netAmountCents).toBe(16250);
  });
});
