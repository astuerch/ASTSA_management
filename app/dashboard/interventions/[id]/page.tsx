import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { canAccessRole } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { InterventionStatus } from '@prisma/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDuration } from '@/lib/time';
import { validateIntervention, updateInterventionHours } from '@/lib/actions/interventions';

const STATUS_LABELS: Record<InterventionStatus, string> = {
  IN_CORSO: 'In corso',
  COMPLETATO: 'Completato',
  VALIDATO: 'Validato',
  PRONTO_FATTURA: 'Pronto fattura',
};

export default async function InterventionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect('/login');

  const isAdmin = canAccessRole(session.user.role, ['AMMINISTRAZIONE']);
  const userId = parseInt(session.user.id, 10);

  const iv = await prisma.intervention.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      property: { include: { client: true } },
      workers: { include: { user: true } },
      photos: { orderBy: { uploadedAt: 'asc' } },
      materials: { include: { material: true } },
      validatedBy: true,
      auditLogs: { include: { user: true }, orderBy: { changedAt: 'desc' } },
    },
  });

  if (!iv) return notFound();

  // Access control: dipendente can only see own interventions
  if (!isAdmin) {
    const isWorker = iv.workers.some((w) => w.userId === userId);
    if (!isWorker) redirect('/dashboard/interventions');
  }

  const totalMaterialCents = iv.materials.reduce(
    (sum, m) => sum + (m.unitCostCents ?? m.material.unitCostCents) * m.quantity,
    0,
  );

  async function handleValidate() {
    'use server';
    await validateIntervention(parseInt(id, 10));
    redirect(`/dashboard/interventions/${id}`);
  }

  async function handleUpdateHours(formData: FormData) {
    'use server';
    await updateInterventionHours(parseInt(id, 10), formData);
    redirect(`/dashboard/interventions/${id}`);
  }

  const hasCoords = iv.startLat != null && iv.startLng != null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{iv.property.name}</h1>
          <p className="text-sm text-slate-500">{iv.property.client?.businessName}</p>
        </div>
        <span className="rounded px-2 py-1 text-sm font-medium bg-slate-100">
          {STATUS_LABELS[iv.status]}
        </span>
      </div>

      {/* Timeline */}
      <Card>
        <h2 className="mb-3 font-semibold">Timeline</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <span className="text-slate-500">Iniziato:</span>{' '}
            {iv.startedAt?.toLocaleString('it-CH') ?? '—'}
          </li>
          <li>
            <span className="text-slate-500">Terminato:</span>{' '}
            {iv.endedAt?.toLocaleString('it-CH') ?? '—'}
          </li>
          <li>
            <span className="text-slate-500">Durata:</span>{' '}
            {iv.durationMinutes != null ? formatDuration(iv.durationMinutes) : '—'}
          </li>
          {iv.validatedAt && (
            <li>
              <span className="text-slate-500">Validato:</span>{' '}
              {iv.validatedAt.toLocaleString('it-CH')} da {iv.validatedBy?.firstName}
            </li>
          )}
        </ul>
      </Card>

      {/* Workers */}
      <Card>
        <h2 className="mb-3 font-semibold">Dipendenti</h2>
        <div className="flex flex-wrap gap-2">
          {iv.workers.map((w) => (
            <Badge key={w.userId}>
              {w.user.firstName} {w.user.lastName} {w.isLead ? '(lead)' : ''}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Notes & Anomaly */}
      {(iv.notes || iv.anomaly || iv.anomalyReport) && (
        <Card>
          {iv.notes && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-slate-500">Note</p>
              <p className="text-sm">{iv.notes}</p>
            </div>
          )}
          {(iv.anomaly || iv.anomalyReport) && (
            <div>
              <p className="text-xs font-semibold text-orange-600">Anomalia</p>
              <p className="text-sm">{iv.anomaly ?? iv.anomalyReport}</p>
            </div>
          )}
        </Card>
      )}

      {/* Photos */}
      {iv.photos.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">Foto ({iv.photos.length})</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {iv.photos.map((photo) => (
              <div key={photo.id} className="relative overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url || photo.filePath || ''} alt={photo.kind} className="h-32 w-full object-cover" />
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-xs text-white">
                  {photo.kind}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Materials */}
      {iv.materials.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">Materiali</h2>
          <div className="space-y-2">
            {iv.materials.map((im) => (
              <div key={im.id} className="flex justify-between text-sm">
                <span>
                  {im.material.name} × {im.quantity} {im.material.unit}
                </span>
                {isAdmin && (
                  <span className="text-slate-500">
                    CHF {(((im.unitCostCents ?? im.material.unitCostCents) * im.quantity) / 100).toFixed(2)}
                  </span>
                )}
              </div>
            ))}
            {isAdmin && (
              <div className="border-t pt-2 font-medium">
                Totale materiali: CHF {(totalMaterialCents / 100).toFixed(2)}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Client Signature */}
      {iv.clientSignatureUrl && (
        <Card>
          <h2 className="mb-3 font-semibold">Firma cliente</h2>
          {iv.clientSignerName && (
            <p className="mb-2 text-sm text-slate-600">Firmato da: {iv.clientSignerName}</p>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={iv.clientSignatureUrl} alt="Firma cliente" className="max-w-xs rounded border" />
        </Card>
      )}

      {/* Map */}
      {hasCoords && (
        <Card>
          <h2 className="mb-3 font-semibold">Posizione GPS</h2>
          <a
            href={`https://www.openstreetmap.org/?mlat=${iv.startLat}&mlon=${iv.startLng}#map=17/${iv.startLat}/${iv.startLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Apri su OpenStreetMap ({iv.startLat?.toFixed(5)}, {iv.startLng?.toFixed(5)})
          </a>
        </Card>
      )}

      {/* Admin Actions */}
      {isAdmin && (
        <Card>
          <h2 className="mb-3 font-semibold">Azioni amministrative</h2>
          <div className="space-y-4">
            {iv.status === InterventionStatus.COMPLETATO && (
              <form action={handleValidate}>
                <Button type="submit" className="h-11 bg-green-600 hover:bg-green-700">
                  ✓ Valida intervento
                </Button>
              </form>
            )}

            <details className="rounded-md border">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                Correggi ore (solo admin)
              </summary>
              <form action={handleUpdateHours} className="space-y-3 p-3">
                <div>
                  <label className="block text-xs text-slate-500">Inizio</label>
                  <input
                    type="datetime-local"
                    name="startedAt"
                    defaultValue={iv.startedAt?.toISOString().slice(0, 16) ?? ''}
                    className="w-full rounded border px-2 py-1 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500">Fine</label>
                  <input
                    type="datetime-local"
                    name="endedAt"
                    defaultValue={iv.endedAt?.toISOString().slice(0, 16) ?? ''}
                    className="w-full rounded border px-2 py-1 text-sm"
                    required
                  />
                </div>
                <Button type="submit" className="h-9 text-sm">
                  Salva correzione
                </Button>
              </form>
            </details>
          </div>
        </Card>
      )}

      {/* Audit Log */}
      {isAdmin && iv.auditLogs.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">Log modifiche ore</h2>
          <div className="space-y-2 text-xs">
            {iv.auditLogs.map((log) => (
              <div key={log.id} className="rounded bg-slate-50 px-3 py-2">
                <span className="font-medium">{log.user.firstName}</span> ha modificato{' '}
                <span className="font-medium">{log.changedField}</span>:{' '}
                <span className="text-slate-500">{log.oldValue}</span> →{' '}
                <span className="text-slate-700">{log.newValue}</span>
                <span className="ml-2 text-slate-400">
                  {log.changedAt.toLocaleString('it-CH')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
