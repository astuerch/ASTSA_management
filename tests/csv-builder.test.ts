import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/accounting/config', () => ({
  getAccountForWorkType: vi.fn().mockResolvedValue('3200'),
  getCostCenterForWorkType: vi.fn().mockResolvedValue('EXTRA'),
  getVatCodeForVatRate: vi.fn().mockResolvedValue('IP81'),
}));

import { buildPrimaNotaCSV } from '@/lib/sage/csv-builder';
import type { CsvInvoice } from '@/lib/sage/csv-builder';

const sampleInvoice: CsvInvoice = {
  number: 'BZ-2026-0001',
  documentDate: new Date('2026-04-15'),
  client: { sageCustomerNumber: '1383' },
  subject: 'Tinteggio appartamento Via Roma 2',
  totalCents: 8500,
  subtotalCents: 7863,
  vatTotalCents: 637,
  vatCode: 'STANDARD',
  workType: 'EXTRA',
  lines: [
    {
      description: 'Ore lavoro',
      quantity: 1,
      unit: 'h',
      totalAmountCents: 8500,
      discountCents: 0,
    },
  ],
};

const invoiceWithDiscount: CsvInvoice = {
  number: 'BZ-2026-0002',
  documentDate: new Date('2026-04-20'),
  client: { sageCustomerNumber: '1383' },
  subject: 'Libris – sgombero con sconto',
  totalCents: 8500,
  subtotalCents: 7863,
  vatTotalCents: 637,
  vatCode: 'STANDARD',
  workType: 'EXTRA',
  lines: [
    {
      description: 'Sgombero',
      quantity: 1,
      unit: 'Forfait',
      totalAmountCents: 9000,
      discountCents: 500,
    },
  ],
};

const invoiceSpecialChars: CsvInvoice = {
  number: 'BZ-2026-0003',
  documentDate: new Date('2026-04-22'),
  client: { sageCustomerNumber: '1384' },
  subject: 'Lavori; speciali "con apici"',
  totalCents: 5000,
  subtotalCents: 4630,
  vatTotalCents: 370,
  vatCode: 'STANDARD',
  workType: 'REGIA',
  lines: [
    {
      description: 'Servizio con; virgola e "apici"',
      quantity: 1,
      unit: 'h',
      totalAmountCents: 5000,
      discountCents: 0,
    },
  ],
};

describe('buildPrimaNotaCSV', () => {
  it('starts with UTF-8 BOM', async () => {
    const csv = await buildPrimaNotaCSV([sampleInvoice]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('uses semicolon as separator', async () => {
    const csv = await buildPrimaNotaCSV([sampleInvoice]);
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
    const headerCols = lines[0].split(';');
    expect(headerCols).toHaveLength(14);
  });

  it('has correct header columns', async () => {
    const csv = await buildPrimaNotaCSV([sampleInvoice]);
    const header = csv.replace(/^\uFEFF/, '').split('\r\n')[0];
    expect(header).toBe(
      'Data;NumeroDocumento;ContoDare;ContoAvere;ImportoLordo;CodiceIVA;Testo;CentroCosto;NumeroCliente;PdfAllegato;Valuta;Imponibile;ImportoIVA;RigheDettaglio',
    );
  });

  it('formats date as DD.MM.YYYY', async () => {
    const csv = await buildPrimaNotaCSV([sampleInvoice]);
    const dataRow = csv.replace(/^\uFEFF/, '').split('\r\n')[1];
    expect(dataRow.startsWith('15.04.2026;')).toBe(true);
  });

  it('uses dot as decimal separator', async () => {
    const csv = await buildPrimaNotaCSV([sampleInvoice]);
    const dataRow = csv.replace(/^\uFEFF/, '').split('\r\n')[1];
    expect(dataRow).toContain('85.00');
  });

  it('includes invoice number', async () => {
    const csv = await buildPrimaNotaCSV([sampleInvoice]);
    expect(csv).toContain('BZ-2026-0001');
  });

  it('includes customer number', async () => {
    const csv = await buildPrimaNotaCSV([sampleInvoice]);
    expect(csv).toContain('1383');
  });

  it('uses CHF as currency', async () => {
    const csv = await buildPrimaNotaCSV([sampleInvoice]);
    expect(csv).toContain(';CHF;');
  });

  it('includes pdf attachment path', async () => {
    const csv = await buildPrimaNotaCSV([sampleInvoice]);
    expect(csv).toContain('pdf/BZ-2026-0001.pdf');
  });

  it('escapes fields with semicolons', async () => {
    const csv = await buildPrimaNotaCSV([invoiceSpecialChars]);
    expect(csv).toContain('"Lavori; speciali ""con apici"""');
  });

  it('escapes fields with double quotes', async () => {
    const csv = await buildPrimaNotaCSV([invoiceSpecialChars]);
    expect(csv).toContain('""con apici""');
  });

  it('generates one data row per invoice', async () => {
    const csv = await buildPrimaNotaCSV([sampleInvoice, invoiceWithDiscount]);
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n').filter(Boolean);
    expect(lines).toHaveLength(3); // header + 2 data rows
  });

  it('includes discount in detail text', async () => {
    const csv = await buildPrimaNotaCSV([invoiceWithDiscount]);
    expect(csv).toContain('sconto');
  });

  it('uses CRLF line endings', async () => {
    const csv = await buildPrimaNotaCSV([sampleInvoice]);
    expect(csv).toContain('\r\n');
  });

  it('formats subtotal correctly (78.63)', async () => {
    const csv = await buildPrimaNotaCSV([sampleInvoice]);
    expect(csv).toContain('78.63');
  });

  it('formats vat amount correctly (6.37)', async () => {
    const csv = await buildPrimaNotaCSV([sampleInvoice]);
    expect(csv).toContain('6.37');
  });

  it('applies correct account code', async () => {
    const csv = await buildPrimaNotaCSV([sampleInvoice]);
    expect(csv).toContain(';3200;');
  });

  it('applies correct VAT code', async () => {
    const csv = await buildPrimaNotaCSV([sampleInvoice]);
    expect(csv).toContain(';IP81;');
  });
});
