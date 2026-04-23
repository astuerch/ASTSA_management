'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { contractSchema } from '@/lib/validation';

function toDate(value: string | null) {
  return value ? new Date(value) : null;
}

export async function createContract(formData: FormData) {
  const parsed = contractSchema.safeParse({
    propertyId: formData.get('propertyId'),
    weeklyFrequency: formData.get('weeklyFrequency'),
    expectedHoursMonthly: formData.get('expectedHoursMonthly'),
    monthlyPriceCents: formData.get('monthlyPriceCents'),
    startsOn: formData.get('startsOn') ?? '',
    endsOn: formData.get('endsOn') ?? '',
    serviceIds: formData.getAll('serviceIds').map(Number),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const property = await prisma.property.findUniqueOrThrow({ where: { id: parsed.data.propertyId } });

  await prisma.custodyContract.create({
    data: {
      clientId: property.clientId,
      propertyId: parsed.data.propertyId,
      weeklyFrequency: parsed.data.weeklyFrequency,
      expectedHoursMonthly: parsed.data.expectedHoursMonthly,
      monthlyPriceCents: parsed.data.monthlyPriceCents,
      includedServices: parsed.data.serviceIds.join(','),
      startsOn: toDate(parsed.data.startsOn || null),
      endsOn: toDate(parsed.data.endsOn || null),
      services: { create: parsed.data.serviceIds.map((serviceId) => ({ serviceId })) },
    },
  });
  revalidatePath('/dashboard/contracts');
}

export async function updateContract(formData: FormData) {
  const id = Number(formData.get('id'));
  const parsed = contractSchema.safeParse({
    propertyId: formData.get('propertyId'),
    weeklyFrequency: formData.get('weeklyFrequency'),
    expectedHoursMonthly: formData.get('expectedHoursMonthly'),
    monthlyPriceCents: formData.get('monthlyPriceCents'),
    startsOn: formData.get('startsOn') ?? '',
    endsOn: formData.get('endsOn') ?? '',
    serviceIds: formData.getAll('serviceIds').map(Number),
  });
  if (!parsed.success || !id) throw new Error(parsed.success ? 'ID non valido' : parsed.error.issues[0]?.message);

  const property = await prisma.property.findUniqueOrThrow({ where: { id: parsed.data.propertyId } });

  await prisma.custodyContract.update({
    where: { id },
    data: {
      clientId: property.clientId,
      propertyId: parsed.data.propertyId,
      weeklyFrequency: parsed.data.weeklyFrequency,
      expectedHoursMonthly: parsed.data.expectedHoursMonthly,
      monthlyPriceCents: parsed.data.monthlyPriceCents,
      includedServices: parsed.data.serviceIds.join(','),
      startsOn: toDate(parsed.data.startsOn || null),
      endsOn: toDate(parsed.data.endsOn || null),
      services: {
        deleteMany: {},
        create: parsed.data.serviceIds.map((serviceId) => ({ serviceId })),
      },
    },
  });
  revalidatePath('/dashboard/contracts');
}

export async function deleteContract(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) throw new Error('ID non valido');
  await prisma.custodyContract.delete({ where: { id } });
  revalidatePath('/dashboard/contracts');
}
