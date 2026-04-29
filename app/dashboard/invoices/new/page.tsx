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
import { createInvoiceDraft, createInvoiceFromIntervention } from '@/lib/actions/invoices';

export default async function NewInvoicePage() {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);

  const clients = await prisma.client.findMany({ orderBy: { businessName: 'asc' } });
  const properties = await prisma.property.findMany({ orderBy: { name: 'asc' }, include: { client: true } });
  const extraInterventions = await prisma.intervention.findMany({
    where: { isExtra: true, status: { in: ['PRONTO_FATTURA', 'VALIDATO'] } },
    orderBy: { startedAt: 'desc' },
    include: { property: { include: { client: true } } },
  });

  const now = new Date();
  const due30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const formatDateInput = (d: Date) => d.toISOString().slice(0, 10);

  async function handleCreateManual(formData: FormData) {
    'use server';
    const inv = await createInvoiceDraft({
      clientId: parseInt(String(formData.get('clientId')), 10),
      propertyId: formData.get('propertyId') ? parseInt(String(formData.get('propertyId')), 10) : null,
      subject: String(formData.get('subject')),
      documentDate: new Date(String(formData.get('documentDate'))),
      dueDate: new Date(String(formData.get('dueDate'))),
      notes: String(formData.get('notes') ?? ''),
      locale: (formData.get('locale') as 'it' | 'de-ch') ?? 'it',
      lines: [],
    });
    redirect(`/dashboard/invoices/${inv.id}`);
  }

  async function handleCreateFromIntervention(formData: FormData) {
    'use server';
    const interventionId = parseInt(String(formData.get('interventionId')), 10);
    const inv = await createInvoiceFromIntervention(interventionId);
    redirect(`/dashboard/invoices/${inv.id}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/invoices">
          <Button className="bg-gray-200 text-gray-800 hover:bg-gray-300">← Indietro</Button>
        </Link>
        <h1 className="text-xl font-semibold">Nuova bozza fattura</h1>
      </div>

      {/* From intervention */}
      {extraInterventions.length > 0 && (
        <Card>
          <h2 className="mb-3 text-base font-semibold">Da intervento EXTRA</h2>
          <form action={handleCreateFromIntervention} className="flex gap-3 items-end">
            <div className="flex-1">
              <Label>Intervento extra (VALIDATO / PRONTO FATTURA)</Label>
              <Select name="interventionId" required>
                <option value="">— Seleziona intervento —</option>
                {extraInterventions.map((iv) => (
                  <option key={iv.id} value={iv.id}>
                    #{iv.id} – {iv.property.client.businessName} / {iv.property.name}
                    {iv.startedAt ? ` – ${new Date(iv.startedAt).toLocaleDateString('it-CH')}` : ''}
                    {iv.durationMinutes ? ` (${Math.round(iv.durationMinutes / 60 * 10) / 10}h)` : ''}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
              Crea da intervento
            </Button>
          </form>
        </Card>
      )}

      {/* Manual */}
      <Card>
        <h2 className="mb-3 text-base font-semibold">Bozza manuale</h2>
        <form action={handleCreateManual} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Cliente *</Label>
              <Select name="clientId" required>
                <option value="">— Seleziona cliente —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName}
                    {!c.sageCustomerNumber ? ' ⚠' : ''}
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
              <Input name="subject" required />
            </div>
            <div>
              <Label>Data documento</Label>
              <Input name="documentDate" type="date" defaultValue={formatDateInput(now)} required />
            </div>
            <div>
              <Label>Scadenza</Label>
              <Input name="dueDate" type="date" defaultValue={formatDateInput(due30)} required />
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
          <Button type="submit">Crea bozza</Button>
        </form>
      </Card>
    </div>
  );
}
