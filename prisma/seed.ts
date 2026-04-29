import { PrismaClient, ClientType, ServiceCategory, BillingMode, WorkType, InterventionStatus, QuoteStatus, InvoiceDraftStatus } from '@prisma/client';
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

  // ── Price List Items ──────────────────────────────────────────────────────

  const priceListItems = [
    { code: 'ORE_STD', description: 'Ore lavoro standard', unit: 'h', unitPriceCents: 6500, category: 'lavoro', vatCode: 'STANDARD' as const },
    { code: 'TINT_MQ', description: 'Tinteggio pareti (per m²)', unit: 'mq', unitPriceCents: 1200, category: 'tinteggio', vatCode: 'STANDARD' as const },
    { code: 'SGOM_H', description: 'Sgombero per ora', unit: 'h', unitPriceCents: 8500, category: 'sgombero', vatCode: 'STANDARD' as const },
    { code: 'GIARD_MQ', description: 'Manutenzione giardino (per m²)', unit: 'mq', unitPriceCents: 450, category: 'giardini', vatCode: 'STANDARD' as const },
    { code: 'NEVE_INT', description: 'Sgombero neve (per intervento)', unit: 'Forfait', unitPriceCents: 15000, category: 'neve_sale', vatCode: 'STANDARD' as const },
  ];

  for (const item of priceListItems) {
    await prisma.priceListItem.upsert({
      where: { code: item.code },
      update: item,
      create: item,
    });
  }

  // Update demo client with sage customer number
  await prisma.client.update({
    where: { id: 1 },
    data: { sageCustomerNumber: '1383' },
  });

  // ── Numbering counters ────────────────────────────────────────────────────

  const year = new Date().getFullYear();

  // ── Demo Quotes ───────────────────────────────────────────────────────────

  const existingQuote = await prisma.quote.findFirst({ where: { year } });
  if (!existingQuote) {
    await prisma.numberingCounter.upsert({
      where: { prefix_year: { prefix: 'PR', year } },
      update: {},
      create: { prefix: 'PR', year, current: 2 },
    });

    const q1 = await prisma.quote.create({
      data: {
        number: `PR-${year}-0001`,
        year,
        sequence: 1,
        clientId: 1,
        propertyId: 1,
        subject: 'Appartamento Signora Demo, Via Roma 2 – Tinteggio completo',
        status: QuoteStatus.BOZZA,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        locale: 'it',
        createdById: adminUser.id,
        subtotalCents: 120000,
        vatTotalCents: 9720,
        totalCents: 129720,
        lines: {
          create: [
            {
              position: 1,
              description: 'Tinteggio pareti soggiorno (45 mq)',
              quantity: 45,
              unit: 'mq',
              unitPriceCents: 1200,
              discountCents: 0,
              vatCode: 'STANDARD',
              netAmountCents: 54000,
              vatAmountCents: 4375,
              totalAmountCents: 58375,
            },
            {
              position: 2,
              description: 'Tinteggio pareti camera (35 mq)',
              quantity: 35,
              unit: 'mq',
              unitPriceCents: 1200,
              discountCents: 0,
              vatCode: 'STANDARD',
              netAmountCents: 42000,
              vatAmountCents: 3400,
              totalAmountCents: 45400,
            },
            {
              position: 3,
              description: 'Materiali e attrezzatura',
              quantity: 1,
              unit: 'Forfait',
              unitPriceCents: 24000,
              discountCents: 0,
              vatCode: 'STANDARD',
              netAmountCents: 24000,
              vatAmountCents: 1945,
              totalAmountCents: 25945,
            },
          ],
        },
      },
    });

    await prisma.quote.create({
      data: {
        number: `PR-${year}-0002`,
        year,
        sequence: 2,
        clientId: 1,
        propertyId: 1,
        subject: 'Sgombero cantina condominiale – via Roma 2',
        status: QuoteStatus.ACCETTATO,
        acceptedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        locale: 'it',
        createdById: adminUser.id,
        subtotalCents: 85000,
        vatTotalCents: 6885,
        totalCents: 91885,
        lines: {
          create: [
            {
              position: 1,
              description: 'Ore lavoro sgombero',
              quantity: 8,
              unit: 'h',
              unitPriceCents: 8500,
              discountCents: 0,
              vatCode: 'STANDARD',
              netAmountCents: 68000,
              vatAmountCents: 5510,
              totalAmountCents: 73510,
            },
            {
              position: 2,
              description: 'Smaltimento materiali',
              quantity: 1,
              unit: 'Forfait',
              unitPriceCents: 17000,
              discountCents: 0,
              vatCode: 'STANDARD',
              netAmountCents: 17000,
              vatAmountCents: 1375,
              totalAmountCents: 18375,
            },
          ],
        },
      },
    });

    // ── Demo Invoice Drafts ──────────────────────────────────────────────────

    await prisma.numberingCounter.upsert({
      where: { prefix_year: { prefix: 'BZ', year } },
      update: {},
      create: { prefix: 'BZ', year, current: 3 },
    });

    const now = new Date();
    const due30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // BZ-0001: from existing extra intervention
    await prisma.invoiceDraft.create({
      data: {
        number: `BZ-${year}-0001`,
        year,
        sequence: 1,
        clientId: 1,
        propertyId: 1,
        subject: `Condominio Centro A – intervento extra #${extraIv.id}`,
        status: InvoiceDraftStatus.BOZZA,
        documentDate: now,
        dueDate: due30,
        fromInterventionId: extraIv.id,
        locale: 'it',
        createdById: adminUser.id,
        subtotalCents: 13000,
        vatTotalCents: 1055,
        totalCents: 14055,
        lines: {
          create: [
            {
              position: 1,
              description: 'Ore lavoro – Condominio Centro A',
              quantity: 2,
              unit: 'h',
              unitPriceCents: 6500,
              discountCents: 0,
              vatCode: 'STANDARD',
              source: 'INTERVENTION_HOURS',
              sourceRefId: String(extraIv.id),
              netAmountCents: 13000,
              vatAmountCents: 1055,
              totalAmountCents: 14055,
            },
          ],
        },
      },
    });

    // BZ-0002: from accepted quote (q1)
    await prisma.invoiceDraft.create({
      data: {
        number: `BZ-${year}-0002`,
        year,
        sequence: 2,
        clientId: 1,
        propertyId: 1,
        subject: 'Appartamento Signora Demo, Via Roma 2 – Tinteggio completo',
        status: InvoiceDraftStatus.PRONTO_EXPORT,
        documentDate: now,
        dueDate: due30,
        fromQuoteId: q1.id,
        locale: 'it',
        createdById: adminUser.id,
        subtotalCents: 120000,
        vatTotalCents: 9720,
        totalCents: 129720,
        lines: {
          create: [
            {
              position: 1,
              description: 'Tinteggio pareti soggiorno (45 mq)',
              quantity: 45,
              unit: 'mq',
              unitPriceCents: 1200,
              discountCents: 0,
              vatCode: 'STANDARD',
              source: 'QUOTE_LINE',
              netAmountCents: 54000,
              vatAmountCents: 4375,
              totalAmountCents: 58375,
            },
            {
              position: 2,
              description: 'Tinteggio pareti camera (35 mq)',
              quantity: 35,
              unit: 'mq',
              unitPriceCents: 1200,
              discountCents: 0,
              vatCode: 'STANDARD',
              source: 'QUOTE_LINE',
              netAmountCents: 42000,
              vatAmountCents: 3400,
              totalAmountCents: 45400,
            },
            {
              position: 3,
              description: 'Materiali e attrezzatura',
              quantity: 1,
              unit: 'Forfait',
              unitPriceCents: 24000,
              discountCents: 0,
              vatCode: 'STANDARD',
              source: 'QUOTE_LINE',
              netAmountCents: 24000,
              vatAmountCents: 1945,
              totalAmountCents: 25945,
            },
          ],
        },
      },
    });

    // BZ-0003: manual
    await prisma.invoiceDraft.create({
      data: {
        number: `BZ-${year}-0003`,
        year,
        sequence: 3,
        clientId: 1,
        propertyId: 1,
        subject: 'Lavori a regia – supplemento picchetto notturno',
        status: InvoiceDraftStatus.BOZZA,
        documentDate: now,
        dueDate: due30,
        locale: 'it',
        createdById: adminUser.id,
        subtotalCents: 32500,
        vatTotalCents: 2635,
        totalCents: 35135,
        lines: {
          create: [
            {
              position: 1,
              description: 'Picchetto notturno (5h × tariffa)',
              quantity: 5,
              unit: 'h',
              unitPriceCents: 6500,
              discountCents: 0,
              vatCode: 'STANDARD',
              source: 'MANUAL',
              netAmountCents: 32500,
              vatAmountCents: 2635,
              totalAmountCents: 35135,
            },
          ],
        },
      },
    });
  }

  console.log('🌱 Seed completato con interventi demo');

  // ── AccountingConfig defaults ─────────────────────────────────────────────
  const accountingDefaults = [
    { key: 'account.cassa', value: '1100', description: 'Conto cassa', category: 'ACCOUNT' as const },
    { key: 'account.banca', value: '1020', description: 'Conto banca', category: 'ACCOUNT' as const },
    { key: 'account.clienti', value: '1100', description: 'Conto clienti', category: 'ACCOUNT' as const },
    { key: 'account.ricavi.default', value: '3200', description: 'Ricavi default', category: 'ACCOUNT' as const },
    { key: 'account.ricavi.EXTRA', value: '3200', description: 'Ricavi extra', category: 'ACCOUNT' as const },
    { key: 'account.ricavi.PICCHETTO', value: '3210', description: 'Ricavi picchetto', category: 'ACCOUNT' as const },
    { key: 'account.ricavi.REGIA', value: '3220', description: 'Ricavi regia', category: 'ACCOUNT' as const },
    { key: 'account.ricavi.FORFAIT', value: '3200', description: 'Ricavi forfait', category: 'ACCOUNT' as const },
    { key: 'account.ricavi.STRAORDINARIO', value: '3200', description: 'Ricavi straordinario', category: 'ACCOUNT' as const },
    { key: 'account.ricavi.TRASFERTA', value: '3300', description: 'Ricavi trasferta', category: 'ACCOUNT' as const },
    { key: 'account.ricavi.EMERGENZA', value: '3210', description: 'Ricavi emergenza', category: 'ACCOUNT' as const },
    { key: 'account.materiali', value: '3400', description: 'Ricavi materiali', category: 'ACCOUNT' as const },
    { key: 'vat.STANDARD', value: 'IP81', description: 'IVA standard 8.1%', category: 'VAT_CODE' as const },
    { key: 'vat.RIDOTTA', value: 'IP26', description: 'IVA ridotta 2.6%', category: 'VAT_CODE' as const },
    { key: 'vat.ALLOGGIO', value: 'IP38', description: 'IVA alloggio 3.8%', category: 'VAT_CODE' as const },
    { key: 'vat.ESENTE', value: 'IP00', description: 'IVA esente', category: 'VAT_CODE' as const },
    { key: 'costCenter.EXTRA', value: 'EXTRA', description: 'Centro di costo Extra', category: 'COST_CENTER' as const },
    { key: 'costCenter.PICCHETTO', value: 'PICCHETTO', description: 'Centro di costo Picchetto', category: 'COST_CENTER' as const },
    { key: 'costCenter.REGIA', value: 'REGIA', description: 'Centro di costo Regia', category: 'COST_CENTER' as const },
    { key: 'costCenter.FORFAIT', value: 'FORFAIT', description: 'Centro di costo Forfait', category: 'COST_CENTER' as const },
    { key: 'costCenter.STRAORDINARIO', value: 'STRAORDINARIO', description: 'Centro di costo Straordinario', category: 'COST_CENTER' as const },
    { key: 'costCenter.EMERGENZA', value: 'EMERGENZA', description: 'Centro di costo Emergenza', category: 'COST_CENTER' as const },
    { key: 'costCenter.TRASFERTA', value: 'TRASFERTA', description: 'Centro di costo Trasferta', category: 'COST_CENTER' as const },
    { key: 'costCenter.ORDINARIO', value: 'ORDINARIO', description: 'Centro di costo Ordinario', category: 'COST_CENTER' as const },
    { key: 'general.currency', value: 'CHF', description: 'Valuta', category: 'GENERAL' as const },
    { key: 'general.dateFormat', value: 'DD.MM.YYYY', description: 'Formato data', category: 'GENERAL' as const },
    { key: 'general.csvSeparator', value: ';', description: 'Separatore CSV', category: 'GENERAL' as const },
    { key: 'general.csvEncoding', value: 'utf-8-bom', description: 'Encoding CSV', category: 'GENERAL' as const },
  ];

  for (const config of accountingDefaults) {
    await prisma.accountingConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.log('🌱 AccountingConfig defaults seeded');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
