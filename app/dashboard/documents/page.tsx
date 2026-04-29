import { Prisma } from '@prisma/client';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableCell, TableHead } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { uploadIncomingDocument } from '@/lib/actions/incomingDocuments';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const TYPE_LABELS: Record<string, string> = {
  FATTURA_FORNITORE: 'Fattura fornitore',
  RICEVUTA: 'Ricevuta',
  BOLLA_CONSEGNA: 'Bolla di consegna',
  PREVENTIVO_RICEVUTO: 'Preventivo ricevuto',
};

const STATUS_LABELS: Record<string, string> = {
  DA_VALIDARE: 'Da validare',
  VALIDATO: 'Validato',
  PRONTO_EXPORT: 'Pronto export',
  SCARTATO: 'Scartato',
};

const STATUS_COLORS: Record<string, string> = {
  DA_VALIDARE: 'bg-amber-100 text-amber-800',
  VALIDATO: 'bg-blue-100 text-blue-700',
  PRONTO_EXPORT: 'bg-green-100 text-green-700',
  SCARTATO: 'bg-slate-200 text-slate-600',
};

interface SearchParams {
  status?: string;
  type?: string;
  q?: string;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);
  const params = await searchParams;

  const where: Prisma.IncomingDocumentWhereInput = {};
  if (params.status) where.status = params.status as Prisma.IncomingDocumentWhereInput['status'];
  if (params.type) where.type = params.type as Prisma.IncomingDocumentWhereInput['type'];
  if (params.q) {
    where.OR = [
      { supplierName: { contains: params.q } },
      { docNumber: { contains: params.q } },
      { iban: { contains: params.q } },
      { notes: { contains: params.q } },
    ];
  }

  const [documents, clients] = await Promise.all([
    prisma.incomingDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { businessName: true } },
        property: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      take: 200,
    }),
    prisma.client.findMany({
      orderBy: { businessName: 'asc' },
      select: { id: true, businessName: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Documenti in entrata</h1>
        <a
          href={`/api/documents/export.csv${params.status ? `?status=${params.status}` : ''}`}
          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
          Scarica CSV
        </a>
      </div>

      <Card>
        <h2 className="mb-3 text-base font-semibold">Carica nuovo documento</h2>
        <form
          action={uploadIncomingDocument}
          encType="multipart/form-data"
          className="grid gap-3 md:grid-cols-3"
        >
          <div>
            <Label>Tipo documento</Label>
            <Select name="type" required defaultValue="FATTURA_FORNITORE">
              <option value="FATTURA_FORNITORE">Fattura fornitore</option>
              <option value="RICEVUTA">Ricevuta</option>
              <option value="BOLLA_CONSEGNA">Bolla di consegna</option>
              <option value="PREVENTIVO_RICEVUTO">Preventivo ricevuto</option>
            </Select>
          </div>
          <div>
            <Label>File (PDF o immagine)</Label>
            <Input type="file" name="file" accept="image/*,application/pdf" required />
          </div>
          <div>
            <Label>Cliente collegato (opz.)</Label>
            <Select name="clientId" defaultValue="">
              <option value="">— Nessuno —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label>Note operative</Label>
            <Textarea name="notes" placeholder="Es. fattura riferita a intervento extra del 12.04" />
          </div>
          <div className="md:col-span-3">
            <Button type="submit">Carica e processa con OCR</Button>
            <p className="mt-2 text-xs text-slate-500">
              Max 10 MB. Se Mindee non è configurato, il documento viene archiviato comunque con
              dati demo per la validazione manuale.
            </p>
          </div>
        </form>
      </Card>

      <Card>
        <form className="mb-3 flex flex-wrap items-end gap-3" method="get">
          <div>
            <Label>Stato</Label>
            <Select name="status" defaultValue={params.status ?? ''}>
              <option value="">Tutti</option>
              <option value="DA_VALIDARE">Da validare</option>
              <option value="VALIDATO">Validati</option>
              <option value="PRONTO_EXPORT">Pronti export</option>
              <option value="SCARTATO">Scartati</option>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select name="type" defaultValue={params.type ?? ''}>
              <option value="">Tutti</option>
              <option value="FATTURA_FORNITORE">Fattura fornitore</option>
              <option value="RICEVUTA">Ricevuta</option>
              <option value="BOLLA_CONSEGNA">Bolla consegna</option>
              <option value="PREVENTIVO_RICEVUTO">Preventivo ricevuto</option>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label>Ricerca</Label>
            <Input name="q" defaultValue={params.q ?? ''} placeholder="Fornitore, numero, IBAN…" />
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
              <TableHead>Fornitore</TableHead>
              <TableHead>Numero</TableHead>
              <TableHead>Totale</TableHead>
              <TableHead>Cliente / Stabile</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Azioni</TableHead>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 && (
              <tr>
                <TableCell colSpan={8} className="py-6 text-center text-slate-500">
                  Nessun documento trovato.
                </TableCell>
              </tr>
            )}
            {documents.map((doc) => (
              <tr key={doc.id}>
                <TableCell>
                  {doc.docDate
                    ? new Date(doc.docDate).toLocaleDateString('it-CH')
                    : new Date(doc.createdAt).toLocaleDateString('it-CH')}
                </TableCell>
                <TableCell>{TYPE_LABELS[doc.type] ?? doc.type}</TableCell>
                <TableCell>{doc.supplierName ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs">{doc.docNumber ?? '—'}</TableCell>
                <TableCell className="text-right font-mono">
                  {doc.totalCents != null
                    ? `${doc.currency ?? 'CHF'} ${(doc.totalCents / 100).toLocaleString('de-CH', {
                        minimumFractionDigits: 2,
                      })}`
                    : '—'}
                </TableCell>
                <TableCell>
                  {doc.client?.businessName ?? '—'}
                  {doc.property?.name ? ` · ${doc.property.name}` : ''}
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[doc.status]}>
                    {STATUS_LABELS[doc.status] ?? doc.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/documents/${doc.id}`}>
                    <Button size="sm" variant="outline">
                      Apri
                    </Button>
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
