/**
 * Schema standard per dati estratti via OCR.
 * Indipendente dal provider (Mindee oggi, Azure/Google/altri in futuro).
 */

export type OcrDocumentKind = 'INVOICE' | 'RECEIPT';

export interface ExtractedField<T> {
  value: T | null;
  /** Confidenza 0..1, null se non disponibile. */
  confidence: number | null;
}

export interface ExtractedLineItem {
  description: string | null;
  quantity: number | null;
  unitPriceCents: number | null;
  totalCents: number | null;
  vatRate: number | null;
}

export interface ExtractedDocument {
  supplierName: ExtractedField<string>;
  supplierVat: ExtractedField<string>;
  docNumber: ExtractedField<string>;
  docDate: ExtractedField<string>; // ISO date string YYYY-MM-DD
  dueDate: ExtractedField<string>;
  currency: ExtractedField<string>;
  subtotalCents: ExtractedField<number>;
  vatCents: ExtractedField<number>;
  totalCents: ExtractedField<number>;
  iban: ExtractedField<string>;
  lineItems: ExtractedLineItem[];
  /** Confidenza media dei campi principali. */
  overallConfidence: number | null;
  /** Provider che ha generato l'estrazione. */
  provider: 'mindee' | 'mock';
  /** JSON raw del provider (utile per debug e ri-parsing futuri). */
  raw: unknown;
}

export interface OcrResult {
  extracted: ExtractedDocument;
  raw: unknown;
}
