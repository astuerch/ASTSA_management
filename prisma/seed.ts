import { PrismaClient, ClientType, ServiceCategory, BillingMode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { code: 'DIPENDENTE', name: 'Dipendente', description: 'Operatore sul campo con accesso solo ai propri interventi' },
    { code: 'CAPOSQUADRA', name: 'Caposquadra', description: 'Supervisione lavori squadra e validazioni operative base' },
    { code: 'AMMINISTRAZIONE', name: 'Amministrazione', description: 'Gestione ufficio, rapporti, preventivi e export Sage' },
    { code: 'DIREZIONE', name: 'Direzione', description: 'Accesso completo a controllo margini e autorizzazioni' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description },
      create: role,
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'AMMINISTRAZIONE' } });
  const passwordHash = await bcrypt.hash('Admin123!', 10);

  await prisma.user.upsert({
    where: { email: 'admin@astsa.local' },
    update: {
      firstName: 'Admin',
      lastName: 'Demo',
      roleId: adminRole.id,
      passwordHash,
      isActive: true,
      qualifications: 'gestionale,coordinamento',
    },
    create: {
      roleId: adminRole.id,
      firstName: 'Admin',
      lastName: 'Demo',
      email: 'admin@astsa.local',
      passwordHash,
      isActive: true,
      qualifications: 'gestionale,coordinamento',
    },
  });

  await prisma.client.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      businessName: 'Condominio Centro',
      type: ClientType.AMMINISTRAZIONE,
      address: 'Via Roma 1, Lugano',
      billingEmail: 'amministrazione@condominio-centro.ch',
      phone: '+41910000000',
      contactName: 'Mario Rossi',
    },
  });

  await prisma.service.upsert({
    where: { code: 'CUSTODIA' },
    update: { name: 'Custodia' },
    create: {
      code: 'CUSTODIA',
      name: 'Custodia',
      category: ServiceCategory.ORDINARIO,
      unit: 'ora',
      billingMode: BillingMode.CONTRACT,
      defaultHourlyRateCents: 4500,
    },
  });

  await prisma.service.upsert({
    where: { code: 'SGOMBERO' },
    update: { name: 'Sgombero' },
    create: {
      code: 'SGOMBERO',
      name: 'Sgombero',
      category: ServiceCategory.EXTRA,
      unit: 'forfait',
      billingMode: BillingMode.EXTRA,
      defaultUnitRateCents: 25000,
    },
  });

  const materials = [
    { code: 'SALE_25', name: 'Sale 25kg', unit: 'sacco', unitCostCents: 1290, stockQuantity: 40 },
    { code: 'DETERGENTE', name: 'Detergente multiuso', unit: 'litro', unitCostCents: 650, stockQuantity: 25 },
  ];

  for (const material of materials) {
    await prisma.material.upsert({
      where: { code: material.code },
      update: material,
      create: material,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
