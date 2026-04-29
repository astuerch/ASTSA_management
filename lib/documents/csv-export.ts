/**
 * CSV export documenti in entrata.
 * Coerente con il formato Phase 4b (UTF-8 BOM, separatore `;`, EOL CRLF)
 * così l'amministrazione può aprirlo senza setup in Excel/Numbers.
 */

export interface CsvIncomingDocumentRow {
  id: string;
  type: string;
  status: string;
  docDate: Date | null;
  dueDate: Date | null;
  supplierName: string | null;
  supplierVat: string | null;
  docNumber: string | null;
  currency: string | null;
  subtotalCents: number | null;
  vatCents: number | null;
  totalCents: number | null;
  iban: string | null;
  category: string | null;
  client: { businessName: string } | null;
  property: { name: string } | null;
  interventionId: number | null;
  fileUrl: string;
  notes: string | null;
}

function formatDate(d: Date | null): string {
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatAmount(cents: number | null): string {
  if (cents == null) return '';
  return (cents / 100).toFixed(2);
}

function escapeField(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

const HEADERS = [
  'ID',
  'Tipo',
  'Stato',
  'DataDocumento',
  'Scadenza',
  'Fornitore',
  'PartitaIVA',
  'NumeroDocumento',
  'Valuta',
  'Imponibile',
  'IVA',
  'Totale',
  'IBAN',
  'Categoria',
  'Cliente',
  'Stabile',
  'InterventoCollegato',
  'FileUrl',
  'Note',
];

export function buildIncomingDocumentsCsv(rows: CsvIncomingDocumentRow[]): string {
  const header = HEADERS.join(';');

  const dataRows = rows.map((r) => {
    const fields = [
      r.id,
      r.type,
      r.status,
      formatDate(r.docDate),
      formatDate(r.dueDate),
      r.supplierName ?? '',
      r.supplierVat ?? '',
      r.docNumber ?? '',
      r.currency ?? '',
      formatAmount(r.subtotalCents),
      formatAmount(r.vatCents),
      formatAmount(r.totalCents),
      r.iban ?? '',
      r.category ?? '',
      r.client?.businessName ?? '',
      r.property?.name ?? '',
      r.interventionId != null ? String(r.interventionId) : '',
      r.fileUrl,
      r.notes ?? '',
    ];
    return fields.map((f) => escapeField(String(f))).join(';');
  });

  return '﻿' + header + '\r\n' + dataRows.join('\r\n');
}
