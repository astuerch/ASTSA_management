import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableCell, TableHead } from '@/components/ui/table';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { markReadyForExport, cancelInvoice } from '@/lib/actions/invoices';
import { OutlookHandoffButton } from '@/components/email/outlook-handoff-button';
import { redirect } from 'next/navigation';

const STATUS_COLORS: Record<string, string> = {
  BOZZA: 'bg-gray-100 text-gray-700',
  PRONTO_EXPORT: 'bg-blue-100 text-blue-700',
  ESPORTATO: 'bg-green-100 text-green-700',
  REGISTRATO_SAGE: 'bg-purple-100 text-purple-700',
  ANNULLATO: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  BOZZA: 'Bozza',
  PRONTO_EXPORT: 'Pronto export',
  ESPORTATO: 'Esportato',
  REGISTRATO_SAGE: 'Registrato Sage',
  ANNULLATO: 'Annullato',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: Props) {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);
  const { id } = await params;

  const invoice = await prisma.invoiceDraft.findUnique({
    where: { id },
    include: {
      client: true,
      property: true,
      lines: { orderBy: { position: 'asc' } },
      createdBy: true,
      fromIntervention: true,
    },
  });

  if (!invoice) notFound();

  const isBozza = invoice.status === 'BOZZA';

  async function handleMarkReady(formData: FormData) {
    'use server';
    await markReadyForExport(String(formData.get('id')));
  }

  async function handleCancel(formData: FormData) {
    'use server';
    await cancelInvoice(String(formData.get('id')));
    redirect('/dashboard/invoices');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/dashboard/invoices">
          <Button className="bg-gray-200 text-gray-800 hover:bg-gray-300 text-sm">← Fatture</Button>
        </Link>
        <h1 className="text-xl font-semibold">{invoice.number}</h1>
        <Badge className={STATUS_COLORS[invoice.status]}>{STATUS_LABELS[invoice.status]}</Badge>
        {invoice.fromQuoteId && (
          <Link href={`/dashboard/quotes/${invoice.fromQuoteId}`}>
            <Badge className="bg-orange-100 text-orange-700 cursor-pointer">Da preventivo</Badge>
          </Link>
        )}
        {invoice.fromIntervention && (
          <Badge className="bg-cyan-100 text-cyan-700">
            Da intervento #{invoice.fromIntervention.id}
          </Badge>
        )}
        {!invoice.fromQuoteId && !invoice.fromInterventionId && (
          <Badge className="bg-gray-100 text-gray-600">Manuale</Badge>
        )}
      </div>

      {/* Workflow buttons */}
      <div className="flex gap-2 flex-wrap">
        {isBozza && (
          <form action={handleMarkReady}>
            <input type="hidden" name="id" value={invoice.id} />
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-sm">
              Marca pronto per export
            </Button>
          </form>
        )}
        {isBozza && (
          <form action={handleCancel} onSubmit={(e) => { if (!confirm('Annullare fattura?')) e.preventDefault(); }}>
            <input type="hidden" name="id" value={invoice.id} />
            <Button type="submit" className="bg-red-600 hover:bg-red-700 text-sm">Annulla</Button>
          </form>
        )}
      </div>

      {(invoice.status === 'PRONTO_EXPORT' ||
        invoice.status === 'ESPORTATO' ||
        invoice.status === 'REGISTRATO_SAGE') && (
        <OutlookHandoffButton
          type="INVOICE_REMINDER"
          id={invoice.id}
          defaultRecipient={invoice.client.billingEmail}
          buttonLabel="Prepara promemoria scadenza per Outlook"
        />
      )}

      {/* Warning for missing sage customer number */}
      {!invoice.client.sageCustomerNumber && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          ⚠ Imposta numero cliente Sage prima dell&apos;export Infoniqa (PR #6).
        </div>
      )}

      {/* Document info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-600">Informazioni documento</h2>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2"><span className="w-36 text-gray-500">Numero</span><span className="font-mono font-semibold">{invoice.number}</span></div>
            <div className="flex gap-2"><span className="w-36 text-gray-500">Data documento</span><span>{new Date(invoice.documentDate).toLocaleDateString('it-CH')}</span></div>
            <div className="flex gap-2">
              <span className="w-36 text-gray-500">Scadenza</span>
              <span className="font-semibold text-orange-600">{new Date(invoice.dueDate).toLocaleDateString('it-CH')}</span>
            </div>
            <div className="flex gap-2"><span className="w-36 text-gray-500">Lingua</span><span>{invoice.locale === 'de-ch' ? 'Tedesco (CH)' : 'Italiano'}</span></div>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-600">Cliente</h2>
          <div className="space-y-1 text-sm">
            <p className="font-semibold">{invoice.client.businessName}</p>
            {invoice.client.address && <p className="text-gray-600">{invoice.client.address}</p>}
            {invoice.client.sageCustomerNumber && (
              <p className="text-gray-500 text-xs">No. cliente Sage: {invoice.client.sageCustomerNumber}</p>
            )}
            {invoice.property && (
              <p className="text-gray-600 text-xs mt-1">Stabile: {invoice.property.name}</p>
            )}
          </div>
        </Card>
      </div>

      {/* Subject */}
      <Card>
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Oggetto</h2>
        <p className="text-sm">{invoice.subject}</p>
        {invoice.notes && <p className="mt-2 text-sm text-gray-500">{invoice.notes}</p>}
      </Card>

      {/* Lines table */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-600">Righe fattura</h2>
        <Table>
          <thead>
            <tr>
              <TableHead>#</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead className="text-right">Qtà</TableHead>
              <TableHead>Unità</TableHead>
              <TableHead className="text-right">Prezzo</TableHead>
              <TableHead className="text-right">Ribasso</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Importo CHF</TableHead>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id} className={line.netAmountCents < 0 ? 'bg-red-50' : ''}>
                <TableCell>{line.position}</TableCell>
                <TableCell>
                  <span>{line.description}</span>
                  {line.source !== 'MANUAL' && (
                    <span className="ml-2 text-xs text-gray-400">({line.source})</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">{line.quantity}</TableCell>
                <TableCell>{line.unit}</TableCell>
                <TableCell className="text-right font-mono">{(line.unitPriceCents / 100).toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono">
                  {line.discountCents > 0 ? (line.discountCents / 100).toFixed(2) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {line.vatCode === 'STANDARD' ? '8.1%' : line.vatCode === 'RIDOTTA' ? '2.6%' : line.vatCode === 'ALLOGGIO' ? '3.8%' : '0%'}
                </TableCell>
                <TableCell className="text-right font-mono">{(line.netAmountCents / 100).toFixed(2)}</TableCell>
              </tr>
            ))}
          </tbody>
        </Table>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-72 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Totale netto CHF</span><span className="font-mono">{(invoice.subtotalCents / 100).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Totale IVA</span><span className="font-mono">{(invoice.vatTotalCents / 100).toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-1 font-bold text-base"><span>Totale incl. IVA CHF</span><span className="font-mono">{(invoice.totalCents / 100).toFixed(2)}</span></div>
          </div>
        </div>
      </Card>
    </div>
  );
}
