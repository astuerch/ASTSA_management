import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children: React.ReactNode }) => children,
  View: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  StyleSheet: { create: (s: unknown) => s },
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('%PDF archive test')),
  Font: { register: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    intervention: { findUnique: vi.fn() },
    generatedReport: { create: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/cloudinary', () => ({
  uploadImage: vi.fn().mockResolvedValue({ url: 'https://mock.cloudinary.com/test.pdf', publicId: 'astsa/reports/test' }),
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

describe('generateAndStoreReport - archive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: '1', role: 'AMMINISTRAZIONE', name: 'Admin', email: 'admin@test.com' },
    } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(prisma.intervention.findUnique).mockResolvedValue({
      id: 1,
      property: { name: 'Test', address: 'Via 1', client: null },
      startedAt: new Date('2024-01-15T09:00:00'),
      endedAt: new Date('2024-01-15T11:00:00'),
      durationMinutes: 120,
      workType: 'ORDINARIO',
      notes: null,
      anomaly: null,
      workers: [{ userId: 1, user: { firstName: 'Admin', lastName: 'User' } }],
      photos: [],
      materials: [],
      clientSignatureUrl: null,
      clientSignerName: null,
    } as never);
    vi.mocked(prisma.generatedReport.create).mockResolvedValue({
      id: 'report-cuid-123',
      kind: 'INTERVENTION',
      locale: 'it',
      variant: 'client',
      interventionId: 1,
      pdfUrl: 'https://mock.cloudinary.com/test.pdf',
      pdfPublicId: 'astsa/reports/test',
      generatedById: 1,
      generatedAt: new Date(),
    } as never);
  });

  it('crea un record GeneratedReport nel database', async () => {
    const { generateInterventionReport } = await import('@/lib/actions/reports');
    const result = await generateInterventionReport(1, 'it', 'client');

    expect(vi.mocked(prisma.generatedReport.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: 'INTERVENTION',
          locale: 'it',
          variant: 'client',
          interventionId: 1,
          generatedById: 1,
        }),
      }),
    );
    expect(result.reportId).toBe('report-cuid-123');
    expect(result.url).toBe('https://mock.cloudinary.com/test.pdf');
  });

  it('salva URL Cloudinary nel record', async () => {
    const { generateInterventionReport } = await import('@/lib/actions/reports');
    await generateInterventionReport(1, 'it', 'client');

    expect(vi.mocked(prisma.generatedReport.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pdfUrl: 'https://mock.cloudinary.com/test.pdf',
          pdfPublicId: 'astsa/reports/test',
        }),
      }),
    );
  });

  it('usa mock URL quando Cloudinary non è configurato (locale dev)', async () => {
    const { uploadImage } = await import('@/lib/cloudinary');
    vi.mocked(uploadImage).mockResolvedValueOnce({ url: 'https://placehold.co/800x600?text=mock-photo', publicId: 'mock/1' });

    const { generateInterventionReport } = await import('@/lib/actions/reports');
    const result = await generateInterventionReport(1, 'it', 'client');
    expect(result.url).toContain('mock');
  });
});
