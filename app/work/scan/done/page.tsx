import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import type { ExtractedDocument } from '@/lib/ocr/types';
import { prisma } from '@/lib/prisma';

export default async function ScanDonePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const params = await searchParams;
  if (!params.id) redirect('/work');

  const doc = await prisma.incomingDocument.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      type: true,
      status: true,
      supplierName: true,
      docNumber: true,
      totalCents: true,
      currency: true,
      ocrConfidence: true,
      ocrProvider: true,
      extracted: true,
    },
  });
  if (!doc) redirect('/work');

  let extracted: ExtractedDocument | null = null;
  try {
    extracted = doc.extracted ? (JSON.parse(doc.extracted) as ExtractedDocument) : null;
  } catch {
    extracted = null;
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Documento inviato ✓</h1>
          <Badge className="bg-amber-100 text-amber-800">In attesa di validazione</Badge>
        </div>
        <p className="text-sm text-slate-600">
          Grazie. L&apos;amministrazione riceverà il documento e lo validerà.
        </p>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-slate-500">Fornitore</dt>
          <dd>{doc.supplierName ?? '—'}</dd>
          <dt className="text-slate-500">Numero</dt>
          <dd className="font-mono">{doc.docNumber ?? '—'}</dd>
          <dt className="text-slate-500">Totale</dt>
          <dd className="font-mono">
            {doc.totalCents != null
              ? `${doc.currency ?? 'CHF'} ${(doc.totalCents / 100).toFixed(2)}`
              : '—'}
          </dd>
          <dt className="text-slate-500">OCR</dt>
          <dd>
            {doc.ocrProvider ?? '—'}
            {doc.ocrConfidence != null
              ? ` · ${Math.round(doc.ocrConfidence * 100)}%`
              : ''}
          </dd>
        </dl>
        {extracted && extracted.lineItems.length > 0 && (
          <div className="rounded-md bg-slate-50 p-2 text-xs">
            <p className="mb-1 font-semibold text-slate-600">Righe rilevate</p>
            <ul className="list-disc pl-4 text-slate-600">
              {extracted.lineItems.slice(0, 5).map((li, i) => (
                <li key={i}>
                  {li.description ?? 'voce'} · {li.quantity ?? '?'} ×{' '}
                  {li.unitPriceCents != null ? (li.unitPriceCents / 100).toFixed(2) : '?'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/work/scan">
          <Button className="h-12 w-full">Scansiona altro</Button>
        </Link>
        <Link href="/work">
          <Button variant="outline" className="h-12 w-full">
            Torna al lavoro
          </Button>
        </Link>
      </div>
    </div>
  );
}
