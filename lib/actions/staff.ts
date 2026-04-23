'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { staffSchema } from '@/lib/validation';

export async function createStaff(formData: FormData) {
  const parsed = staffSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    roleId: formData.get('roleId'),
    hourlyCostCents: formData.get('hourlyCostCents'),
    qualifications: formData.get('qualifications') ?? '',
    isActive: formData.get('isActive') === 'on',
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  const passwordHash = await bcrypt.hash(String(formData.get('password') || 'Password123!'), 10);
  await prisma.user.create({ data: { ...parsed.data, passwordHash } });
  revalidatePath('/dashboard/staff');
}

export async function updateStaff(formData: FormData) {
  const id = Number(formData.get('id'));
  const parsed = staffSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    roleId: formData.get('roleId'),
    hourlyCostCents: formData.get('hourlyCostCents'),
    qualifications: formData.get('qualifications') ?? '',
    isActive: formData.get('isActive') === 'on',
  });
  if (!parsed.success || !id) throw new Error(parsed.success ? 'ID non valido' : parsed.error.issues[0]?.message);
  await prisma.user.update({ where: { id }, data: parsed.data });
  revalidatePath('/dashboard/staff');
}

export async function deleteStaff(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) throw new Error('ID non valido');
  await prisma.user.delete({ where: { id } });
  revalidatePath('/dashboard/staff');
}
