import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableCell, TableHead } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { markAsSent, markAsAccepted, markAsRejected, deleteQuote, convertToInvoiceDraft } from '@/lib/actions/quotes';
import { sendQuoteEmail } from '@/lib/actions/emails';
import { SendEmailForm } from '@/components/email/send-email-form';
import { redirect } from 'next/navigation';

const STATUS_COLORS: Record<string, string> = {
  BOZZA: 'bg-gray-100 text-gray-700',
  INVIATO: 'bg-blue-100 text-blue-700',
  ACCETTATO: 'bg-green-100 text-green-700',
  RIFIUTATO: 'bg-red-100 text-red-700',
  SCADUTO: 'bg-orange-100 text-orange-700',
};

const STATUS_LABELS: Record<string, string> = {
  BOZZA: 'Bozza',
  INVIATO: 'Inviato',
  ACCETTATO: 'Accettato',
  RIFIUTATO: 'Rifiutato',
  SCADUTO: 'Scaduto',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function QuoteDetailPage({ params }: Props) {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);
  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      client: true,
      property: true,
      lines: { orderBy: { position: 'asc' } },
      createdBy: true,
    },
  });

  if (!quote) notFound();

  const isBozza = quote.status === 'BOZZA';
  const isInviato = quote.status === 'INVIATO';
  const isAccettato = quote.status === 'ACCETTATO';
  const canConvert = isAccettato && !quote.convertedToInvoiceId;

  async function handleMarkSent(formData: FormData) {
    'use server';
    await markAsSent(String(formData.get('id')));
  }

  async function handleMarkAccepted(formData: FormData) {
    'use server';
    await markAsAccepted(String(formData.get('id')));
  }

  async function handleMarkRejected(formData: FormData) {
    'use server';
    await markAsRejected(String(formData.get('id')));
  }

  async function handleDelete(formData: FormData) {
    'use server';
    await deleteQuote(String(formData.get('id')));
    redirect('/dashboard/quotes');
  }

  async function handleConvert(formData: FormData) {
    'use server';
    const inv = await convertToInvoiceDraft(String(formData.get('id')));
    redirect(`/dashboard/invoices/${inv.id}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/dashboard/quotes">
          <Button className="bg-gray-200 text-gray-800 hover:bg-gray-300 text-sm">← Preventivi</Button>
        </Link>
        <h1 className="text-xl font-semibold">{quote.number}</h1>
        <Badge className={STATUS_COLORS[quote.status]}>{STATUS_LABELS[quote.status]}</Badge>
        {quote.convertedToInvoiceId && (
          <Link href={`/dashboard/invoices/${quote.convertedToInvoiceId}`}>
            <Badge className="bg-purple-100 text-purple-700 cursor-pointer">→ Bozza fattura</Badge>
          </Link>
        )}
      </div>

      {/* Workflow buttons */}
      <div className="flex gap-2 flex-wrap">
        {isBozza && (
          <form action={handleMarkSent}>
            <input type="hidden" name="id" value={quote.id} />
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-sm">
              Marca come inviato
            </Button>
          </form>
        )}
        {isInviato && (
          <>
            <form action={handleMarkAccepted}>
              <input type="hidden" name="id" value={quote.id} />
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-sm">
                Marca accettato
              </Button>
            </form>
            <form action={handleMarkRejected}>
              <input type="hidden" name="id" value={quote.id} />
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-sm">
                Marca rifiutato
              </Button>
            </form>
          </>
        )}
        {canConvert && (
          <form action={handleConvert}>
            <input type="hidden" name="id" value={quote.id} />
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-sm">
              Trasforma in bozza fattura
            </Button>
          </form>
        )}
        {isBozza && (
          <form action={handleDelete} onSubmit={(e) => { if (!confirm('Eliminare preventivo?')) e.preventDefault(); }}>
            <input type="hidden" name="id" value={quote.id} />
            <Button type="submit" className="bg-red-600 hover:bg-red-700 text-sm">Elimina</Button>
          </form>
        )}
      </div>

      <SendEmailForm
        action={sendQuoteEmail}
        hiddenFields={{ quoteId: quote.id }}
        defaultRecipient={quote.client.billingEmail}
        buttonLabel="Invia preventivo al cliente"
      />

      {/* Warning for missing sage customer number */}
      {!quote.client.sageCustomerNumber && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          ⚠ Imposta numero cliente Sage prima dell&apos;export Infoniqa (PR #6).
        </div>
      )}

      {/* Document info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-600">Informazioni documento</h2>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2"><span className="w-32 text-gray-500">Numero</span><span className="font-mono font-semibold">{quote.number}</span></div>
            <div className="flex gap-2"><span className="w-32 text-gray-500">Data creazione</span><span>{new Date(quote.createdAt).toLocaleDateString('it-CH')}</span></div>
            {quote.validUntil && (
              <div className="flex gap-2"><span className="w-32 text-gray-500">Valido fino al</span><span>{new Date(quote.validUntil).toLocaleDateString('it-CH')}</span></div>
            )}
            <div className="flex gap-2"><span className="w-32 text-gray-500">Lingua</span><span>{quote.locale === 'de-ch' ? 'Tedesco (CH)' : 'Italiano'}</span></div>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-600">Cliente</h2>
          <div className="space-y-1 text-sm">
            <p className="font-semibold">{quote.client.businessName}</p>
            {quote.client.address && <p className="text-gray-600">{quote.client.address}</p>}
            {quote.client.sageCustomerNumber && (
              <p className="text-gray-500 text-xs">No. cliente Sage: {quote.client.sageCustomerNumber}</p>
            )}
            {quote.property && (
              <p className="text-gray-600 text-xs mt-1">Stabile: {quote.property.name}</p>
            )}
          </div>
        </Card>
      </div>

      {/* Subject + notes */}
      <Card>
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Oggetto</h2>
        <p className="text-sm">{quote.subject}</p>
        {quote.notes && <p className="mt-2 text-sm text-gray-500">{quote.notes}</p>}
      </Card>

      {/* Lines table */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-600">Righe preventivo</h2>
        <Table>
          <thead>
            <tr>
              <TableHead>#</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead className="text-right">Qtà</TableHead>
              <TableHead>Unità</TableHead>
              <TableHead className="text-right">Prezzo</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Importo CHF</TableHead>
            </tr>
          </thead>
          <tbody>
            {quote.lines.map((line) => (
              <tr key={line.id}>
                <TableCell>{line.position}</TableCell>
                <TableCell>{line.description}</TableCell>
                <TableCell className="text-right font-mono">{line.quantity}</TableCell>
                <TableCell>{line.unit}</TableCell>
                <TableCell className="text-right font-mono">{(line.unitPriceCents / 100).toFixed(2)}</TableCell>
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
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Totale netto</span><span className="font-mono">{(quote.subtotalCents / 100).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">IVA</span><span className="font-mono">{(quote.vatTotalCents / 100).toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-1 font-semibold"><span>Totale CHF</span><span className="font-mono">{(quote.totalCents / 100).toFixed(2)}</span></div>
          </div>
        </div>
      </Card>
    </div>
  );
}
