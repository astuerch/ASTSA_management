import { PrismaClient, ClientType, ServiceCategory, BillingMode, WorkType, InterventionStatus } from '@prisma/client';
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

  // Demo property
  await prisma.property.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      clientId: 1,
      name: 'Condominio Centro A',
      address: 'Via Roma 2, Lugano',
    },
  });

  // Demo DIPENDENTE user
  const dipRole = await prisma.role.findUniqueOrThrow({ where: { code: 'DIPENDENTE' } });
  const dipHash = await bcrypt.hash('Demo123!', 10);
  const dipUser = await prisma.user.upsert({
    where: { email: 'dipendente@astsa.local' },
    update: {},
    create: {
      roleId: dipRole.id,
      firstName: 'Marco',
      lastName: 'Bianchi',
      email: 'dipendente@astsa.local',
      passwordHash: dipHash,
      isActive: true,
    },
  });

  const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@astsa.local' } });

  // Demo intervento IN_CORSO
  const inCorsoExists = await prisma.intervention.findFirst({
    where: { status: InterventionStatus.IN_CORSO, workers: { some: { userId: dipUser.id } } },
  });
  if (!inCorsoExists) {
    await prisma.intervention.create({
      data: {
        propertyId: 1,
        createdByUserId: dipUser.id,
        workType: WorkType.ORDINARIO,
        status: InterventionStatus.IN_CORSO,
        startedAt: new Date(Date.now() - 45 * 60 * 1000),
        isExtra: false,
        workers: { create: [{ userId: dipUser.id, isLead: true }] },
      },
    });
  }

  // Demo intervento COMPLETATO
  await prisma.intervention.create({
    data: {
      propertyId: 1,
      createdByUserId: dipUser.id,
      workType: WorkType.ORDINARIO,
      status: InterventionStatus.COMPLETATO,
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      endedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      durationMinutes: 180,
      notes: 'Intervento ordinario completato regolarmente',
      isExtra: false,
      workers: { create: [{ userId: dipUser.id, isLead: true }] },
    },
  });

  // Demo intervento VALIDATO EXTRA
  const extraIv = await prisma.intervention.create({
    data: {
      propertyId: 1,
      createdByUserId: dipUser.id,
      workType: WorkType.EXTRA,
      status: InterventionStatus.VALIDATO,
      startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      durationMinutes: 120,
      notes: 'Sgombero cantina extra',
      isExtra: true,
      isBillableExtra: true,
      validatedById: adminUser.id,
      validatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      validatedByOffice: true,
      workers: { create: [{ userId: dipUser.id, isLead: true }] },
    },
  });

  // Add a material to the extra intervention
  const saltMaterial = await prisma.material.findUnique({ where: { code: 'SALE_25' } });
  if (saltMaterial) {
    await prisma.interventionMaterial.create({
      data: {
        interventionId: extraIv.id,
        materialId: saltMaterial.id,
        quantity: 2,
        unitCostCents: saltMaterial.unitCostCents,
      },
    });
  }

  console.log('🌱 Seed completato con interventi demo');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
