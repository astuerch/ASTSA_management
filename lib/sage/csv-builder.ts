import { getAccountForWorkType, getCostCenterForWorkType, getVatCodeForVatRate } from '@/lib/accounting/config';

export interface CsvInvoice {
  number: string;
  documentDate: Date;
  client: { sageCustomerNumber: string | null };
  subject: string;
  totalCents: number;
  subtotalCents: number;
  vatTotalCents: number;
  vatCode: string;
  workType?: string;
  lines: Array<{
    description: string;
    quantity: number;
    unit: string;
    totalAmountCents: number;
    discountCents: number;
  }>;
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

function escapeField(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function buildDetailText(lines: CsvInvoice['lines']): string {
  return lines
    .map((l) => {
      const parts = [l.description, String(l.quantity), l.unit, formatAmount(l.totalAmountCents)];
      if (l.discountCents > 0) {
        parts.push(`sconto|1||${formatAmount(-l.discountCents)}`);
      }
      return parts.join('|');
    })
    .join(';');
}

export async function buildPrimaNotaCSV(invoices: CsvInvoice[]): Promise<string> {
  const header = [
    'Data', 'NumeroDocumento', 'ContoDare', 'ContoAvere', 'ImportoLordo',
    'CodiceIVA', 'Testo', 'CentroCosto', 'NumeroCliente', 'PdfAllegato',
    'Valuta', 'Imponibile', 'ImportoIVA', 'RigheDettaglio',
  ].join(';');

  const rows = await Promise.all(
    invoices.map(async (inv) => {
      const workType = inv.workType ?? 'EXTRA';
      const contoDare = '1100';
      const contoAvere = await getAccountForWorkType(workType);
      const codiceIVA = await getVatCodeForVatRate(inv.vatCode);
      const centroCosto = await getCostCenterForWorkType(workType);
      const pdfPath = `pdf/${inv.number}.pdf`;
      const dettaglio = buildDetailText(inv.lines);

      const fields = [
        formatDate(inv.documentDate),
        inv.number,
        contoDare,
        contoAvere,
        formatAmount(inv.totalCents),
        codiceIVA,
        inv.subject,
        centroCosto,
        inv.client.sageCustomerNumber ?? '',
        pdfPath,
        'CHF',
        formatAmount(inv.subtotalCents),
        formatAmount(inv.vatTotalCents),
        dettaglio,
      ];

      return fields.map(escapeField).join(';');
    })
  );

  return '\uFEFF' + header + '\r\n' + rows.join('\r\n');
}
