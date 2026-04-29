import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => {
  const txNumberingUpsert = vi.fn();
  const quoteCreate = vi.fn();
  const quoteUpdate = vi.fn();
  const quoteFindUnique = vi.fn();
  const quoteLineDeleteMany = vi.fn();
  return {
    prisma: {
      quote: {
        create: quoteCreate,
        findUniqueOrThrow: quoteFindUnique,
        update: quoteUpdate,
        findFirst: vi.fn(),
      },
      quoteLine: { deleteMany: quoteLineDeleteMany },
      numberingCounter: { upsert: txNumberingUpsert },
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => {
        return fn({
          quote: { create: quoteCreate, update: quoteUpdate },
          quoteLine: { deleteMany: quoteLineDeleteMany },
          invoiceDraft: { create: vi.fn() },
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
import { createQuote, deleteQuote } from '@/lib/actions/quotes';

const mockCreate = vi.mocked(prisma.quote.create);
const mockFindUniqueOrThrow = vi.mocked(prisma.quote.findUniqueOrThrow);
const mockCounterUpsert = vi.mocked(prisma.numberingCounter.upsert);

describe('quote.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCounterUpsert.mockResolvedValue({ id: '1', prefix: 'PR', year: 2026, current: 1 } as never);
    mockCreate.mockResolvedValue({
      id: 'q1',
      number: 'PR-2026-0001',
      status: 'BOZZA',
      client: { businessName: 'Test' },
      lines: [],
    } as never);
  });

  it('creates a quote with correct prefix PR', async () => {
    await createQuote({
      clientId: 1,
      subject: 'Test preventivo',
      lines: [],
    });
    expect(mockCreate).toHaveBeenCalledOnce();
    const call = mockCreate.mock.calls[0][0];
    expect(call.data.number).toMatch(/^PR-\d{4}-\d{4}$/);
  });

  it('rejects non-admin users', async () => {
    const { auth } = await import('@/lib/auth');
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: '2', role: 'DIPENDENTE' } } as never);
    await expect(createQuote({ clientId: 1, subject: 'x', lines: [] })).rejects.toThrow(
      'Accesso non autorizzato',
    );
  });

  it('requires subject', async () => {
    await expect(createQuote({ clientId: 1, subject: '', lines: [] })).rejects.toThrow();
  });

  it('calculates totals from lines', async () => {
    await createQuote({
      clientId: 1,
      subject: 'Test',
      lines: [
        { description: 'Voce 1', quantity: 2, unit: 'h', unitPriceCents: 6500, discountCents: 0, vatCode: 'STANDARD', position: 1 },
      ],
    });
    const call = mockCreate.mock.calls[0][0];
    expect(call.data.subtotalCents).toBe(13000);
  });
});

describe('quote.delete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('can delete a BOZZA quote', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: 'q1', status: 'BOZZA' } as never);
    const mockDelete = vi.fn().mockResolvedValue({} as never);
    (prisma.quote as unknown as Record<string, unknown>).delete = mockDelete;
    await deleteQuote('q1');
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'q1' } });
  });

  it('cannot delete a non-BOZZA quote', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: 'q1', status: 'INVIATO' } as never);
    await expect(deleteQuote('q1')).rejects.toThrow('Solo i preventivi in bozza');
  });
});
