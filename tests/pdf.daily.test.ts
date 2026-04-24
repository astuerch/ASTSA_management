import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children: React.ReactNode }) => children,
  View: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  StyleSheet: { create: (s: unknown) => s },
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 daily report')),
  Font: { register: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    intervention: { findMany: vi.fn() },
    generatedReport: { create: vi.fn() },
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/cloudinary', () => ({
  uploadImage: vi.fn().mockResolvedValue({ url: 'https://mock.pdf', publicId: 'mock/pdf' }),
}));

import { renderToBuffer } from '@react-pdf/renderer';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

describe('generateDailyReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: '1', role: 'AMMINISTRAZIONE', name: 'Admin', email: 'admin@test.com' },
    } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 1,
      firstName: 'Mario',
      lastName: 'Rossi',
    } as never);
    vi.mocked(prisma.intervention.findMany).mockResolvedValue([
      {
        id: 1,
        startedAt: new Date('2024-01-15T09:00:00'),
        endedAt: new Date('2024-01-15T11:00:00'),
        durationMinutes: 120,
        workType: 'ORDINARIO',
        property: { name: 'Test Stabile' },
      },
    ] as never);
    vi.mocked(prisma.generatedReport.create).mockResolvedValue({ id: 'test' } as never);
  });

  it('genera rapporto giornaliero in IT', async () => {
    const { generateDailyReport } = await import('@/lib/actions/reports');
    const result = await generateDailyReport(1, new Date('2024-01-15'), 'it');
    expect(result.url).toBeTruthy();
    expect(vi.mocked(renderToBuffer)).toHaveBeenCalled();
  });

  it('genera rapporto giornaliero in DE-CH', async () => {
    const { generateDailyReport } = await import('@/lib/actions/reports');
    const result = await generateDailyReport(1, new Date('2024-01-15'), 'de-ch');
    expect(result.url).toBeTruthy();
  });
});
