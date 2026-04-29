import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => {
  const sageExportCreate = vi.fn();
  const sageExportFindUnique = vi.fn();
  const sageExportUpdate = vi.fn();
  const invoiceUpdateMany = vi.fn();

  return {
    prisma: {
      invoiceDraft: {
        findMany: vi.fn(),
        updateMany: invoiceUpdateMany,
      },
      sageExport: {
        create: sageExportCreate,
        findUniqueOrThrow: sageExportFindUnique,
        update: sageExportUpdate,
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
        fn({
          sageExport: { create: sageExportCreate, update: sageExportUpdate },
          invoiceDraft: { updateMany: invoiceUpdateMany },
          numberingCounter: { upsert: vi.fn() },
        }),
      ),
    },
  };
});

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: '1', role: 'AMMINISTRAZIONE' } }),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/lib/numbering', () => ({
  getNextNumber: vi.fn().mockResolvedValue(1),
  formatNumber: vi.fn().mockReturnValue('EXP-2026-0001'),
}));

vi.mock('@/lib/sage/csv-builder', () => ({
  buildPrimaNotaCSV: vi.fn().mockResolvedValue('\uFEFFData;NumeroDocumento\r\n'),
}));

vi.mock('@/lib/sage/zip-builder', () => ({
  buildExportZip: vi.fn().mockResolvedValue(Buffer.from('fake-zip')),
}));

vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 fake')),
}));

vi.mock('@/lib/pdf/InvoiceDraftPdf', () => ({
  InvoiceDraftPdf: vi.fn(),
}));

vi.mock('@/lib/cloudinary', () => ({
  uploadBuffer: vi.fn().mockResolvedValue({ url: 'https://mock.url/file.zip', publicId: 'mock/file' }),
}));

import { prisma } from '@/lib/prisma';
import { generateExport, confirmSageImport, cancelExport } from '@/lib/actions/sageExport';
import { InvoiceDraftStatus, SageExportStatus } from '@prisma/client';

const mockFindMany = vi.mocked(prisma.invoiceDraft.findMany);
const mockSageCreate = vi.mocked(prisma.sageExport.create);
const mockSageFindUnique = vi.mocked(prisma.sageExport.findUniqueOrThrow);
const mockInvoiceUpdateMany = vi.mocked(prisma.invoiceDraft.updateMany);

const readyInvoice = {
  id: 'inv1',
  number: 'BZ-2026-0002',
  subject: 'Test',
  documentDate: new Date('2026-04-15'),
  dueDate: new Date('2026-05-15'),
  sequence: 2,
  notes: null,
  clientId: 1,
  locale: 'it',
  status: InvoiceDraftStatus.PRONTO_EXPORT,
  exportedBatchId: null,
  subtotalCents: 7863,
  vatTotalCents: 637,
  totalCents: 8500,
  client: { businessName: 'Libris', sageCustomerNumber: '1383', address: 'Via Roma 1' },
  lines: [
    {
      position: 1,
      description: 'Ore lavoro',
      quantity: 1,
      unit: 'h',
      unitPriceCents: 8500,
      discountCents: 0,
      vatCode: 'STANDARD',
      netAmountCents: 7863,
      vatAmountCents: 637,
      totalAmountCents: 8500,
    },
  ],
};

