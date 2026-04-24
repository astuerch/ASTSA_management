import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    intervention: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    interventionAuditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { InterventionStatus } from '@prisma/client';

const mockAuth = vi.mocked(auth);
const mockPrisma = prisma as typeof prisma & {
  intervention: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  interventionAuditLog: {
    create: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) fd.append(key, value);
  return fd;
}

describe('updateInterventionHours (audit log)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('solo admin può correggere ore', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'DIPENDENTE', name: 'D', email: 'd@d.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const { updateInterventionHours } = await import('@/lib/actions/interventions');
    const fd = makeFormData({
      startedAt: '2024-01-01T08:00:00.000Z',
      endedAt: '2024-01-01T10:00:00.000Z',
    });
    await expect(updateInterventionHours(1, fd)).rejects.toThrow('Solo gli amministratori');
  });

  it('crea audit log per startedAt modificato', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'AMMINISTRAZIONE', name: 'A', email: 'a@a.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const oldStart = new Date('2024-01-01T08:00:00Z');
    const oldEnd = new Date('2024-01-01T10:00:00Z');

    mockPrisma.intervention.findUnique.mockResolvedValue({
      id: 1,
      status: InterventionStatus.COMPLETATO,
      startedAt: oldStart,
      endedAt: oldEnd,
    });
    mockPrisma.intervention.update.mockResolvedValue({});
    mockPrisma.interventionAuditLog.create.mockResolvedValue({});

    const { updateInterventionHours } = await import('@/lib/actions/interventions');
    const fd = makeFormData({
      startedAt: '2024-01-01T09:00:00.000Z',
      endedAt: '2024-01-01T11:00:00.000Z',
    });
    await updateInterventionHours(1, fd);

    // Verify $transaction was called with audit log entries
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    const txArgs = mockPrisma.$transaction.mock.calls[0][0] as unknown[];
    expect(txArgs.length).toBeGreaterThanOrEqual(2); // at least 2 audit logs + update
  });

  it('lancia errore se endedAt <= startedAt', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'AMMINISTRAZIONE', name: 'A', email: 'a@a.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    mockPrisma.intervention.findUnique.mockResolvedValue({
      id: 1,
      startedAt: new Date('2024-01-01T08:00:00Z'),
      endedAt: new Date('2024-01-01T10:00:00Z'),
    });

    const { updateInterventionHours } = await import('@/lib/actions/interventions');
    const fd = makeFormData({
      startedAt: '2024-01-01T10:00:00.000Z',
      endedAt: '2024-01-01T08:00:00.000Z',
    });
    await expect(updateInterventionHours(1, fd)).rejects.toThrow('dopo');
  });
});
