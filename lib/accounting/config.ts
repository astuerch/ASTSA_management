import { prisma } from '@/lib/prisma';
import { AccountingConfigCategory } from '@prisma/client';

let cache: Map<string, string> | null = null;

async function loadCache(): Promise<Map<string, string>> {
  if (cache) return cache;
  const configs = await prisma.accountingConfig.findMany();
  cache = new Map(configs.map((c) => [c.key, c.value]));
  return cache;
}

export function invalidateCache() {
  cache = null;
}

export async function getConfig(key: string, fallback?: string): Promise<string> {
  const c = await loadCache();
  const val = c.get(key);
  if (val !== undefined) return val;
  if (fallback !== undefined) return fallback;
  throw new Error(`AccountingConfig key not found: ${key}`);
}

export async function setConfig(key: string, value: string, userId: number): Promise<void> {
  await prisma.accountingConfig.upsert({
    where: { key },
    update: { value, updatedById: userId },
    create: {
      key,
      value,
      category: inferCategory(key),
      updatedById: userId,
    },
  });
  invalidateCache();
}

function inferCategory(key: string): AccountingConfigCategory {
  if (key.startsWith('account.')) return 'ACCOUNT';
  if (key.startsWith('vat.')) return 'VAT_CODE';
  if (key.startsWith('costCenter.')) return 'COST_CENTER';
  return 'GENERAL';
}

export async function getAccountForWorkType(workType: string): Promise<string> {
  return getConfig(`account.ricavi.${workType}`, await getConfig('account.ricavi.default', '3200'));
}

export async function getCostCenterForWorkType(workType: string): Promise<string> {
  return getConfig(`costCenter.${workType}`, workType);
}

export async function getVatCodeForVatRate(vatCode: string): Promise<string> {
  return getConfig(`vat.${vatCode}`, 'IP81');
}
