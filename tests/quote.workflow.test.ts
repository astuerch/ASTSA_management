import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    quote: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    numberingCounter: { upsert: vi.fn() },
    invoiceDraft: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: '1', role: 'AMMINISTRAZIONE' } }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { prisma } from '@/lib/prisma';
import { markAsSent, markAsAccepted, markAsRejected } from '@/lib/actions/quotes';

const mockFindUniqueOrThrow = vi.mocked(prisma.quote.findUniqueOrThrow);
const mockUpdate = vi.mocked(prisma.quote.update);

describe('quote.workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({} as never);
  });

  it('BOZZA → INVIATO via markAsSent', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: 'q1', status: 'BOZZA' } as never);
    await markAsSent('q1');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'q1' },
      data: expect.objectContaining({ status: 'INVIATO', sentAt: expect.any(Date) }),
    });
  });

  it('cannot send non-BOZZA quote', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: 'q1', status: 'ACCETTATO' } as never);
    await expect(markAsSent('q1')).rejects.toThrow('Solo i preventivi in bozza');
  });

  it('INVIATO → ACCETTATO via markAsAccepted', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: 'q1', status: 'INVIATO' } as never);
    await markAsAccepted('q1');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'q1' },
      data: expect.objectContaining({ status: 'ACCETTATO', acceptedAt: expect.any(Date) }),
    });
  });

  it('cannot accept non-INVIATO quote', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: 'q1', status: 'BOZZA' } as never);
    await expect(markAsAccepted('q1')).rejects.toThrow('Solo i preventivi inviati');
  });

  it('INVIATO → RIFIUTATO via markAsRejected', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: 'q1', status: 'INVIATO' } as never);
    await markAsRejected('q1');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'q1' },
      data: expect.objectContaining({ status: 'RIFIUTATO', rejectedAt: expect.any(Date) }),
    });
  });

  it('ACCETTATO → RIFIUTATO is allowed', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: 'q1', status: 'ACCETTATO' } as never);
    await markAsRejected('q1');
    expect(mockUpdate).toHaveBeenCalled();
  });
});
