import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    accountingConfig: { findMany: vi.fn().mockResolvedValue([]) },
    sageExport: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'b1', status: 'GENERATED' }),
      update: vi.fn().mockResolvedValue({}),
    },
    invoiceDraft: {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
      fn({
        sageExport: { update: vi.fn().mockResolvedValue({}) },
        invoiceDraft: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      }),
    ),
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { auth } from '@/lib/auth';
import { generateExport, confirmSageImport, listAccountingConfigs } from '@/lib/actions/sageExport';

const mockAuth = vi.mocked(auth);

describe('permissions: sage export', () => {
  it('generateExport rejects unauthenticated user', async () => {
    mockAuth.mockResolvedValueOnce(null);
    await expect(generateExport(['inv1'])).rejects.toThrow('Non autenticato');
  });

  it('generateExport rejects DIPENDENTE role', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: '2', role: 'DIPENDENTE' } } as never);
    await expect(generateExport(['inv1'])).rejects.toThrow('Accesso non consentito');
  });

  it('generateExport rejects CAPOSQUADRA role', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: '3', role: 'CAPOSQUADRA' } } as never);
    await expect(generateExport(['inv1'])).rejects.toThrow('Accesso non consentito');
  });

  it('generateExport allows AMMINISTRAZIONE role', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: '1', role: 'AMMINISTRAZIONE' } } as never);
    // Will fail at empty invoiceIds check, not auth check
    await expect(generateExport([])).rejects.toThrow('Seleziona almeno una fattura');
  });

  it('generateExport allows DIREZIONE role', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: '4', role: 'DIREZIONE' } } as never);
    await expect(generateExport([])).rejects.toThrow('Seleziona almeno una fattura');
  });

  it('confirmSageImport rejects unauthenticated user', async () => {
    mockAuth.mockResolvedValueOnce(null);
    await expect(confirmSageImport('batch1')).rejects.toThrow('Non autenticato');
  });

  it('confirmSageImport rejects DIPENDENTE', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: '2', role: 'DIPENDENTE' } } as never);
    await expect(confirmSageImport('batch1')).rejects.toThrow('Accesso non consentito');
  });

  it('listAccountingConfigs rejects unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    await expect(listAccountingConfigs()).rejects.toThrow('Non autenticato');
  });

  it('listAccountingConfigs rejects DIPENDENTE', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: '2', role: 'DIPENDENTE' } } as never);
    await expect(listAccountingConfigs()).rejects.toThrow('Accesso non consentito');
  });
});
