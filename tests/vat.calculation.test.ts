import { describe, it, expect } from 'vitest';
import { calculateLineAmounts, roundSwiss } from '@/lib/swiss-rounding';

describe('vat.calculation – calcoli IVA svizzera', () => {
  it('8.1% standard: 97.13 CHF + IVA = totale corretto con arrotondamento', () => {
    // net = 9713, vat = round(9713 * 0.081) = round(786.75) = 790 (ceil), round5 = 790
    const result = calculateLineAmounts(1, 9713, 0, 'STANDARD');
    expect(result.netAmountCents).toBe(9715); // roundSwiss(9713) = 9715
    const expectedVat = roundSwiss(Math.round(9715 * 0.081));
    expect(result.vatAmountCents).toBe(expectedVat);
    expect(result.totalAmountCents).toBe(result.netAmountCents + result.vatAmountCents);
  });

  it('8.1%: subtotale 85.00 CHF → IVA 6.90 → totale 91.90', () => {
    const result = calculateLineAmounts(1, 8500, 0, 'STANDARD');
    expect(result.netAmountCents).toBe(8500);
    // 8500 * 0.081 = 688.5 → round = 690 → roundSwiss = 690
    expect(result.vatAmountCents).toBe(690);
    expect(result.totalAmountCents).toBe(9190);
  });

  it('2.6% ridotta: calcolo corretto', () => {
    const result = calculateLineAmounts(1, 10000, 0, 'RIDOTTA');
    expect(result.netAmountCents).toBe(10000);
    // 10000 * 0.026 = 260 → roundSwiss = 260
    expect(result.vatAmountCents).toBe(260);
    expect(result.totalAmountCents).toBe(10260);
  });

  it('3.8% alloggio: calcolo corretto', () => {
    const result = calculateLineAmounts(2, 5000, 0, 'ALLOGGIO');
    expect(result.netAmountCents).toBe(10000);
    // 10000 * 0.038 = 380 → roundSwiss = 380
    expect(result.vatAmountCents).toBe(380);
    expect(result.totalAmountCents).toBe(10380);
  });

  it('esente 0%: nessuna IVA', () => {
    const result = calculateLineAmounts(10, 500, 0, 'ESENTE');
    expect(result.vatAmountCents).toBe(0);
    expect(result.netAmountCents).toBe(5000);
    expect(result.totalAmountCents).toBe(5000);
  });

  it('sconto come voce negativa: riduce imponibile', () => {
    // 100 CHF - 18.50 sconto = 81.50 netto
    const result = calculateLineAmounts(1, 10000, 1850, 'STANDARD');
    expect(result.netAmountCents).toBe(8150);
    expect(result.vatAmountCents).toBe(roundSwiss(Math.round(8150 * 0.081)));
  });
});
