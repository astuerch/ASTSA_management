import type {
  ExtractedDocument,
  ExtractedField,
  ExtractedLineItem,
  OcrDocumentKind,
  OcrResult,
} from './types';

const MINDEE_INVOICE_URL =
  'https://api.mindee.net/v1/products/mindee/invoices/v4/predict';
const MINDEE_RECEIPT_URL =
  'https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict';

interface MindeeRawField {
  value?: string | number | null;
  confidence?: number;
}

interface MindeeAmountField extends MindeeRawField {
  value?: number | null;
}

interface MindeeLineItem {
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_amount?: number | null;
  tax_rate?: number | null;
  confidence?: number;
}

interface MindeePrediction {
  supplier_name?: MindeeRawField;
  supplier_company_registrations?: Array<{ value?: string; confidence?: number }>;
  invoice_number?: MindeeRawField;
  receipt_number?: MindeeRawField;
  date?: MindeeRawField;
  due_date?: MindeeRawField;
  locale?: { currency?: string };
  total_net?: MindeeAmountField;
  total_tax?: MindeeAmountField;
  total_amount?: MindeeAmountField;
  supplier_payment_details?: Array<{ iban?: string; confidence?: number }>;
  line_items?: MindeeLineItem[];
  taxes?: Array<{ rate?: number; value?: number; confidence?: number }>;
}

interface MindeeApiResponse {
  document?: {
    inference?: {
      prediction?: MindeePrediction;
    };
  };
}

function isConfigured(): boolean {
  return !!process.env.MINDEE_API_KEY;
}

function urlFor(kind: OcrDocumentKind): string {
  return kind === 'RECEIPT' ? MINDEE_RECEIPT_URL : MINDEE_INVOICE_URL;
}

function field<T>(value: T | null | undefined, confidence: number | undefined): ExtractedField<T> {
  return {
    value: value === undefined || value === null ? null : value,
    confidence: confidence === undefined ? null : confidence,
  };
}

function toCents(amount: number | null | undefined): number | null {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return null;
  return Math.round(amount * 100);
}

/**
 * Mappa la prediction grezza di Mindee al nostro schema interno.
 * Esportata per essere testabile con JSON di esempio.
 */
export function mapMindeePrediction(prediction: MindeePrediction): ExtractedDocument {
  const supplierName = field(prediction.supplier_name?.value as string | undefined, prediction.supplier_name?.confidence);
  const supplierRegistration = prediction.supplier_company_registrations?.[0];
  const supplierVat = field(supplierRegistration?.value, supplierRegistration?.confidence);

  const docNumberField = prediction.invoice_number ?? prediction.receipt_number;
  const docNumber = field(docNumberField?.value as string | undefined, docNumberField?.confidence);

  const docDate = field(prediction.date?.value as string | undefined, prediction.date?.confidence);
  const dueDate = field(prediction.due_date?.value as string | undefined, prediction.due_date?.confidence);
  const currency = field(prediction.locale?.currency, undefined);

  const subtotalCents = field(toCents(prediction.total_net?.value ?? null), prediction.total_net?.confidence);
  const vatCents = field(toCents(prediction.total_tax?.value ?? null), prediction.total_tax?.confidence);
  const totalCents = field(toCents(prediction.total_amount?.value ?? null), prediction.total_amount?.confidence);

  const ibanRaw = prediction.supplier_payment_details?.[0];
  const iban = field(ibanRaw?.iban, ibanRaw?.confidence);

  const lineItems: ExtractedLineItem[] = (prediction.line_items ?? []).map((li) => ({
    description: li.description ?? null,
    quantity: li.quantity ?? null,
    unitPriceCents: toCents(li.unit_price ?? null),
    totalCents: toCents(li.total_amount ?? null),
    vatRate: li.tax_rate ?? null,
  }));

  // Confidenza media calcolata sui campi-chiave realmente popolati
  const confidences = [
    supplierName.confidence,
    docNumber.confidence,
    docDate.confidence,
    totalCents.confidence,
  ].filter((c): c is number => typeof c === 'number');
  const overallConfidence =
    confidences.length === 0
      ? null
      : confidences.reduce((a, b) => a + b, 0) / confidences.length;

  return {
    supplierName,
    supplierVat,
    docNumber,
    docDate,
    dueDate,
    currency,
    subtotalCents,
    vatCents,
    totalCents,
    iban,
    lineItems,
    overallConfidence,
    provider: 'mindee',
    raw: prediction,
  };
}

/**
 * Chiama Mindee API e restituisce l'estrazione mappata al nostro schema.
 * Throws solo per errori network/HTTP — il fallback mock lo gestisce il provider.
 */
export async function mindeeExtract(
  buffer: Buffer,
  filename: string,
  kind: OcrDocumentKind,
): Promise<OcrResult> {
  if (!isConfigured()) {
    throw new Error('MINDEE_API_KEY non configurata');
  }

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(buffer)]);
  formData.append('document', blob, filename);

  const res = await fetch(urlFor(kind), {
    method: 'POST',
    headers: {
      Authorization: `Token ${process.env.MINDEE_API_KEY}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Mindee API error ${res.status}: ${txt.slice(0, 200)}`);
  }

  const json = (await res.json()) as MindeeApiResponse;
  const prediction = json.document?.inference?.prediction;
  if (!prediction) {
    throw new Error('Risposta Mindee senza prediction');
  }

  const extracted = mapMindeePrediction(prediction);
  return { extracted: { ...extracted, raw: json }, raw: json };
}

export function isMindeeConfigured(): boolean {
  return isConfigured();
}
