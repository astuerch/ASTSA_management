import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    intervention: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
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

describe('validateIntervention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EXTRA → PRONTO_FATTURA', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'AMMINISTRAZIONE', name: 'A', email: 'a@a.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockPrisma.intervention.findUnique.mockResolvedValue({
      id: 1,
      status: InterventionStatus.COMPLETATO,
      isExtra: true,
    });
    mockPrisma.intervention.update.mockResolvedValue({});

    const { validateIntervention } = await import('@/lib/actions/interventions');
    await validateIntervention(1);

    expect(mockPrisma.intervention.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: InterventionStatus.PRONTO_FATTURA }),
      }),
    );
  });

  it('ORDINARIO → VALIDATO', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'AMMINISTRAZIONE', name: 'A', email: 'a@a.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockPrisma.intervention.findUnique.mockResolvedValue({
      id: 1,
      status: InterventionStatus.COMPLETATO,
      isExtra: false,
    });
    mockPrisma.intervention.update.mockResolvedValue({});

    const { validateIntervention } = await import('@/lib/actions/interventions');
    await validateIntervention(1);

    expect(mockPrisma.intervention.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: InterventionStatus.VALIDATO }),
      }),
    );
  });

  it('dipendente non può validare', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'DIPENDENTE', name: 'D', email: 'd@d.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const { validateIntervention } = await import('@/lib/actions/interventions');
    await expect(validateIntervention(1)).rejects.toThrow('Permesso negato');
  });

  it('caposquadra non può validare', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'CAPOSQUADRA', name: 'C', email: 'c@c.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const { validateIntervention } = await import('@/lib/actions/interventions');
    await expect(validateIntervention(1)).rejects.toThrow('Permesso negato');
  });

  it('non può validare intervento IN_CORSO', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'AMMINISTRAZIONE', name: 'A', email: 'a@a.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockPrisma.intervention.findUnique.mockResolvedValue({
      id: 1,
      status: InterventionStatus.IN_CORSO,
      isExtra: false,
    });

    const { validateIntervention } = await import('@/lib/actions/interventions');
    await expect(validateIntervention(1)).rejects.toThrow('in corso');
  });
});
