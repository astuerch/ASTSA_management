import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    invoiceDraft: { create: vi.fn() },
    numberingCounter: { upsert: vi.fn() },
    quote: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    quoteLine: { deleteMany: vi.fn() },
    priceListItem: { create: vi.fn(), delete: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { auth } from '@/lib/auth';
import { createInvoiceDraft } from '@/lib/actions/invoices';
import { createQuote } from '@/lib/actions/quotes';

describe('permissions.invoice – DIPENDENTE access restriction', () => {
  it('DIPENDENTE cannot create invoice draft', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: '5', role: 'DIPENDENTE' } } as never);
    await expect(
      createInvoiceDraft({ clientId: 1, subject: 'x', dueDate: new Date(), lines: [] }),
    ).rejects.toThrow('Accesso non autorizzato');
  });

  it('DIPENDENTE cannot create quote', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: '5', role: 'DIPENDENTE' } } as never);
    await expect(createQuote({ clientId: 1, subject: 'x', lines: [] })).rejects.toThrow(
      'Accesso non autorizzato',
    );
  });

  it('CAPOSQUADRA cannot create invoice draft', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: '3', role: 'CAPOSQUADRA' } } as never);
    await expect(
      createInvoiceDraft({ clientId: 1, subject: 'x', dueDate: new Date(), lines: [] }),
    ).rejects.toThrow('Accesso non autorizzato');
  });

  it('AMMINISTRAZIONE can create invoice draft', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: '1', role: 'AMMINISTRAZIONE' } } as never);
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.numberingCounter.upsert).mockResolvedValue({ id: '1', prefix: 'BZ', year: 2026, current: 1 } as never);
    vi.mocked(prisma.invoiceDraft.create).mockResolvedValue({ id: 'inv1', number: 'BZ-2026-0001', client: {}, lines: [] } as never);
    await expect(
      createInvoiceDraft({ clientId: 1, subject: 'Test', dueDate: new Date(), lines: [] }),
    ).resolves.toBeDefined();
  });
});
