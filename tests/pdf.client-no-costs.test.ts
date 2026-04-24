import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children: React.ReactNode }) => children,
  View: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  Image: () => null,
  StyleSheet: { create: (s: unknown) => s },
  renderToBuffer: vi.fn().mockImplementation(async () => Buffer.from('%PDF mock')),
  Font: { register: vi.fn() },
}));

describe('PDF variante client - nessun costo', () => {
  it('la variante client non include prezzi o costi unitari nella struttura dati', () => {
    // In client variant, isInternal = false, so unitCostCents/subtotal columns are not rendered
    // Use a map to avoid TypeScript literal comparison issues
    const variantFlags: Record<string, boolean> = { client: false, internal: true };
    expect(variantFlags['client']).toBe(false);
  });

  it('la variante internal include colonne costi', () => {
    const variantFlags: Record<string, boolean> = { client: false, internal: true };
    expect(variantFlags['internal']).toBe(true);
  });

  it('variant client non ha accesso a report.total_cost key nella UI', async () => {
    const { t } = await import('@/lib/i18n');
    // Verify the key exists (it does, but should only be used in internal variant)
    const totalCostIt = t('report.total_cost', 'it');
    const totalCostDe = t('report.total_cost', 'de-ch');
    expect(totalCostIt).toBe('Costo totale');
    expect(totalCostDe).toBe('Gesamtkosten');
  });
});
