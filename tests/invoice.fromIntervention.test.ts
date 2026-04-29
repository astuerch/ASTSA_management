import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => {
  const txNumberingUpsert = vi.fn();
  const invoiceCreate = vi.fn();
  return {
    prisma: {
      intervention: { findUniqueOrThrow: vi.fn() },
      priceListItem: { findUnique: vi.fn() },
      invoiceDraft: { create: invoiceCreate },
      numberingCounter: { upsert: txNumberingUpsert },
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => {
        return fn({
          invoiceDraft: { create: invoiceCreate },
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
import { createInvoiceFromIntervention } from '@/lib/actions/invoices';

const mockInterventionFind = vi.mocked(prisma.intervention.findUniqueOrThrow);
const mockPriceListFind = vi.mocked(prisma.priceListItem.findUnique);
const mockInvoiceCreate = vi.mocked(prisma.invoiceDraft.create);
const mockCounterUpsert = vi.mocked(prisma.numberingCounter.upsert);

const mockIntervention = {
  id: 10,
  isExtra: true,
  status: 'VALIDATO',
  durationMinutes: 120,
  propertyId: 1,
  property: {
    id: 1,
    name: 'Condominio Test',
    clientId: 1,
    client: { businessName: 'Test Cliente' },
  },
  materials: [
    {
      id: 5,
      quantity: 2,
      unitCostCents: 1290,
      notes: null,
      material: { id: 1, name: 'Sale 25kg', unit: 'sacco', unitCostCents: 1290 },
    },
  ],
};

describe('invoice.fromIntervention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCounterUpsert.mockResolvedValue({ id: '1', prefix: 'BZ', year: 2026, current: 1 } as never);
    mockInterventionFind.mockResolvedValue(mockIntervention as never);
    mockPriceListFind.mockResolvedValue({ unitPriceCents: 6500 } as never);
    mockInvoiceCreate.mockResolvedValue({ id: 'inv1', number: 'BZ-2026-0001', lines: [] } as never);
  });

  it('creates invoice with hours line', async () => {
    await createInvoiceFromIntervention(10);
    const call = mockInvoiceCreate.mock.calls[0][0];
    const lines = call.data.lines.create;
    const hoursLine = lines.find((l: { source: string }) => l.source === 'INTERVENTION_HOURS');
    expect(hoursLine).toBeDefined();
    expect(hoursLine.quantity).toBe(2); // 120 min / 60
    expect(hoursLine.unitPriceCents).toBe(6500);
  });

  it('creates invoice with material lines', async () => {
    await createInvoiceFromIntervention(10);
    const call = mockInvoiceCreate.mock.calls[0][0];
    const lines = call.data.lines.create;
    const matLine = lines.find((l: { source: string }) => l.source === 'INTERVENTION_MATERIAL');
    expect(matLine).toBeDefined();
    expect(matLine.description).toBe('Sale 25kg');
  });

  it('applies markup on materials', async () => {
    await createInvoiceFromIntervention(10, { markupPercent: 20 });
    const call = mockInvoiceCreate.mock.calls[0][0];
    const lines = call.data.lines.create;
    const matLine = lines.find((l: { source: string }) => l.source === 'INTERVENTION_MATERIAL');
    // 1290 * 1.20 = 1548 → roundSwiss = 1550
    expect(matLine.unitPriceCents).toBeGreaterThan(1290);
  });

  it('fails for non-extra intervention', async () => {
    mockInterventionFind.mockResolvedValue({ ...mockIntervention, isExtra: false } as never);
    await expect(createInvoiceFromIntervention(10)).rejects.toThrow('Solo interventi extra');
  });

  it('fails for non-billable status', async () => {
    mockInterventionFind.mockResolvedValue({ ...mockIntervention, status: 'COMPLETATO' } as never);
    await expect(createInvoiceFromIntervention(10)).rejects.toThrow('non in stato fatturabile');
  });

  it('connects fromInterventionId on invoice', async () => {
    await createInvoiceFromIntervention(10);
    const call = mockInvoiceCreate.mock.calls[0][0];
    expect(call.data.fromInterventionId).toBe(10);
  });
});
