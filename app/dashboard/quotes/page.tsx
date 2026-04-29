import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableCell, TableHead } from '@/components/ui/table';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const STATUS_LABELS: Record<string, string> = {
  BOZZA: 'Bozza',
  INVIATO: 'Inviato',
  ACCETTATO: 'Accettato',
  RIFIUTATO: 'Rifiutato',
  SCADUTO: 'Scaduto',
};

const STATUS_COLORS: Record<string, string> = {
  BOZZA: 'bg-gray-100 text-gray-700',
  INVIATO: 'bg-blue-100 text-blue-700',
  ACCETTATO: 'bg-green-100 text-green-700',
  RIFIUTATO: 'bg-red-100 text-red-700',
  SCADUTO: 'bg-orange-100 text-orange-700',
};

export default async function QuotesPage() {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);

  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: 'desc' },
    include: { client: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Preventivi</h1>
        <Link href="/dashboard/quotes/new">
          <Button>+ Nuovo preventivo</Button>
        </Link>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <TableHead>Numero</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Oggetto</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Totale CHF</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Azioni</TableHead>
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 && (
              <tr>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  Nessun preventivo trovato.
                </TableCell>
              </tr>
            )}
            {quotes.map((q) => (
              <tr key={q.id}>
                <TableCell>
                  <span className="font-mono text-sm font-semibold">{q.number}</span>
                </TableCell>
                <TableCell>{q.client.businessName}</TableCell>
                <TableCell className="max-w-xs truncate">{q.subject}</TableCell>
                <TableCell>{new Date(q.createdAt).toLocaleDateString('it-CH')}</TableCell>
                <TableCell className="text-right font-mono">
                  {(q.totalCents / 100).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[q.status]}>
                    {STATUS_LABELS[q.status] ?? q.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/quotes/${q.id}`}>
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
