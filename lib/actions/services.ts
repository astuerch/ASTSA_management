'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { serviceSchema } from '@/lib/validation';

function serviceCode(name: string, id = '') {
  return `${name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}${id}`.slice(0, 20);
}

export async function createService(formData: FormData) {
  const parsed = serviceSchema.safeParse({
    name: formData.get('name'),
    category: formData.get('category'),
    unit: formData.get('unit'),
    defaultUnitRateCents: formData.get('defaultUnitRateCents'),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  await prisma.service.create({
    data: {
      ...parsed.data,
      code: serviceCode(parsed.data.name, String(Date.now()).slice(-4)),
      billingMode: parsed.data.category === 'ORDINARIO' ? 'CONTRACT' : 'EXTRA',
      defaultHourlyRateCents: parsed.data.unit === 'ora' ? parsed.data.defaultUnitRateCents : null,
    },
  });
  revalidatePath('/dashboard/services');
}

export async function updateService(formData: FormData) {
  const id = Number(formData.get('id'));
  const parsed = serviceSchema.safeParse({
    name: formData.get('name'),
    category: formData.get('category'),
    unit: formData.get('unit'),
    defaultUnitRateCents: formData.get('defaultUnitRateCents'),
  });
  if (!parsed.success || !id) throw new Error(parsed.success ? 'ID non valido' : parsed.error.issues[0]?.message);

  await prisma.service.update({
    where: { id },
    data: {
      ...parsed.data,
      billingMode: parsed.data.category === 'ORDINARIO' ? 'CONTRACT' : 'EXTRA',
      defaultHourlyRateCents: parsed.data.unit === 'ora' ? parsed.data.defaultUnitRateCents : null,
    },
  });
  revalidatePath('/dashboard/services');
}

export async function deleteService(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) throw new Error('ID non valido');
  await prisma.service.delete({ where: { id } });
  revalidatePath('/dashboard/services');
}
