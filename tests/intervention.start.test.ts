import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock prisma and auth
vi.mock('@/lib/prisma', () => ({
  prisma: {
    intervention: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    interventionAuditLog: {
      create: vi.fn(),
    },
    material: {
      findUnique: vi.fn(),
    },
    interventionMaterial: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    interventionPhoto: {
      create: vi.fn(),
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
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

function makeFormData(data: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      value.forEach((v) => fd.append(key, v));
    } else {
      fd.append(key, value);
    }
  }
  return fd;
}

describe('startIntervention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'DIPENDENTE', name: 'Test', email: 'test@test.com' } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
  });

  it('lancia errore se utente ha già un intervento IN_CORSO', async () => {
    mockPrisma.intervention.findFirst.mockResolvedValue({ id: 99 });

    const { startIntervention } = await import('@/lib/actions/interventions');
    const fd = makeFormData({ propertyId: '1', workType: WorkType.ORDINARIO });
    await expect(startIntervention(fd)).rejects.toThrow('Hai già un intervento aperto');
  });

  it('crea intervento con timestamp server-side', async () => {
    mockPrisma.intervention.findFirst.mockResolvedValue(null);
    mockPrisma.intervention.create.mockResolvedValue({ id: 1 });

    const { startIntervention } = await import('@/lib/actions/interventions');
    const fd = makeFormData({ propertyId: '1', workType: WorkType.ORDINARIO });
    await startIntervention(fd);

    expect(mockPrisma.intervention.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startedAt: expect.any(Date),
          status: InterventionStatus.IN_CORSO,
        }),
      }),
    );
  });

  it('crea intervento con coordinate opzionali', async () => {
    mockPrisma.intervention.findFirst.mockResolvedValue(null);
    mockPrisma.intervention.create.mockResolvedValue({ id: 1 });

    const { startIntervention } = await import('@/lib/actions/interventions');
    const fd = makeFormData({
      propertyId: '1',
      workType: WorkType.ORDINARIO,
      startLat: '46.0',
      startLng: '9.0',
      startAccuracy: '10',
    });
    await startIntervention(fd);

    expect(mockPrisma.intervention.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startLat: 46.0,
          startLng: 9.0,
          startAccuracy: 10,
        }),
      }),
    );
  });

  it('imposta isExtra=true per workType EXTRA', async () => {
    mockPrisma.intervention.findFirst.mockResolvedValue(null);
    mockPrisma.intervention.create.mockResolvedValue({ id: 1 });

    const { startIntervention } = await import('@/lib/actions/interventions');
    const fd = makeFormData({ propertyId: '1', workType: WorkType.EXTRA });
    await startIntervention(fd);

    expect(mockPrisma.intervention.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isExtra: true }),
      }),
    );
  });

  it('imposta isExtra=false per workType ORDINARIO', async () => {
    mockPrisma.intervention.findFirst.mockResolvedValue(null);
    mockPrisma.intervention.create.mockResolvedValue({ id: 1 });

    const { startIntervention } = await import('@/lib/actions/interventions');
    const fd = makeFormData({ propertyId: '1', workType: WorkType.ORDINARIO });
    await startIntervention(fd);

    expect(mockPrisma.intervention.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isExtra: false }),
      }),
    );
  });
});
