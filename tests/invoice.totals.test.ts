import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    invoiceLine: { findMany: vi.fn() },
    invoiceDraft: { update: vi.fn() },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: '1', role: 'AMMINISTRAZIONE' } }),
}));

import { prisma } from '@/lib/prisma';
import { recalculateTotals } from '@/lib/actions/invoices';

describe('invoice.totals', () => {
  const mockLinesFindMany = vi.mocked(prisma.invoiceLine.findMany);
  const mockInvoiceUpdate = vi.mocked(prisma.invoiceDraft.update);

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoiceUpdate.mockResolvedValue({} as never);
  });

  it('sums net and vat amounts from lines', async () => {
    mockLinesFindMany.mockResolvedValue([
      { netAmountCents: 10000, vatAmountCents: 810 },
      { netAmountCents: 5000, vatAmountCents: 405 },
    ] as never);

    await recalculateTotals('inv1');

    expect(mockInvoiceUpdate).toHaveBeenCalledWith({
      where: { id: 'inv1' },
      data: {
        subtotalCents: 15000,
        vatTotalCents: 1215,
        totalCents: 16215,
      },
    });
  });

  it('handles zero lines (empty invoice)', async () => {
    mockLinesFindMany.mockResolvedValue([] as never);
    await recalculateTotals('inv1');
    expect(mockInvoiceUpdate).toHaveBeenCalledWith({
      where: { id: 'inv1' },
      data: { subtotalCents: 0, vatTotalCents: 0, totalCents: 0 },
    });
  });
});
