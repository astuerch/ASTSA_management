import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableCell, TableHead } from '@/components/ui/table';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const STATUS_LABELS: Record<string, string> = {
  GENERATED: 'Generato',
  CONFIRMED_IMPORT: 'Importato',
  CANCELLED: 'Annullato',
};

const STATUS_COLORS: Record<string, string> = {
  GENERATED: 'bg-blue-100 text-blue-700',
  CONFIRMED_IMPORT: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default async function SageExportsPage() {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);

  const exports = await prisma.sageExport.findMany({
    orderBy: { exportedAt: 'desc' },
    include: { exportedBy: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Export batch Infoniqa</h1>
        <Link href="/dashboard/sage/exports/new">
          <Button>+ Nuovo export</Button>
        </Link>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <TableHead>Batch</TableHead>
              <TableHead>Data export</TableHead>
              <TableHead>Fatture</TableHead>
              <TableHead>Totale CHF</TableHead>
              <TableHead>Esportato da</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Azioni</TableHead>
            </tr>
          </thead>
          <tbody>
            {exports.length === 0 && (
              <tr>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  Nessun export trovato.
                </TableCell>
              </tr>
            )}
            {exports.map((exp) => (
              <tr key={exp.id}>
                <TableCell>
                  <span className="font-mono text-sm font-semibold">{exp.batchNumber}</span>
                </TableCell>
                <TableCell>{new Date(exp.exportedAt).toLocaleDateString('it-CH')}</TableCell>
                <TableCell className="text-center">{exp.invoiceCount}</TableCell>
                <TableCell className="text-right font-mono">
                  {(exp.totalAmountCents / 100).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>{exp.exportedBy.firstName} {exp.exportedBy.lastName}</TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[exp.status]}>
                    {STATUS_LABELS[exp.status] ?? exp.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/sage/exports/${exp.id}`}>
                    <Button className="text-xs px-2 py-1 h-7">Dettaglio</Button>
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
