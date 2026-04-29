import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  discardIncomingDocument,
  getIncomingDocument,
  markReadyForExport,
  updateIncomingDocument,
  validateIncomingDocument,
} from '@/lib/actions/incomingDocuments';
import { requireRole } from '@/lib/auth';
import type { ExtractedDocument } from '@/lib/ocr/types';
import { prisma } from '@/lib/prisma';

const TYPE_LABELS: Record<string, string> = {
  FATTURA_FORNITORE: 'Fattura fornitore',
  RICEVUTA: 'Ricevuta',
  BOLLA_CONSEGNA: 'Bolla consegna',
  PREVENTIVO_RICEVUTO: 'Preventivo ricevuto',
};

const STATUS_LABELS: Record<string, string> = {
  DA_VALIDARE: 'Da validare',
  VALIDATO: 'Validato',
  PRONTO_EXPORT: 'Pronto export',
  SCARTATO: 'Scartato',
};

function confidenceClass(c: number | null): string {
  if (c == null) return 'bg-slate-100 text-slate-600';
  if (c >= 0.85) return 'bg-green-100 text-green-700';
  if (c >= 0.6) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-700';
}

function confidenceLabel(c: number | null): string {
  if (c == null) return 'n/d';
  return `${Math.round(c * 100)}%`;
}

function parseExtracted(raw: string | null): ExtractedDocument | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExtractedDocument;
  } catch {
    return null;
  }
}

