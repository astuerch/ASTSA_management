'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { clientSchema } from '@/lib/validation';

export async function createClient(formData: FormData) {
  const parsed = clientSchema.safeParse({
    businessName: formData.get('businessName'),
    type: formData.get('type'),
    address: formData.get('address') ?? '',
    billingEmail: formData.get('billingEmail') ?? '',
    phone: formData.get('phone') ?? '',
    contactName: formData.get('contactName') ?? '',
    notes: formData.get('notes') ?? '',
    specialConditions: formData.get('specialConditions') ?? '',
    sageCustomerNumber: formData.get('sageCustomerNumber') ?? '',
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Dati non validi');
  }

  await prisma.client.create({ data: parsed.data });
  revalidatePath('/dashboard/clients');
}

export async function updateClient(formData: FormData) {
  const id = Number(formData.get('id'));
  const parsed = clientSchema.safeParse({
    businessName: formData.get('businessName'),
    type: formData.get('type'),
    address: formData.get('address') ?? '',
    billingEmail: formData.get('billingEmail') ?? '',
    phone: formData.get('phone') ?? '',
    contactName: formData.get('contactName') ?? '',
    notes: formData.get('notes') ?? '',
    specialConditions: formData.get('specialConditions') ?? '',
    sageCustomerNumber: formData.get('sageCustomerNumber') ?? '',
  });

  if (!parsed.success || !id) {
    throw new Error(parsed.success ? 'ID non valido' : parsed.error.issues[0]?.message);
  }

  await prisma.client.update({ where: { id }, data: parsed.data });
  revalidatePath('/dashboard/clients');
}

export async function deleteClient(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) throw new Error('ID non valido');
  await prisma.client.delete({ where: { id } });
  revalidatePath('/dashboard/clients');
}
