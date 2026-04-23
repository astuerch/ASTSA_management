import { describe, expect, it } from 'vitest';
import { clientSchema, contractSchema, materialSchema, propertySchema, serviceSchema, staffSchema } from '@/lib/validation';

describe('zod validation helpers', () => {
  it('valida client corretto', () => {
    expect(clientSchema.safeParse({ businessName: 'Cliente SA', type: 'AMMINISTRAZIONE' }).success).toBe(true);
  });

  it('rifiuta client senza ragione sociale', () => {
    expect(clientSchema.safeParse({ businessName: '', type: 'AMMINISTRAZIONE' }).success).toBe(false);
  });

  it('valida property corretta', () => {
    expect(propertySchema.safeParse({ name: 'Stabile', address: 'Via 1', clientId: 1 }).success).toBe(true);
  });

  it('rifiuta email staff non valida', () => {
    expect(staffSchema.safeParse({ firstName: 'A', lastName: 'B', email: 'x', roleId: 1, hourlyCostCents: 0, isActive: true }).success).toBe(false);
  });

  it('valida service corretto', () => {
    expect(serviceSchema.safeParse({ name: 'Custodia', category: 'ORDINARIO', unit: 'ora', defaultUnitRateCents: 1000 }).success).toBe(true);
  });

  it('valida material corretto', () => {
    expect(materialSchema.safeParse({ name: 'Sale', unit: 'sacco', unitCostCents: 100, stockQuantity: 1 }).success).toBe(true);
  });

  it('rifiuta contract con frequenza fuori range', () => {
    expect(contractSchema.safeParse({ propertyId: 1, weeklyFrequency: 0, expectedHoursMonthly: 1, monthlyPriceCents: 100, serviceIds: [] }).success).toBe(false);
  });
});
