import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableCell, TableHead } from '@/components/ui/table';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const STATUS_LABELS: Record<string, string> = {
  BOZZA: 'Bozza',
  PRONTO_EXPORT: 'Pronto export',
  ESPORTATO: 'Esportato',
  REGISTRATO_SAGE: 'Registrato Sage',
  ANNULLATO: 'Annullato',
};

const STATUS_COLORS: Record<string, string> = {
  BOZZA: 'bg-gray-100 text-gray-700',
  PRONTO_EXPORT: 'bg-blue-100 text-blue-700',
  ESPORTATO: 'bg-green-100 text-green-700',
  REGISTRATO_SAGE: 'bg-purple-100 text-purple-700',
  ANNULLATO: 'bg-red-100 text-red-700',
};

export default async function InvoicesPage() {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);

  const invoices = await prisma.invoiceDraft.findMany({
    orderBy: { createdAt: 'desc' },
    include: { client: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bozze fatture</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/invoices/new">
            <Button>+ Nuova bozza</Button>
          </Link>
        </div>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <TableHead>Numero</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Oggetto</TableHead>
              <TableHead>Data doc.</TableHead>
              <TableHead>Scadenza</TableHead>
              <TableHead>Totale CHF</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Azioni</TableHead>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  Nessuna bozza fattura trovata.
                </TableCell>
              </tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <TableCell>
                  <span className="font-mono text-sm font-semibold">{inv.number}</span>
                </TableCell>
                <TableCell>{inv.client.businessName}</TableCell>
                <TableCell className="max-w-xs truncate">{inv.subject}</TableCell>
                <TableCell>{new Date(inv.documentDate).toLocaleDateString('it-CH')}</TableCell>
                <TableCell>{new Date(inv.dueDate).toLocaleDateString('it-CH')}</TableCell>
                <TableCell className="text-right font-mono">
                  {(inv.totalCents / 100).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[inv.status]}>
                    {STATUS_LABELS[inv.status] ?? inv.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/invoices/${inv.id}`}>
                    <Button className="text-xs px-2 py-1 h-7">Apri</Button>
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
