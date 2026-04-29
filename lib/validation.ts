import { z } from 'zod';

export const clientSchema = z.object({
  businessName: z.string().min(2, 'La ragione sociale è obbligatoria'),
  type: z.enum(['AMMINISTRAZIONE', 'FIDUCIARIA', 'PRIVATO']),
  address: z.string().optional(),
  billingEmail: z.string().email('Email non valida').optional().or(z.literal('')),
  phone: z.string().optional(),
  contactName: z.string().optional(),
  notes: z.string().optional(),
  specialConditions: z.string().optional(),
  sageCustomerNumber: z.string().optional(),
});

export const propertySchema = z.object({
  name: z.string().min(2, 'Il nome è obbligatorio'),
  address: z.string().min(3, 'L\'indirizzo è obbligatorio'),
  clientId: z.coerce.number().int().positive('Cliente obbligatorio'),
  serviceFrequency: z.string().optional(),
  expectedWeeklyHours: z.coerce.number().optional(),
  operationalNotes: z.string().optional(),
});

export const staffSchema = z.object({
  firstName: z.string().min(2, 'Nome obbligatorio'),
  lastName: z.string().min(2, 'Cognome obbligatorio'),
  email: z.string().email('Email non valida'),
  roleId: z.coerce.number().int().positive('Ruolo obbligatorio'),
  hourlyCostCents: z.coerce.number().int().min(0),
  qualifications: z.string().optional(),
  isActive: z.boolean(),
});

export const serviceSchema = z.object({
  name: z.string().min(2, 'Nome servizio obbligatorio'),
  category: z.enum(['ORDINARIO', 'EXTRA']),
  unit: z.string().min(1, 'Unità obbligatoria'),
  defaultUnitRateCents: z.coerce.number().int().min(0),
});

export const materialSchema = z.object({
  name: z.string().min(2, 'Descrizione obbligatoria'),
  unit: z.string().min(1, 'Unità obbligatoria'),
  unitCostCents: z.coerce.number().int().min(0),
  stockQuantity: z.coerce.number().min(0),
});

export const contractSchema = z.object({
  propertyId: z.coerce.number().int().positive('Stabile obbligatorio'),
  weeklyFrequency: z.coerce.number().int().min(1).max(7),
  expectedHoursMonthly: z.coerce.number().min(0),
  monthlyPriceCents: z.coerce.number().int().min(0),
  startsOn: z.string().optional(),
  endsOn: z.string().optional(),
  serviceIds: z.array(z.coerce.number().int().positive()).default([]),
});
