import { prisma } from '@/lib/prisma';

/**
 * Returns the next sequence number for a given prefix+year, atomically.
 * Uses a transaction to prevent duplicates under concurrency.
 */
export async function getNextNumber(prefix: 'PR' | 'BZ', year: number): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const counter = await tx.numberingCounter.upsert({
      where: { prefix_year: { prefix, year } },
      update: { current: { increment: 1 } },
      create: { prefix, year, current: 1 },
    });
    return counter.current;
  });
}

/**
 * Formats a document number: "PR-2026-0001"
 */
export function formatNumber(prefix: 'PR' | 'BZ', year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}
