import { Prisma } from '@prisma/client';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableCell, TableHead } from '@/components/ui/table';
import { requireRole } from '@/lib/auth';
import { isResendConfigured, isSafetyGuardActive } from '@/lib/email/provider';
import { prisma } from '@/lib/prisma';

const TYPE_LABELS: Record<string, string> = {
  INTERVENTION_REPORT: 'Rapporto intervento',
  QUOTE: 'Preventivo',
};

const STATUS_COLORS: Record<string, string> = {
  INVIATO: 'bg-green-100 text-green-700',
  FALLITO: 'bg-red-100 text-red-700',
};

interface SearchParams {
  type?: string;
  status?: string;
}

function referenceLink(type: string, refId: string): string | null {
  if (type === 'INTERVENTION_REPORT') return `/dashboard/interventions/${refId}`;
  if (type === 'QUOTE') return `/dashboard/quotes/${refId}`;
  return null;
}

export default async function EmailLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);
  const params = await searchParams;

  const where: Prisma.EmailLogWhereInput = {};
  if (params.type) where.type = params.type as Prisma.EmailLogWhereInput['type'];
  if (params.status) where.status = params.status as Prisma.EmailLogWhereInput['status'];

  const logs = await prisma.emailLog.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    include: {
      sentBy: { select: { firstName: true, lastName: true } },
    },
    take: 100,
  });

  const resendOk = isResendConfigured();
  const safetyOn = isSafetyGuardActive();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Log invii email</h1>
        <p className="text-sm text-slate-500">Ultimi 100 invii (rapporti intervento, preventivi).</p>
      </div>

      {!resendOk && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠ <strong>RESEND_API_KEY non configurata</strong>: gli invii passano dal mock e
          non arrivano davvero. Ok in dev/CI, ma da configurare in produzione.
        </div>
      )}
      {safetyOn && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          🛡 <strong>SAFE_EMAIL_ONLY attivo</strong>: gli invii fuori dalla allow-list vengono
          bloccati e loggati come FALLITO.
        </div>
      )}

      <Card>
        <form className="mb-3 flex flex-wrap items-end gap-3" method="get">
          <div>
            <Label>Tipo</Label>
            <Select name="type" defaultValue={params.type ?? ''}>
              <option value="">Tutti</option>
              <option value="INTERVENTION_REPORT">Rapporto intervento</option>
              <option value="QUOTE">Preventivo</option>
            </Select>
          </div>
          <div>
            <Label>Stato</Label>
            <Select name="status" defaultValue={params.status ?? ''}>
              <option value="">Tutti</option>
              <option value="INVIATO">Inviato</option>
              <option value="FALLITO">Fallito</option>
            </Select>
          </div>
          <Button type="submit" variant="outline">
            Filtra
          </Button>
        </form>

        <Table>
          <thead>
            <tr>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Riferimento</TableHead>
              <TableHead>Destinatario</TableHead>
              <TableHead>Oggetto</TableHead>
              <TableHead>Lingua</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Inviato da</TableHead>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <TableCell colSpan={8} className="py-6 text-center text-slate-500">
                  Nessun invio registrato.
                </TableCell>
              </tr>
            )}
            {logs.map((log) => {
              const link = referenceLink(log.type, log.referenceId);
              return (
                <tr key={log.id}>
                  <TableCell>{new Date(log.sentAt).toLocaleString('it-CH')}</TableCell>
                  <TableCell>{TYPE_LABELS[log.type] ?? log.type}</TableCell>
                  <TableCell>
                    {link ? (
                      <Link href={link} className="text-blue-600 underline">
                        {log.referenceId}
                      </Link>
                    ) : (
                      log.referenceId
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.recipientEmail}</TableCell>
                  <TableCell className="max-w-md truncate">{log.subject}</TableCell>
                  <TableCell>{log.locale}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[log.status]}>{log.status}</Badge>
                    {log.errorMessage && (
                      <p className="mt-1 text-xs text-red-600">{log.errorMessage}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.sentBy.firstName} {log.sentBy.lastName}
                  </TableCell>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
