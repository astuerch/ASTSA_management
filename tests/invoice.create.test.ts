import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => {
  const txNumberingUpsert = vi.fn();
  const invoiceCreate = vi.fn();
  return {
    prisma: {
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
import { createInvoiceDraft } from '@/lib/actions/invoices';

const mockCreate = vi.mocked(prisma.invoiceDraft.create);
const mockCounterUpsert = vi.mocked(prisma.numberingCounter.upsert);

describe('invoice.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCounterUpsert.mockResolvedValue({ id: '1', prefix: 'BZ', year: 2026, current: 1 } as never);
    mockCreate.mockResolvedValue({
      id: 'inv1',
      number: 'BZ-2026-0001',
      client: { businessName: 'Test' },
      lines: [],
    } as never);
  });

  it('creates invoice with BZ prefix', async () => {
    await createInvoiceDraft({
      clientId: 1,
      subject: 'Test',
      dueDate: new Date('2026-06-01'),
      lines: [],
    });
    const call = mockCreate.mock.calls[0][0];
    expect(call.data.number).toMatch(/^BZ-\d{4}-\d{4}$/);
  });

  it('rejects DIPENDENTE role', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: '2', role: 'DIPENDENTE' } } as never);
    await expect(
      createInvoiceDraft({ clientId: 1, subject: 'x', dueDate: new Date(), lines: [] }),
    ).rejects.toThrow('Accesso non autorizzato');
  });

  it('requires subject', async () => {
    await expect(
      createInvoiceDraft({ clientId: 1, subject: '', dueDate: new Date(), lines: [] }),
    ).rejects.toThrow();
  });

  it('calculates subtotal and VAT from lines', async () => {
    await createInvoiceDraft({
      clientId: 1,
      subject: 'Test',
      dueDate: new Date('2026-06-01'),
      lines: [
        { description: 'Ore', quantity: 2, unit: 'h', unitPriceCents: 6500, discountCents: 0, vatCode: 'STANDARD', position: 1 },
      ],
    });
    const call = mockCreate.mock.calls[0][0];
    expect(call.data.subtotalCents).toBe(13000);
    expect(call.data.vatTotalCents).toBeGreaterThan(0);
    expect(call.data.totalCents).toBe(call.data.subtotalCents + call.data.vatTotalCents);
  });
});
