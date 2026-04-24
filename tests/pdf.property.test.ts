import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children: React.ReactNode }) => children,
  View: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  StyleSheet: { create: (s: unknown) => s },
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('%PDF property report')),
  Font: { register: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    property: { findUnique: vi.fn() },
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

describe('generatePropertyReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: '1', role: 'AMMINISTRAZIONE', name: 'Admin', email: 'admin@test.com' },
    } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    vi.mocked(prisma.property.findUnique).mockResolvedValue({
      id: 1,
      name: 'Stabile Test',
      address: 'Via Test 1',
      client: { businessName: 'Test Client' },
    } as never);
    vi.mocked(prisma.intervention.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.generatedReport.create).mockResolvedValue({ id: 'test' } as never);
  });

  it('genera storico stabile client in IT', async () => {
    const { generatePropertyReport } = await import('@/lib/actions/reports');
    const result = await generatePropertyReport(1, new Date('2024-01-01'), new Date('2024-01-31'), 'it', 'client');
    expect(result.url).toBeTruthy();
    expect(vi.mocked(renderToBuffer)).toHaveBeenCalled();
  });

  it('genera storico stabile interno in DE-CH', async () => {
    const { generatePropertyReport } = await import('@/lib/actions/reports');
    const result = await generatePropertyReport(1, new Date('2024-01-01'), new Date('2024-01-31'), 'de-ch', 'internal');
    expect(result.url).toBeTruthy();
  });

  it('nega accesso a non-admin', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: '5', role: 'DIPENDENTE', name: 'Test', email: 'test@test.com' },
    } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    const { generatePropertyReport } = await import('@/lib/actions/reports');
    await expect(generatePropertyReport(1, new Date('2024-01-01'), new Date('2024-01-31'), 'it', 'client')).rejects.toThrow('Solo amministrazione');
  });
});
