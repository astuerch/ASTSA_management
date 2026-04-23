'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { materialSchema } from '@/lib/validation';

function materialCode(name: string, id = '') {
  return `${name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}${id}`.slice(0, 20);
}

export async function createMaterial(formData: FormData) {
  const parsed = materialSchema.safeParse({
    name: formData.get('name'),
    unit: formData.get('unit'),
    unitCostCents: formData.get('unitCostCents'),
    stockQuantity: formData.get('stockQuantity'),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  await prisma.material.create({ data: { ...parsed.data, code: materialCode(parsed.data.name, String(Date.now()).slice(-4)) } });
  revalidatePath('/dashboard/materials');
}

export async function updateMaterial(formData: FormData) {
  const id = Number(formData.get('id'));
  const parsed = materialSchema.safeParse({
    name: formData.get('name'),
    unit: formData.get('unit'),
    unitCostCents: formData.get('unitCostCents'),
    stockQuantity: formData.get('stockQuantity'),
  });
  if (!parsed.success || !id) throw new Error(parsed.success ? 'ID non valido' : parsed.error.issues[0]?.message);
  await prisma.material.update({ where: { id }, data: parsed.data });
  revalidatePath('/dashboard/materials');
}

export async function deleteMaterial(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) throw new Error('ID non valido');
  await prisma.material.delete({ where: { id } });
  revalidatePath('/dashboard/materials');
}