describe('generateExport pre-checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSageCreate.mockResolvedValue({ id: 'batch1', batchNumber: 'EXP-2026-0001' } as never);
    mockInvoiceUpdateMany.mockResolvedValue({ count: 1 } as never);
  });

  it('throws if invoiceIds is empty', async () => {
    await expect(generateExport([])).rejects.toThrow('Seleziona almeno una fattura');
  });

  it('throws if invoice not found', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await expect(generateExport(['inv1'])).rejects.toThrow('Alcune fatture non trovate');
  });

  it('throws if invoice not in PRONTO_EXPORT status', async () => {
    mockFindMany.mockResolvedValueOnce([
      { ...readyInvoice, status: InvoiceDraftStatus.BOZZA } as never,
    ]);
    await expect(generateExport(['inv1'])).rejects.toThrow('PRONTO_EXPORT');
  });

  it('throws if client has no sage customer number', async () => {
    mockFindMany.mockResolvedValueOnce([
      { ...readyInvoice, client: { ...readyInvoice.client, sageCustomerNumber: null } } as never,
    ]);
    await expect(generateExport(['inv1'])).rejects.toThrow('numero cliente Sage');
  });

  it('throws if invoice already exported', async () => {
    mockFindMany.mockResolvedValueOnce([
      { ...readyInvoice, exportedBatchId: 'batch-old' } as never,
    ]);
    await expect(generateExport(['inv1'])).rejects.toThrow('gia esportate');
  });

  it('creates SageExport record on success', async () => {
    mockFindMany.mockResolvedValueOnce([readyInvoice as never]);
    await generateExport(['inv1']);
    expect(mockSageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ batchNumber: 'EXP-2026-0001' }),
      }),
    );
  });

  it('updates invoices to ESPORTATO status', async () => {
    mockFindMany.mockResolvedValueOnce([readyInvoice as never]);
    await generateExport(['inv1']);
    expect(mockInvoiceUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: InvoiceDraftStatus.ESPORTATO }),
      }),
    );
  });
});

describe('confirmSageImport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws if batch not in GENERATED status', async () => {
    mockSageFindUnique.mockResolvedValueOnce({
      id: 'batch1',
      status: SageExportStatus.CONFIRMED_IMPORT,
    } as never);
    await expect(confirmSageImport('batch1')).rejects.toThrow('GENERATED');
  });

  it('updates batch to CONFIRMED_IMPORT', async () => {
    mockSageFindUnique.mockResolvedValueOnce({
      id: 'batch1',
      status: SageExportStatus.GENERATED,
    } as never);
    const mockUpdate = vi.mocked(prisma.sageExport.update);
    mockUpdate.mockResolvedValueOnce({} as never);
    mockInvoiceUpdateMany.mockResolvedValueOnce({ count: 1 } as never);
    await confirmSageImport('batch1');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: SageExportStatus.CONFIRMED_IMPORT }),
      }),
    );
  });

  it('updates invoices to REGISTRATO_SAGE', async () => {
    mockSageFindUnique.mockResolvedValueOnce({
      id: 'batch1',
      status: SageExportStatus.GENERATED,
    } as never);
    vi.mocked(prisma.sageExport.update).mockResolvedValueOnce({} as never);
    mockInvoiceUpdateMany.mockResolvedValueOnce({ count: 1 } as never);
    await confirmSageImport('batch1');
    expect(mockInvoiceUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: InvoiceDraftStatus.REGISTRATO_SAGE }),
      }),
    );
  });
});

describe('cancelExport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws if batch not in GENERATED status', async () => {
    mockSageFindUnique.mockResolvedValueOnce({
      id: 'batch1',
      status: SageExportStatus.CANCELLED,
    } as never);
    await expect(cancelExport('batch1')).rejects.toThrow('GENERATED');
  });

  it('updates batch to CANCELLED', async () => {
    mockSageFindUnique.mockResolvedValueOnce({
      id: 'batch1',
      status: SageExportStatus.GENERATED,
    } as never);
    const mockUpdate = vi.mocked(prisma.sageExport.update);
    mockUpdate.mockResolvedValueOnce({} as never);
    mockInvoiceUpdateMany.mockResolvedValueOnce({ count: 1 } as never);
    await cancelExport('batch1', 'Errore test');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: SageExportStatus.CANCELLED }),
      }),
    );
  });

  it('reverts invoices to PRONTO_EXPORT', async () => {
    mockSageFindUnique.mockResolvedValueOnce({
      id: 'batch1',
      status: SageExportStatus.GENERATED,
    } as never);
    vi.mocked(prisma.sageExport.update).mockResolvedValueOnce({} as never);
    mockInvoiceUpdateMany.mockResolvedValueOnce({ count: 1 } as never);
    await cancelExport('batch1');
    expect(mockInvoiceUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: InvoiceDraftStatus.PRONTO_EXPORT }),
      }),
    );
  });
});
