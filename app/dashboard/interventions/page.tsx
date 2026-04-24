import Link from 'next/link';
import { auth } from '@/lib/auth';
import { canAccessRole } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { InterventionStatus, WorkType } from '@prisma/client';
import { Card } from '@/components/ui/card';
import { Table, TableCell, TableHead } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDuration } from '@/lib/time';

const STATUS_LABELS: Record<InterventionStatus, string> = {
  IN_CORSO: 'In corso',
  COMPLETATO: 'Completato',
  VALIDATO: 'Validato',
  PRONTO_FATTURA: 'Pronto fattura',
};

const STATUS_COLORS: Record<InterventionStatus, string> = {
  IN_CORSO: 'bg-blue-100 text-blue-800',
  COMPLETATO: 'bg-yellow-100 text-yellow-800',
  VALIDATO: 'bg-green-100 text-green-800',
  PRONTO_FATTURA: 'bg-purple-100 text-purple-800',
};

export default async function InterventionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) return null;
  const userId = parseInt(session.user.id, 10);

  const isAdmin = canAccessRole(session.user.role, ['AMMINISTRAZIONE']);
  const isMine = params.mine === 'true' || !isAdmin;

  const where = {
    ...(isMine ? { workers: { some: { userId } } } : {}),
    ...(params.status ? { status: params.status as InterventionStatus } : {}),
    ...(params.workType ? { workType: params.workType as WorkType } : {}),
    ...(params.propertyId ? { propertyId: parseInt(params.propertyId, 10) } : {}),
  };

  const interventions = await prisma.intervention.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      property: { include: { client: true } },
      workers: { include: { user: true } },
    },
  });

  const properties = isAdmin
    ? await prisma.property.findMany({ orderBy: { name: 'asc' } })
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Interventi</h1>
      </div>

      <Card>
        <form className="flex flex-wrap gap-3">
          <select name="status" defaultValue={params.status ?? ''} className="rounded-md border px-2 py-1 text-sm">
            <option value="">Tutti gli stati</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select name="workType" defaultValue={params.workType ?? ''} className="rounded-md border px-2 py-1 text-sm">
            <option value="">Tutti i tipi</option>
            {Object.values(WorkType).map((wt) => (
              <option key={wt} value={wt}>{wt}</option>
            ))}
          </select>
          {isAdmin && (
            <>
              <select name="propertyId" defaultValue={params.propertyId ?? ''} className="rounded-md border px-2 py-1 text-sm">
                <option value="">Tutti gli stabili</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" name="mine" value="true" defaultChecked={isMine} />
                Solo miei
              </label>
            </>
          )}
          <button type="submit" className="rounded-md bg-slate-800 px-3 py-1 text-sm text-white">
            Filtra
          </button>
        </form>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <TableHead>Data</TableHead>
              <TableHead>Stabile / Cliente</TableHead>
              <TableHead>Dipendenti</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Durata</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Azioni</TableHead>
            </tr>
          </thead>
          <tbody>
            {interventions.length === 0 && (
              <tr>
                <TableCell colSpan={7} className="text-center text-slate-500">
                  Nessun intervento trovato
                </TableCell>
              </tr>
            )}
            {interventions.map((iv) => (
              <tr key={iv.id}>
                <TableCell>
                  {iv.startedAt
                    ? iv.startedAt.toLocaleDateString('it-CH')
                    : iv.createdAt.toLocaleDateString('it-CH')}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{iv.property.name}</div>
                  <div className="text-xs text-slate-500">{iv.property.client?.businessName}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {iv.workers.map((w) => `${w.user.firstName} ${w.user.lastName}`).join(', ')}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge>{iv.workType}</Badge>
                </TableCell>
                <TableCell>
                  {iv.durationMinutes != null ? formatDuration(iv.durationMinutes) : '—'}
                </TableCell>
                <TableCell>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[iv.status]}`}>
                    {STATUS_LABELS[iv.status]}
                  </span>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/interventions/${iv.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Dettaglio
                  </Link>
                </TableCell>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
