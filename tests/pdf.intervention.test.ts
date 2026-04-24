import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock @react-pdf/renderer
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children: React.ReactNode }) => children,
  View: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  Image: () => null,
  StyleSheet: { create: (s: unknown) => s },
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock pdf content')),
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
  uploadImage: vi.fn().mockResolvedValue({ url: 'https://mock.cloudinary.com/test.pdf', publicId: 'mock/pdf/1' }),
}));

import { renderToBuffer } from '@react-pdf/renderer';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockAuth = vi.mocked(auth);
const mockRenderToBuffer = vi.mocked(renderToBuffer);

const mockIntervention = {
  id: 1,
  property: { name: 'Test Stabile', address: 'Via Test 1', client: { businessName: 'Test Client' } },
  startedAt: new Date('2024-01-15T09:00:00'),
  endedAt: new Date('2024-01-15T11:00:00'),
  durationMinutes: 120,
  workType: 'ORDINARIO',
  notes: 'Test notes',
  anomaly: null,
  workers: [{ user: { firstName: 'Mario', lastName: 'Rossi' } }],
  photos: [],
  materials: [],
  clientSignatureUrl: null,
  clientSignerName: null,
};

describe('generateInterventionReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: '1', role: 'AMMINISTRAZIONE', name: 'Admin', email: 'admin@test.com' },
    } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(prisma.intervention.findUnique).mockResolvedValue(mockIntervention as never);
    vi.mocked(prisma.generatedReport.create).mockResolvedValue({ id: 'test-report-id' } as never);
  });

  it('genera un buffer PDF non vuoto - variante client IT', async () => {
    const { generateInterventionReport } = await import('@/lib/actions/reports');
    const result = await generateInterventionReport(1, 'it', 'client');
    expect(result.url).toBeTruthy();
    expect(mockRenderToBuffer).toHaveBeenCalled();
  });

  it('genera un buffer PDF non vuoto - variante client DE-CH', async () => {
    const { generateInterventionReport } = await import('@/lib/actions/reports');
    const result = await generateInterventionReport(1, 'de-ch', 'client');
    expect(result.url).toBeTruthy();
  });

  it('genera un buffer PDF non vuoto - variante interno IT', async () => {
    const { generateInterventionReport } = await import('@/lib/actions/reports');
    const result = await generateInterventionReport(1, 'it', 'internal');
    expect(result.url).toBeTruthy();
  });

  it('genera un buffer PDF non vuoto - variante interno DE-CH', async () => {
    const { generateInterventionReport } = await import('@/lib/actions/reports');
    const result = await generateInterventionReport(1, 'de-ch', 'internal');
    expect(result.url).toBeTruthy();
  });

  it('lancia errore se intervento non trovato', async () => {
    vi.mocked(prisma.intervention.findUnique).mockResolvedValue(null);
    const { generateInterventionReport } = await import('@/lib/actions/reports');
    await expect(generateInterventionReport(999, 'it', 'client')).rejects.toThrow('Intervento non trovato');
  });
});