function dateToInput(d: Date | null | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);
  const { id } = await params;

  const doc = await getIncomingDocument(id);
  if (!doc) notFound();

  const extracted = parseExtracted(doc.extracted);

  const [clients, properties, interventions] = await Promise.all([
    prisma.client.findMany({
      orderBy: { businessName: 'asc' },
      select: { id: true, businessName: true },
    }),
    prisma.property.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, clientId: true },
    }),
    prisma.intervention.findMany({
      where: { workType: 'EXTRA' },
      orderBy: { startedAt: 'desc' },
      select: { id: true, startedAt: true, propertyId: true },
      take: 100,
    }),
  ]);

  const isImage = doc.mimeType?.startsWith('image/');
  const isPdf = doc.mimeType === 'application/pdf' || doc.fileUrl.endsWith('.pdf');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {TYPE_LABELS[doc.type] ?? doc.type}
            {doc.docNumber ? ` · ${doc.docNumber}` : ''}
          </h1>
          <p className="text-xs text-slate-500">
            Caricato da {doc.createdBy.firstName} {doc.createdBy.lastName} il{' '}
            {new Date(doc.createdAt).toLocaleString('it-CH')}
            {doc.ocrProvider ? ` · OCR: ${doc.ocrProvider}` : ''}
            {doc.ocrConfidence != null
              ? ` · confidenza media ${Math.round(doc.ocrConfidence * 100)}%`
              : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={confidenceClass(null)}>{STATUS_LABELS[doc.status] ?? doc.status}</Badge>
          <Link href="/dashboard/documents">
            <Button variant="ghost" size="sm">
              ← Torna alla lista
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-sm font-semibold uppercase text-slate-500">Anteprima file</h2>
          {isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.fileUrl} alt="documento" className="max-h-[600px] w-full object-contain" />
          )}
          {isPdf && (
            <iframe src={doc.fileUrl} className="h-[600px] w-full rounded border" title="PDF" />
          )}
          {!isImage && !isPdf && (
            <a href={doc.fileUrl} target="_blank" rel="noopener" className="text-sm text-blue-600 underline">
              Apri file originale
            </a>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-sm font-semibold uppercase text-slate-500">Campi estratti (OCR)</h2>
          {extracted ? (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1">Campo</th>
                  <th className="py-1">Valore</th>
                  <th className="py-1">Confidenza</th>
                </tr>
              </thead>
              <tbody>
                <FieldRow label="Fornitore" f={extracted.supplierName} />
                <FieldRow label="P.IVA / N. registro" f={extracted.supplierVat} />
                <FieldRow label="Numero documento" f={extracted.docNumber} />
                <FieldRow label="Data" f={extracted.docDate} />
                <FieldRow label="Scadenza" f={extracted.dueDate} />
                <FieldRow label="Valuta" f={extracted.currency} />
                <FieldRow
                  label="Imponibile"
                  f={{
                    value:
                      extracted.subtotalCents.value != null
                        ? (extracted.subtotalCents.value / 100).toFixed(2)
                        : null,
                    confidence: extracted.subtotalCents.confidence,
                  }}
                />
                <FieldRow
                  label="IVA"
                  f={{
                    value:
                      extracted.vatCents.value != null
                        ? (extracted.vatCents.value / 100).toFixed(2)
                        : null,
                    confidence: extracted.vatCents.confidence,
                  }}
                />
                <FieldRow
                  label="Totale"
                  f={{
                    value:
                      extracted.totalCents.value != null
                        ? (extracted.totalCents.value / 100).toFixed(2)
                        : null,
                    confidence: extracted.totalCents.confidence,
                  }}
                />
                <FieldRow label="IBAN" f={extracted.iban} />
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-500">Nessun dato estratto disponibile.</p>
          )}
        </Card>
      </div>

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold uppercase text-slate-500">Validazione e correzione</h2>
        <form action={updateIncomingDocument} className="grid gap-3 md:grid-cols-3">
          <input type="hidden" name="id" value={doc.id} />

          <div>
            <Label>Tipo</Label>
            <Select name="type" defaultValue={doc.type}>
              <option value="FATTURA_FORNITORE">Fattura fornitore</option>
              <option value="RICEVUTA">Ricevuta</option>
              <option value="BOLLA_CONSEGNA">Bolla consegna</option>
              <option value="PREVENTIVO_RICEVUTO">Preventivo ricevuto</option>
            </Select>
          </div>
          <div>
            <Label>Fornitore</Label>
            <Input name="supplierName" defaultValue={doc.supplierName ?? ''} />
          </div>
          <div>
            <Label>P.IVA / N. registro</Label>
            <Input name="supplierVat" defaultValue={doc.supplierVat ?? ''} />
          </div>
          <div>
            <Label>Numero documento</Label>
            <Input name="docNumber" defaultValue={doc.docNumber ?? ''} />
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" name="docDate" defaultValue={dateToInput(doc.docDate)} />
          </div>
          <div>
            <Label>Scadenza</Label>
            <Input type="date" name="dueDate" defaultValue={dateToInput(doc.dueDate)} />
          </div>
          <div>
            <Label>Valuta</Label>
            <Input name="currency" defaultValue={doc.currency ?? 'CHF'} />
          </div>
          <div>
            <Label>Imponibile (centesimi)</Label>
            <Input
              type="number"
              name="subtotalCents"
              defaultValue={doc.subtotalCents ?? ''}
              min={0}
            />
          </div>
          <div>
            <Label>IVA (centesimi)</Label>
            <Input type="number" name="vatCents" defaultValue={doc.vatCents ?? ''} min={0} />
          </div>
          <div>
            <Label>Totale (centesimi)</Label>
            <Input type="number" name="totalCents" defaultValue={doc.totalCents ?? ''} min={0} />
          </div>
          <div>
            <Label>IBAN fornitore</Label>
            <Input name="iban" defaultValue={doc.iban ?? ''} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Input
              name="category"
              defaultValue={doc.category ?? ''}
              placeholder="Es. carburante, materiali, trasferta…"
            />
          </div>

          <div>
            <Label>Cliente collegato</Label>
            <Select name="clientId" defaultValue={doc.clientId?.toString() ?? ''}>
              <option value="">— Nessuno —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Stabile collegato</Label>
            <Select name="propertyId" defaultValue={doc.propertyId?.toString() ?? ''}>
              <option value="">— Nessuno —</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Intervento EXTRA collegato</Label>
            <Select name="interventionId" defaultValue={doc.interventionId?.toString() ?? ''}>
              <option value="">— Nessuno —</option>
              {interventions.map((i) => (
                <option key={i.id} value={i.id}>
                  #{i.id}
                  {i.startedAt ? ` · ${new Date(i.startedAt).toLocaleDateString('it-CH')}` : ''}
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-3">
            <Label>Note</Label>
            <Textarea name="notes" defaultValue={doc.notes ?? ''} />
          </div>

          <div className="md:col-span-3">
            <Button type="submit">Salva correzioni</Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-slate-500">Workflow</h2>
        <div className="flex flex-wrap gap-2">
          {doc.status === 'DA_VALIDARE' && (
            <form action={validateIncomingDocument}>
              <input type="hidden" name="id" value={doc.id} />
              <Button type="submit">Valida documento</Button>
            </form>
          )}
          {(doc.status === 'VALIDATO' || doc.status === 'DA_VALIDARE') && (
            <form action={markReadyForExport}>
              <input type="hidden" name="id" value={doc.id} />
              <Button type="submit" variant="outline">
                Marca pronto per export
              </Button>
            </form>
          )}
          {doc.status !== 'SCARTATO' && (
            <form action={discardIncomingDocument} className="flex items-center gap-2">
              <input type="hidden" name="id" value={doc.id} />
              <Input
                name="discardReason"
                placeholder="Motivo dello scarto (obbligatorio)"
                className="w-72"
                required
                minLength={3}
              />
              <Button type="submit" variant="destructive" size="sm">
                Scarta
              </Button>
            </form>
          )}
          {doc.status === 'SCARTATO' && doc.discardReason && (
            <p className="text-sm text-slate-600">
              Scartato: <span className="italic">{doc.discardReason}</span>
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function FieldRow<T>({
  label,
  f,
}: {
  label: string;
  f: { value: T | null; confidence: number | null };
}) {
  return (
    <tr className="border-t">
      <td className="py-1 pr-3 text-slate-500">{label}</td>
      <td className="py-1 pr-3 font-medium">{f.value !== null && f.value !== '' ? String(f.value) : '—'}</td>
      <td className="py-1">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${confidenceClass(f.confidence)}`}>
          {confidenceLabel(f.confidence)}
        </span>
      </td>
    </tr>
  );
}
