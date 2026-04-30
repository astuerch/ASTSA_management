'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessRole } from '@/lib/permissions';
import { calculateDurationMinutes } from '@/lib/time';
import { notifyInterventionExtraClosed } from '@/lib/email/notifications';
import { WorkType, InterventionStatus, PhotoKind } from '@prisma/client';

// ─── Internal Zod Schemas ────────────────────────────────────────────────────

const startInterventionSchema = z.object({
  propertyId: z.coerce.number().int().positive('Stabile obbligatorio'),
  workType: z.nativeEnum(WorkType),
  workerIds: z.array(z.coerce.number().int().positive()).default([]),
  startLat: z.coerce.number().optional(),
  startLng: z.coerce.number().optional(),
  startAccuracy: z.coerce.number().optional(),
});

const stopInterventionSchema = z.object({
  notes: z.string().optional(),
  anomaly: z.string().optional(),
  clientSignatureUrl: z.string().optional(),
  clientSignerName: z.string().optional(),
  endLat: z.coerce.number().optional(),
  endLng: z.coerce.number().optional(),
});

const addPhotoSchema = z.object({
  url: z.string().min(1),
  publicId: z.string().optional(),
  kind: z.nativeEnum(PhotoKind),
});

const addMaterialSchema = z.object({
  materialId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().positive(),
  notes: z.string().optional(),
});

