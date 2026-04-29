import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { createQuote } from '@/lib/actions/quotes';

export default async function NewQuotePage() {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);

  const clients = await prisma.client.findMany({ orderBy: { businessName: 'asc' } });
  const properties = await prisma.property.findMany({
    orderBy: { name: 'asc' },
    include: { client: true },
  });
  const priceListItems = await prisma.priceListItem.findMany({
    where: { active: true },
    orderBy: { code: 'asc' },
  });

  async function handleCreate(formData: FormData) {
    'use server';
    const clientId = parseInt(String(formData.get('clientId')), 10);
    const propertyId = formData.get('propertyId') ? parseInt(String(formData.get('propertyId')), 10) : null;
    const linesRaw = String(formData.get('linesJson') ?? '[]');
    let lines: unknown[] = [];
    try { lines = JSON.parse(linesRaw); } catch { lines = []; }

    const quote = await createQuote({
      clientId,
      propertyId,
      subject: String(formData.get('subject')),
      notes: String(formData.get('notes') ?? ''),
      locale: (formData.get('locale') as 'it' | 'de-ch') ?? 'it',
      lines: lines as never,
    });
    redirect(`/dashboard/quotes/${quote.id}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/quotes"><Button className="bg-gray-200 text-gray-800 hover:bg-gray-300">← Indietro</Button></Link>
        <h1 className="text-xl font-semibold">Nuovo preventivo</h1>
      </div>

      <form action={handleCreate} className="space-y-4">
        <Card>
          <h2 className="mb-3 text-base font-semibold">Dati documento</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Cliente *</Label>
              <Select name="clientId" required>
                <option value="">— Seleziona cliente —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName}
                    {!c.sageCustomerNumber ? ' ⚠ (no numero Sage)' : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Stabile</Label>
              <Select name="propertyId">
                <option value="">— Nessuno —</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.client.businessName})</option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Oggetto *</Label>
              <Input name="subject" required placeholder="es. Appartamento Signora Libris – tinteggio" />
            </div>
            <div>
              <Label>Lingua</Label>
              <Select name="locale">
                <option value="it">Italiano</option>
                <option value="de-ch">Tedesco (CH)</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Note</Label>
              <Textarea name="notes" rows={2} />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-semibold">Righe</h2>
          <p className="text-sm text-gray-500 mb-4">
            Aggiungi righe al preventivo. Puoi utilizzare le voci del listino come riferimento.
          </p>
          {priceListItems.length > 0 && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-xs font-semibold text-gray-600 mb-2">Listino prezzi:</p>
              <div className="grid gap-1 md:grid-cols-3">
                {priceListItems.map((item) => (
                  <div key={item.id} className="text-xs text-gray-600">
                    <span className="font-mono font-semibold">{item.code}</span> – {item.description} ({item.unit}) CHF {(item.unitPriceCents / 100).toFixed(2)}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* TODO: Implement dynamic line entry form (add/remove rows with price-list autocomplete) */}
          {/* Hidden field for lines JSON - currently static, dynamic editor in future iteration */}
          <input type="hidden" name="linesJson" value="[]" />
          <p className="text-sm text-gray-400 italic">Le righe possono essere aggiunte dopo la creazione nel dettaglio preventivo.</p>
        </Card>

        <div className="flex gap-3">
          <Button type="submit">Crea preventivo</Button>
          <Link href="/dashboard/quotes"><Button className="bg-gray-200 text-gray-800 hover:bg-gray-300">Annulla</Button></Link>
        </div>
      </form>
    </div>
  );
}
