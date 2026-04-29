import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTxInvoiceDraftCreate = vi.fn();
const mockTxQuoteUpdate = vi.fn();

vi.mock('@/lib/prisma', () => {
  const txNumberingUpsert = vi.fn().mockResolvedValue({ id: '1', prefix: 'BZ', year: 2026, current: 1 });
  return {
    prisma: {
      quote: { findUniqueOrThrow: vi.fn() },
      numberingCounter: { upsert: txNumberingUpsert },
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => {
        return fn({
          invoiceDraft: { create: mockTxInvoiceDraftCreate },
          quote: { update: mockTxQuoteUpdate },
          numberingCounter: { upsert: txNumberingUpsert },
        });
      }),
    },
  };
});

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: '1', role: 'AMMINISTRAZIONE' } }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { prisma } from '@/lib/prisma';
import { convertToInvoiceDraft } from '@/lib/actions/quotes';

const mockFindUniqueOrThrow = vi.mocked(prisma.quote.findUniqueOrThrow);
const mockCounterUpsert = vi.mocked(prisma.numberingCounter.upsert);

describe('quote.convertToInvoiceDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCounterUpsert.mockResolvedValue({ id: '1', prefix: 'BZ', year: 2026, current: 1 } as never);
    mockTxInvoiceDraftCreate.mockResolvedValue({ id: 'inv1', number: 'BZ-2026-0001' });
    mockTxQuoteUpdate.mockResolvedValue({});
  });

  it('converts ACCETTATO quote to invoice draft', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      id: 'q1',
      status: 'ACCETTATO',
      convertedToInvoiceId: null,
      clientId: 1,
      propertyId: null,
      subject: 'Test',
      notes: null,
      locale: 'it',
      subtotalCents: 10000,
      vatTotalCents: 810,
      totalCents: 10810,
      lines: [
        {
          id: 'l1',
          position: 1,
          description: 'Voce',
          quantity: 1,
          unit: 'h',
          unitPriceCents: 10000,
          discountCents: 0,
          vatCode: 'STANDARD',
          netAmountCents: 10000,
          vatAmountCents: 810,
          totalAmountCents: 10810,
        },
      ],
    } as never);

    const result = await convertToInvoiceDraft('q1');
    expect(result.number).toBe('BZ-2026-0001');
    expect(mockTxInvoiceDraftCreate).toHaveBeenCalled();
    const invoiceData = mockTxInvoiceDraftCreate.mock.calls[0][0].data;
    expect(invoiceData.number).toMatch(/^BZ-\d{4}-\d{4}$/);
    expect(invoiceData.fromQuoteId).toBe('q1');
  });

  it('fails for non-ACCETTATO quote', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: 'q1', status: 'BOZZA', lines: [] } as never);
    await expect(convertToInvoiceDraft('q1')).rejects.toThrow('Solo i preventivi accettati');
  });

  it('fails if already converted', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      id: 'q1',
      status: 'ACCETTATO',
      convertedToInvoiceId: 'inv-existing',
      lines: [],
    } as never);
    await expect(convertToInvoiceDraft('q1')).rejects.toThrow('già trasformato');
  });
});
