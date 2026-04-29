import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    accountingConfig: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { getConfig, setConfig, invalidateCache, getAccountForWorkType, getVatCodeForVatRate, getCostCenterForWorkType } from '@/lib/accounting/config';

const mockFindMany = vi.mocked(prisma.accountingConfig.findMany);
const mockUpsert = vi.mocked(prisma.accountingConfig.upsert);

describe('accounting config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCache();
  });

  it('getConfig returns value from DB', async () => {
    mockFindMany.mockResolvedValueOnce([
      { key: 'account.ricavi.default', value: '3200' },
    ]);
    const val = await getConfig('account.ricavi.default');
    expect(val).toBe('3200');
  });

  it('getConfig returns fallback if key not found', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const val = await getConfig('missing.key', 'fallback');
    expect(val).toBe('fallback');
  });

  it('getConfig throws if key not found and no fallback', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    await expect(getConfig('missing.key')).rejects.toThrow('AccountingConfig key not found');
  });

  it('uses in-memory cache on second call', async () => {
    mockFindMany.mockResolvedValue([
      { key: 'account.ricavi.default', value: '3200' },
    ]);
    await getConfig('account.ricavi.default');
    await getConfig('account.ricavi.default');
    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });

  it('invalidateCache forces reload', async () => {
    mockFindMany.mockResolvedValue([
      { key: 'account.ricavi.default', value: '3200' },
    ]);
    await getConfig('account.ricavi.default');
    invalidateCache();
    await getConfig('account.ricavi.default');
    expect(mockFindMany).toHaveBeenCalledTimes(2);
  });

  it('setConfig calls upsert and invalidates cache', async () => {
    mockUpsert.mockResolvedValueOnce({});
    mockFindMany.mockResolvedValue([{ key: 'account.test', value: 'newval' }]);
    await setConfig('account.test', 'newval', 1);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'account.test' },
        update: expect.objectContaining({ value: 'newval' }),
      }),
    );
  });

  it('getAccountForWorkType returns configured account', async () => {
    mockFindMany.mockResolvedValue([
      { key: 'account.ricavi.EXTRA', value: '3200' },
    ]);
    const account = await getAccountForWorkType('EXTRA');
    expect(account).toBe('3200');
  });

  it('getAccountForWorkType falls back to default if not configured', async () => {
    mockFindMany.mockResolvedValue([
      { key: 'account.ricavi.default', value: '3200' },
    ]);
    const account = await getAccountForWorkType('UNKNOWN_TYPE');
    expect(account).toBe('3200');
  });

  it('getVatCodeForVatRate returns IP81 for STANDARD', async () => {
    mockFindMany.mockResolvedValue([
      { key: 'vat.STANDARD', value: 'IP81' },
    ]);
    const code = await getVatCodeForVatRate('STANDARD');
    expect(code).toBe('IP81');
  });

  it('getVatCodeForVatRate returns default fallback if not configured', async () => {
    mockFindMany.mockResolvedValue([]);
    const code = await getVatCodeForVatRate('STANDARD');
    expect(code).toBe('IP81');
  });

  it('getCostCenterForWorkType returns configured cost center', async () => {
    mockFindMany.mockResolvedValue([
      { key: 'costCenter.REGIA', value: 'REGIA' },
    ]);
    const cc = await getCostCenterForWorkType('REGIA');
    expect(cc).toBe('REGIA');
  });

  it('getCostCenterForWorkType falls back to workType itself', async () => {
    mockFindMany.mockResolvedValue([]);
    const cc = await getCostCenterForWorkType('CUSTOM');
    expect(cc).toBe('CUSTOM');
  });
});