const updateHoursSchema = z.object({
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non autenticato');
  return session.user;
}

// ─── Actions ────────────────────────────────────────────────────────────────

export async function startIntervention(formData: FormData) {
  const user = await getCurrentUser();
  const userId = parseInt(user.id, 10);

  const parsed = startInterventionSchema.safeParse({
    propertyId: formData.get('propertyId'),
    workType: formData.get('workType'),
    workerIds: formData.getAll('workerIds'),
    startLat: formData.get('startLat') ?? undefined,
    startLng: formData.get('startLng') ?? undefined,
    startAccuracy: formData.get('startAccuracy') ?? undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  const data = parsed.data;

  // Check if user already has an open intervention
  const existing = await prisma.intervention.findFirst({
    where: {
      status: InterventionStatus.IN_CORSO,
      workers: { some: { userId } },
    },
  });
  if (existing) throw new Error('Hai già un intervento aperto');

  // Determine all workers (current user + selected colleagues, unique)
  const allWorkerIds = Array.from(new Set([userId, ...data.workerIds]));

  const EXTRA_TYPES: WorkType[] = [
    WorkType.EXTRA,
    WorkType.TRASFERTA,
    WorkType.REGIA,
    WorkType.FORFAIT,
    WorkType.STRAORDINARIO,
    WorkType.PICCHETTO,
    WorkType.EMERGENZA,
  ];
  const isExtra = EXTRA_TYPES.includes(data.workType);

  const intervention = await prisma.intervention.create({
    data: {
      propertyId: data.propertyId,
      createdByUserId: userId,
      workType: data.workType,
      interventionType: isExtra ? 'EXTRA' : 'ORDINARY',
      status: InterventionStatus.IN_CORSO,
      startedAt: new Date(),
      isExtra,
      isBillableExtra: isExtra,
      startLat: data.startLat,
      startLng: data.startLng,
      startAccuracy: data.startAccuracy,
      workers: {
        create: allWorkerIds.map((wid) => ({
          userId: wid,
          isLead: wid === userId,
        })),
      },
    },
  });

  revalidatePath('/work');
  return intervention;
}

export async function stopIntervention(interventionId: number, formData: FormData) {
  const user = await getCurrentUser();
  const userId = parseInt(user.id, 10);

  const parsed = stopInterventionSchema.safeParse({
    notes: formData.get('notes') ?? undefined,
    anomaly: formData.get('anomaly') ?? undefined,
    clientSignatureUrl: formData.get('clientSignatureUrl') ?? undefined,
    clientSignerName: formData.get('clientSignerName') ?? undefined,
    endLat: formData.get('endLat') ?? undefined,
    endLng: formData.get('endLng') ?? undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  const data = parsed.data;

  const intervention = await prisma.intervention.findUnique({
    where: { id: interventionId },
    include: { workers: true },
  });
  if (!intervention) throw new Error('Intervento non trovato');
  if (intervention.status !== InterventionStatus.IN_CORSO) {
    throw new Error('Intervento non in corso');
  }

  // Only lead worker or admin/direzione can stop
  const isLead = intervention.workers.some((w) => w.userId === userId && w.isLead);
  const isAdmin = canAccessRole(user.role, ['AMMINISTRAZIONE']);
  if (!isLead && !isAdmin) {
    throw new Error('Solo il capointervento o un amministratore può terminare');
  }

  const endedAt = new Date();
  const durationMinutes = intervention.startedAt
    ? calculateDurationMinutes(intervention.startedAt, endedAt)
    : null;

  await prisma.intervention.update({
    where: { id: interventionId },
    data: {
      status: InterventionStatus.COMPLETATO,
      endedAt,
      durationMinutes,
      notes: data.notes,
      anomaly: data.anomaly,
      clientSignatureUrl: data.clientSignatureUrl || null,
      clientSignerName: data.clientSignerName,
      endLat: data.endLat,
      endLng: data.endLng,
    },
  });

  // Auto-trigger Phase 6: alert admin per interventi EXTRA chiusi.
  // Non blocca mai il flusso: notifyInterventionExtraClosed cattura tutti gli errori.
  if (intervention.isExtra) {
    await notifyInterventionExtraClosed(interventionId, userId);
  }

  revalidatePath('/work');
  revalidatePath('/dashboard/interventions');
}

export async function addPhoto(
  interventionId: number,
  url: string,
  kind: PhotoKind,
  publicId?: string,
) {
  const user = await getCurrentUser();
  const userId = parseInt(user.id, 10);

  const parsed = addPhotoSchema.safeParse({ url, kind, publicId });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  await prisma.interventionPhoto.create({
    data: {
      interventionId,
      url: parsed.data.url,
      publicId: parsed.data.publicId,
      kind: parsed.data.kind,
      photoType: kind === PhotoKind.PRIMA ? 'BEFORE' : kind === PhotoKind.DOPO ? 'AFTER' : 'OTHER',
      uploadedById: userId,
    },
  });

  revalidatePath(`/dashboard/interventions/${interventionId}`);
}

export async function addMaterial(interventionId: number, formData: FormData) {
  const user = await getCurrentUser();

  const parsed = addMaterialSchema.safeParse({
    materialId: formData.get('materialId'),
    quantity: formData.get('quantity'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  const data = parsed.data;

  const material = await prisma.material.findUnique({ where: { id: data.materialId } });
  if (!material) throw new Error('Materiale non trovato');

  // Check if already added
  const existing = await prisma.interventionMaterial.findFirst({
    where: { interventionId, materialId: data.materialId },
  });

  if (existing) {
    await prisma.interventionMaterial.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + data.quantity },
    });
  } else {
    await prisma.interventionMaterial.create({
      data: {
        interventionId,
        materialId: data.materialId,
        quantity: data.quantity,
        unitCostCents: material.unitCostCents,
        notes: data.notes,
      },
    });
  }

  revalidatePath('/work/materials');
  revalidatePath(`/dashboard/interventions/${interventionId}`);
  // suppress unused warning
  void user;
}

export async function validateIntervention(interventionId: number) {
  const user = await getCurrentUser();
  const userId = parseInt(user.id, 10);

  if (!canAccessRole(user.role, ['AMMINISTRAZIONE'])) {
    throw new Error('Permesso negato');
  }

  const intervention = await prisma.intervention.findUnique({
    where: { id: interventionId },
  });
  if (!intervention) throw new Error('Intervento non trovato');
  if (intervention.status === InterventionStatus.IN_CORSO) {
    throw new Error('Impossibile validare un intervento in corso');
  }

  const newStatus = intervention.isExtra
    ? InterventionStatus.PRONTO_FATTURA
    : InterventionStatus.VALIDATO;

  await prisma.intervention.update({
    where: { id: interventionId },
    data: {
      status: newStatus,
      validatedById: userId,
      validatedAt: new Date(),
      validatedByOffice: true,
      readyForSage: intervention.isExtra,
    },
  });

  revalidatePath('/dashboard/interventions');
  revalidatePath(`/dashboard/interventions/${interventionId}`);
}

export async function updateInterventionHours(interventionId: number, formData: FormData) {
  const user = await getCurrentUser();
  const userId = parseInt(user.id, 10);

  if (!canAccessRole(user.role, ['AMMINISTRAZIONE'])) {
    throw new Error('Solo gli amministratori possono correggere le ore');
  }

  const parsed = updateHoursSchema.safeParse({
    startedAt: formData.get('startedAt'),
    endedAt: formData.get('endedAt'),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  const data = parsed.data;

  const intervention = await prisma.intervention.findUnique({
    where: { id: interventionId },
  });
  if (!intervention) throw new Error('Intervento non trovato');

  const newStartedAt = new Date(data.startedAt);
  const newEndedAt = new Date(data.endedAt);
  if (newEndedAt <= newStartedAt) throw new Error('Orario fine deve essere dopo inizio');

  const newDuration = calculateDurationMinutes(newStartedAt, newEndedAt);

  // Audit log entries
  await prisma.$transaction([
    ...(intervention.startedAt && intervention.startedAt.toISOString() !== newStartedAt.toISOString()
      ? [
          prisma.interventionAuditLog.create({
            data: {
              interventionId,
              userId,
              changedField: 'startedAt',
              oldValue: intervention.startedAt.toISOString(),
              newValue: newStartedAt.toISOString(),
            },
          }),
        ]
      : []),
    ...(intervention.endedAt && intervention.endedAt.toISOString() !== newEndedAt.toISOString()
      ? [
          prisma.interventionAuditLog.create({
            data: {
              interventionId,
              userId,
              changedField: 'endedAt',
              oldValue: intervention.endedAt.toISOString(),
              newValue: newEndedAt.toISOString(),
            },
          }),
        ]
      : []),
    prisma.intervention.update({
      where: { id: interventionId },
      data: {
        startedAt: newStartedAt,
        endedAt: newEndedAt,
        durationMinutes: newDuration,
      },
    }),
  ]);

  revalidatePath('/dashboard/interventions');
  revalidatePath(`/dashboard/interventions/${interventionId}`);
}
