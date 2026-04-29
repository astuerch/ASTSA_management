import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { buildExportZip } from '@/lib/sage/zip-builder';

const sampleCsv = '\uFEFFData;NumeroDocumento\r\n15.04.2026;BZ-2026-0001\r\n';
const fakePdf1 = Buffer.from('%PDF-1.4 fake pdf content for BZ-2026-0001');
const fakePdf2 = Buffer.from('%PDF-1.4 fake pdf content for BZ-2026-0002');

describe('buildExportZip', () => {
  it('returns a Buffer', async () => {
    const result = await buildExportZip({
      batchNumber: 'EXP-2026-0001',
      csvContent: sampleCsv,
      invoices: [{ number: 'BZ-2026-0001', pdfBuffer: fakePdf1 }],
      totalAmountCents: 8500,
    });
    expect(result).toBeInstanceOf(Buffer);
  });

  it('contains registrazioni.csv', async () => {
    const zipBuffer = await buildExportZip({
      batchNumber: 'EXP-2026-0001',
      csvContent: sampleCsv,
      invoices: [{ number: 'BZ-2026-0001', pdfBuffer: fakePdf1 }],
      totalAmountCents: 8500,
    });
    const zip = await JSZip.loadAsync(zipBuffer);
    expect(zip.file('registrazioni.csv')).not.toBeNull();
  });

  it('csv content matches input', async () => {
    const zipBuffer = await buildExportZip({
      batchNumber: 'EXP-2026-0001',
      csvContent: sampleCsv,
      invoices: [{ number: 'BZ-2026-0001', pdfBuffer: fakePdf1 }],
      totalAmountCents: 8500,
    });
    const zip = await JSZip.loadAsync(zipBuffer);
    const content = await zip.file('registrazioni.csv')!.async('string');
    expect(content).toBe(sampleCsv);
  });

  it('contains README.txt', async () => {
    const zipBuffer = await buildExportZip({
      batchNumber: 'EXP-2026-0001',
      csvContent: sampleCsv,
      invoices: [{ number: 'BZ-2026-0001', pdfBuffer: fakePdf1 }],
      totalAmountCents: 8500,
    });
    const zip = await JSZip.loadAsync(zipBuffer);
    expect(zip.file('README.txt')).not.toBeNull();
  });

  it('README includes batch number', async () => {
    const zipBuffer = await buildExportZip({
      batchNumber: 'EXP-2026-0001',
      csvContent: sampleCsv,
      invoices: [{ number: 'BZ-2026-0001', pdfBuffer: fakePdf1 }],
      totalAmountCents: 8500,
    });
    const zip = await JSZip.loadAsync(zipBuffer);
    const readme = await zip.file('README.txt')!.async('string');
    expect(readme).toContain('EXP-2026-0001');
  });

  it('README includes total amount', async () => {
    const zipBuffer = await buildExportZip({
      batchNumber: 'EXP-2026-0001',
      csvContent: sampleCsv,
      invoices: [{ number: 'BZ-2026-0001', pdfBuffer: fakePdf1 }],
      totalAmountCents: 8500,
    });
    const zip = await JSZip.loadAsync(zipBuffer);
    const readme = await zip.file('README.txt')!.async('string');
    expect(readme).toContain('85.00');
  });

  it('contains mapping-info.txt', async () => {
    const zipBuffer = await buildExportZip({
      batchNumber: 'EXP-2026-0001',
      csvContent: sampleCsv,
      invoices: [{ number: 'BZ-2026-0001', pdfBuffer: fakePdf1 }],
      totalAmountCents: 8500,
    });
    const zip = await JSZip.loadAsync(zipBuffer);
    expect(zip.file('mapping-info.txt')).not.toBeNull();
  });

  it('contains pdf folder with correct number of PDFs', async () => {
    const zipBuffer = await buildExportZip({
      batchNumber: 'EXP-2026-0001',
      csvContent: sampleCsv,
      invoices: [
        { number: 'BZ-2026-0001', pdfBuffer: fakePdf1 },
        { number: 'BZ-2026-0002', pdfBuffer: fakePdf2 },
      ],
      totalAmountCents: 17000,
    });
    const zip = await JSZip.loadAsync(zipBuffer);
    const pdfFiles = Object.keys(zip.files).filter((f) => f.startsWith('pdf/') && !f.endsWith('/'));
    expect(pdfFiles).toHaveLength(2);
  });

  it('PDF files are named correctly', async () => {
    const zipBuffer = await buildExportZip({
      batchNumber: 'EXP-2026-0001',
      csvContent: sampleCsv,
      invoices: [{ number: 'BZ-2026-0001', pdfBuffer: fakePdf1 }],
      totalAmountCents: 8500,
    });
    const zip = await JSZip.loadAsync(zipBuffer);
    expect(zip.file('pdf/BZ-2026-0001.pdf')).not.toBeNull();
  });

  it('PDF content matches input', async () => {
    const zipBuffer = await buildExportZip({
      batchNumber: 'EXP-2026-0001',
      csvContent: sampleCsv,
      invoices: [{ number: 'BZ-2026-0001', pdfBuffer: fakePdf1 }],
      totalAmountCents: 8500,
    });
    const zip = await JSZip.loadAsync(zipBuffer);
    const pdfContent = await zip.file('pdf/BZ-2026-0001.pdf')!.async('nodebuffer');
    expect(Buffer.from(pdfContent)).toEqual(fakePdf1);
  });

  it('README count matches number of invoices', async () => {
    const zipBuffer = await buildExportZip({
      batchNumber: 'EXP-2026-0001',
      csvContent: sampleCsv,
      invoices: [
        { number: 'BZ-2026-0001', pdfBuffer: fakePdf1 },
        { number: 'BZ-2026-0002', pdfBuffer: fakePdf2 },
      ],
      totalAmountCents: 17000,
    });
    const zip = await JSZip.loadAsync(zipBuffer);
    const readme = await zip.file('README.txt')!.async('string');
    expect(readme).toContain('2');
  });

  it('handles empty invoice list', async () => {
    const zipBuffer = await buildExportZip({
      batchNumber: 'EXP-2026-0001',
      csvContent: sampleCsv,
      invoices: [],
      totalAmountCents: 0,
    });
    const zip = await JSZip.loadAsync(zipBuffer);
    const pdfFiles = Object.keys(zip.files).filter((f) => f.startsWith('pdf/') && !f.endsWith('/'));
    expect(pdfFiles).toHaveLength(0);
  });
});
