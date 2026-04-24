import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    intervention: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
    interventionAuditLog: { create: vi.fn() },
    material: { findUnique: vi.fn() },
    interventionMaterial: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { InterventionStatus, WorkType } from '@prisma/client';

const mockAuth = vi.mocked(auth);
const mockPrisma = prisma as typeof prisma & {
  intervention: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) fd.append(key, value);
  return fd;
}

const baseIntervention = {
  id: 1,
  status: InterventionStatus.IN_CORSO,
  startedAt: new Date(Date.now() - 60 * 60 * 1000),
  endedAt: null,
  isExtra: false,
  workType: WorkType.ORDINARIO,
  workers: [{ userId: 1, isLead: true }],
};

describe('stopIntervention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calcola durationMinutes al momento dello stop', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'DIPENDENTE', name: 'T', email: 't@t.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockPrisma.intervention.findUnique.mockResolvedValue(baseIntervention);
    mockPrisma.intervention.update.mockResolvedValue({});

    const { stopIntervention } = await import('@/lib/actions/interventions');
    await stopIntervention(1, makeFormData({ notes: 'Ok' }));

    const updateCall = mockPrisma.intervention.update.mock.calls[0][0];
    expect(updateCall.data.durationMinutes).toBeGreaterThan(0);
    expect(updateCall.data.status).toBe(InterventionStatus.COMPLETATO);
  });

  it('aggiorna stato a COMPLETATO', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'DIPENDENTE', name: 'T', email: 't@t.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockPrisma.intervention.findUnique.mockResolvedValue(baseIntervention);
    mockPrisma.intervention.update.mockResolvedValue({});

    const { stopIntervention } = await import('@/lib/actions/interventions');
    await stopIntervention(1, makeFormData({}));

    expect(mockPrisma.intervention.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: InterventionStatus.COMPLETATO }),
      }),
    );
  });

  it('solo lead worker può chiudere', async () => {
    // User 2 is NOT lead
    mockAuth.mockResolvedValue({ user: { id: '2', role: 'DIPENDENTE', name: 'T', email: 't@t.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockPrisma.intervention.findUnique.mockResolvedValue(baseIntervention);

    const { stopIntervention } = await import('@/lib/actions/interventions');
    await expect(stopIntervention(1, makeFormData({}))).rejects.toThrow('Solo il capointervento');
  });

  it('admin può chiudere anche senza essere lead', async () => {
    mockAuth.mockResolvedValue({ user: { id: '99', role: 'AMMINISTRAZIONE', name: 'A', email: 'a@a.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockPrisma.intervention.findUnique.mockResolvedValue(baseIntervention);
    mockPrisma.intervention.update.mockResolvedValue({});

    const { stopIntervention } = await import('@/lib/actions/interventions');
    await expect(stopIntervention(1, makeFormData({}))).resolves.toBeUndefined();
  });

  it('lancia errore se intervento non è IN_CORSO', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'DIPENDENTE', name: 'T', email: 't@t.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockPrisma.intervention.findUnique.mockResolvedValue({ ...baseIntervention, status: InterventionStatus.COMPLETATO });

    const { stopIntervention } = await import('@/lib/actions/interventions');
    await expect(stopIntervention(1, makeFormData({}))).rejects.toThrow('non in corso');
  });
});
