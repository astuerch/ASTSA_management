'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { propertySchema } from '@/lib/validation';

export async function createProperty(formData: FormData) {
  const parsed = propertySchema.safeParse({
    name: formData.get('name'),
    address: formData.get('address'),
    clientId: formData.get('clientId'),
    serviceFrequency: formData.get('serviceFrequency') ?? '',
    expectedWeeklyHours: formData.get('expectedWeeklyHours') ?? undefined,
    operationalNotes: formData.get('operationalNotes') ?? '',
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  await prisma.property.create({ data: parsed.data });
  revalidatePath('/dashboard/properties');
}

export async function updateProperty(formData: FormData) {
  const id = Number(formData.get('id'));
  const parsed = propertySchema.safeParse({
    name: formData.get('name'),
    address: formData.get('address'),
    clientId: formData.get('clientId'),
    serviceFrequency: formData.get('serviceFrequency') ?? '',
    expectedWeeklyHours: formData.get('expectedWeeklyHours') ?? undefined,
    operationalNotes: formData.get('operationalNotes') ?? '',
  });
  if (!parsed.success || !id) throw new Error(parsed.success ? 'ID non valido' : parsed.error.issues[0]?.message);
  await prisma.property.update({ where: { id }, data: parsed.data });
  revalidatePath('/dashboard/properties');
}

export async function deleteProperty(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) throw new Error('ID non valido');
  await prisma.property.delete({ where: { id } });
  revalidatePath('/dashboard/properties');
}
