import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children: React.ReactNode }) => children,
  View: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  StyleSheet: { create: (s: unknown) => s },
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('%PDF mock')),
  Font: { register: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    intervention: { findUnique: vi.fn() },
    generatedReport: { create: vi.fn() },
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/cloudinary', () => ({
  uploadImage: vi.fn().mockResolvedValue({ url: 'https://mock.pdf', publicId: 'mock/pdf' }),
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockAuth = vi.mocked(auth);

const mockIntervention = {
  id: 1,
  property: { name: 'Test', address: 'Via 1', client: null },
  startedAt: new Date('2024-01-15T09:00:00'),
  endedAt: new Date('2024-01-15T11:00:00'),
  durationMinutes: 120,
  workType: 'ORDINARIO',
  notes: null,
  anomaly: null,
  workers: [{ userId: 5, user: { firstName: 'Mario', lastName: 'Rossi' } }],
  photos: [],
  materials: [],
  clientSignatureUrl: null,
  clientSignerName: null,
};

describe('PDF permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.generatedReport.create).mockResolvedValue({ id: 'test-report' } as never);
  });

  it('DIPENDENTE non può accedere a variante internal', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '5', role: 'DIPENDENTE', name: 'Test', email: 'test@test.com' },
    } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(prisma.intervention.findUnique).mockResolvedValue(mockIntervention as never);

    const { generateInterventionReport } = await import('@/lib/actions/reports');
    await expect(generateInterventionReport(1, 'it', 'internal')).rejects.toThrow('Solo caposquadra');
  });

  it('DIPENDENTE non può accedere a interventi altrui', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '99', role: 'DIPENDENTE', name: 'Test', email: 'test@test.com' },
    } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(prisma.intervention.findUnique).mockResolvedValue(mockIntervention as never);

    const { generateInterventionReport } = await import('@/lib/actions/reports');
    await expect(generateInterventionReport(1, 'it', 'client')).rejects.toThrow('Accesso negato');
  });

  it('AMMINISTRAZIONE può accedere a variante internal', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', role: 'AMMINISTRAZIONE', name: 'Admin', email: 'admin@test.com' },
    } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(prisma.intervention.findUnique).mockResolvedValue(mockIntervention as never);

    const { generateInterventionReport } = await import('@/lib/actions/reports');
    const result = await generateInterventionReport(1, 'it', 'internal');
    expect(result.url).toBeTruthy();
  });

  it('DIPENDENTE (worker) può accedere a variante client del proprio intervento', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '5', role: 'DIPENDENTE', name: 'Test', email: 'test@test.com' },
    } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(prisma.intervention.findUnique).mockResolvedValue(mockIntervention as never);

    const { generateInterventionReport } = await import('@/lib/actions/reports');
    const result = await generateInterventionReport(1, 'it', 'client');
    expect(result.url).toBeTruthy();
  });
});
