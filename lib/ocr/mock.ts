import type { ExtractedDocument, OcrDocumentKind, OcrResult } from './types';

/**
 * Parser fittizio usato quando MINDEE_API_KEY non è configurata
 * (sviluppo locale / CI / fallback). Restituisce sempre dati credibili
 * così la UI di validazione è testabile end-to-end.
 */
export function mockExtract(_kind: OcrDocumentKind): OcrResult {
  const extracted: ExtractedDocument = {
    supplierName: { value: 'Fornitore Demo SA', confidence: 0.92 },
    supplierVat: { value: 'CHE-123.456.789 IVA', confidence: 0.81 },
    docNumber: { value: 'F-2026-0042', confidence: 0.95 },
    docDate: { value: '2026-04-25', confidence: 0.97 },
    dueDate: { value: '2026-05-25', confidence: 0.78 },
    currency: { value: 'CHF', confidence: 0.99 },
    subtotalCents: { value: 18500, confidence: 0.91 },
    vatCents: { value: 1499, confidence: 0.88 },
    totalCents: { value: 19999, confidence: 0.94 },
    iban: { value: 'CH9300762011623852957', confidence: 0.83 },
    lineItems: [
      {
        description: 'Materiale di pulizia',
        quantity: 5,
        unitPriceCents: 2500,
        totalCents: 12500,
        vatRate: 8.1,
      },
      {
        description: 'Trasporto',
        quantity: 1,
        unitPriceCents: 6000,
        totalCents: 6000,
        vatRate: 8.1,
      },
    ],
    overallConfidence: 0.9,
    provider: 'mock',
    raw: { provider: 'mock', note: 'Mindee non configurato — dati demo' },
  };

  return { extracted, raw: extracted.raw };
}
