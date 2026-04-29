import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableCell, TableHead } from '@/components/ui/table';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { BatchActions } from './BatchActions';

const STATUS_LABELS: Record<string, string> = {
  GENERATED: 'Generato',
  CONFIRMED_IMPORT: 'Importato in Infoniqa',
  CANCELLED: 'Annullato',
};

const STATUS_COLORS: Record<string, string> = {
  GENERATED: 'bg-blue-100 text-blue-700',
  CONFIRMED_IMPORT: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default async function SageExportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);
  const { id } = await params;

  const batch = await prisma.sageExport.findUnique({
    where: { id },
    include: {
      exportedBy: true,
      importedBy: true,
      invoices: {
        include: { client: true },
        orderBy: { number: 'asc' },
      },
    },
  });

  if (!batch) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Batch {batch.batchNumber}</h1>
          <p className="text-sm text-gray-500">
            Esportato il {new Date(batch.exportedAt).toLocaleDateString('it-CH')} da{' '}
            {batch.exportedBy.firstName} {batch.exportedBy.lastName}
          </p>
        </div>
        <Badge className={STATUS_COLORS[batch.status]}>
          {STATUS_LABELS[batch.status] ?? batch.status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="bg-gray-50 rounded p-3">
          <div className="text-gray-500">Fatture</div>
          <div className="font-semibold text-lg">{batch.invoiceCount}</div>
        </div>
        <div className="bg-gray-50 rounded p-3">
          <div className="text-gray-500">Totale CHF</div>
          <div className="font-mono font-semibold text-lg">
            {(batch.totalAmountCents / 100).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-gray-50 rounded p-3">
          <div className="text-gray-500">File CSV</div>
          <div className="font-mono text-xs truncate">{batch.csvFileName}</div>
        </div>
      </div>

      {batch.status === 'CONFIRMED_IMPORT' && batch.importedBy && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
          Import confermato il {new Date(batch.importedAt!).toLocaleDateString('it-CH')} da{' '}
          {batch.importedBy.firstName} {batch.importedBy.lastName}
        </div>
      )}

      {batch.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
          Note: {batch.notes}
        </div>
      )}

      <BatchActions batchId={batch.id} batchNumber={batch.batchNumber} status={batch.status} />

      <Card>
        <div className="p-4 border-b">
          <h2 className="font-semibold">Fatture incluse ({batch.invoices.length})</h2>
        </div>
        <Table>
          <thead>
            <tr>
              <TableHead>Numero</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Oggetto</TableHead>
              <TableHead>Totale CHF</TableHead>
              <TableHead>Stato</TableHead>
            </tr>
          </thead>
          <tbody>
            {batch.invoices.map((inv) => (
              <tr key={inv.id}>
                <TableCell>
                  <span className="font-mono text-sm font-semibold">{inv.number}</span>
                </TableCell>
                <TableCell>{inv.client.businessName}</TableCell>
                <TableCell className="max-w-xs truncate">{inv.subject}</TableCell>
                <TableCell className="text-right font-mono">
                  {(inv.totalCents / 100).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Badge className="bg-purple-100 text-purple-700 text-xs">{inv.status}</Badge>
                </TableCell>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
