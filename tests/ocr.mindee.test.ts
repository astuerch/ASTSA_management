import { describe, expect, it } from 'vitest';
import { mapMindeePrediction } from '@/lib/ocr/mindee';

// Estratto rappresentativo del payload Mindee Invoice v4.
// I campi confidence sono float 0..1.
const samplePrediction = {
  supplier_name: { value: 'Migros Lugano SA', confidence: 0.94 },
  supplier_company_registrations: [{ value: 'CHE-105.823.541', confidence: 0.78 }],
  invoice_number: { value: 'F-2026-00123', confidence: 0.96 },
  date: { value: '2026-04-12', confidence: 0.99 },
  due_date: { value: '2026-05-12', confidence: 0.71 },
  locale: { currency: 'CHF' },
  total_net: { value: 92.5, confidence: 0.92 },
  total_tax: { value: 7.5, confidence: 0.89 },
  total_amount: { value: 100.0, confidence: 0.95 },
  supplier_payment_details: [{ iban: 'CH9300762011623852957', confidence: 0.83 }],
  line_items: [
    { description: 'Detergente neutro', quantity: 5, unit_price: 12.5, total_amount: 62.5, tax_rate: 8.1 },
    { description: 'Sacchi spazzatura', quantity: 3, unit_price: 10.0, total_amount: 30.0, tax_rate: 8.1 },
  ],
};

describe('mapMindeePrediction', () => {
  it('mappa i campi principali al formato interno', () => {
    const out = mapMindeePrediction(samplePrediction);
    expect(out.supplierName.value).toBe('Migros Lugano SA');
    expect(out.supplierName.confidence).toBe(0.94);
    expect(out.docNumber.value).toBe('F-2026-00123');
    expect(out.docDate.value).toBe('2026-04-12');
    expect(out.currency.value).toBe('CHF');
  });

  it('converte gli importi in centesimi (no float drift)', () => {
    const out = mapMindeePrediction(samplePrediction);
    expect(out.subtotalCents.value).toBe(9250);
    expect(out.vatCents.value).toBe(750);
    expect(out.totalCents.value).toBe(10000);
  });

  it('estrae IBAN e line items', () => {
    const out = mapMindeePrediction(samplePrediction);
    expect(out.iban.value).toBe('CH9300762011623852957');
    expect(out.lineItems).toHaveLength(2);
    expect(out.lineItems[0]).toMatchObject({
      description: 'Detergente neutro',
      quantity: 5,
      unitPriceCents: 1250,
      totalCents: 6250,
      vatRate: 8.1,
    });
  });

  it('calcola una confidenza media sui campi chiave', () => {
    const out = mapMindeePrediction(samplePrediction);
    expect(out.overallConfidence).not.toBeNull();
    expect(out.overallConfidence!).toBeGreaterThan(0.9);
    expect(out.overallConfidence!).toBeLessThanOrEqual(1);
  });

  it('gestisce predizioni vuote senza crash', () => {
    const out = mapMindeePrediction({});
    expect(out.supplierName.value).toBeNull();
    expect(out.totalCents.value).toBeNull();
    expect(out.lineItems).toEqual([]);
    expect(out.overallConfidence).toBeNull();
  });

  it('marca il provider come mindee', () => {
    const out = mapMindeePrediction(samplePrediction);
    expect(out.provider).toBe('mindee');
  });
});
