import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableCell, TableHead } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ConfirmSubmit } from '@/components/ui/confirm-submit';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

async function createPriceListItem(formData: FormData) {
  'use server';
  await prisma.priceListItem.create({
    data: {
      code: String(formData.get('code')).toUpperCase(),
      description: String(formData.get('description')),
      unit: String(formData.get('unit')),
      unitPriceCents: Math.round(parseFloat(String(formData.get('unitPrice'))) * 100),
      vatCode: (formData.get('vatCode') as 'STANDARD') ?? 'STANDARD',
      category: String(formData.get('category') ?? ''),
    },
  });
  revalidatePath('/dashboard/price-list');
}

async function updatePriceListItem(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  await prisma.priceListItem.update({
    where: { id },
    data: {
      description: String(formData.get('description')),
      unit: String(formData.get('unit')),
      unitPriceCents: Math.round(parseFloat(String(formData.get('unitPrice'))) * 100),
      vatCode: (formData.get('vatCode') as 'STANDARD') ?? 'STANDARD',
      category: String(formData.get('category') ?? ''),
      active: formData.get('active') === 'true',
    },
  });
  revalidatePath('/dashboard/price-list');
}

async function deletePriceListItem(formData: FormData) {
  'use server';
  await prisma.priceListItem.delete({ where: { id: String(formData.get('id')) } });
  revalidatePath('/dashboard/price-list');
}

export default async function PriceListPage() {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);
  const items = await prisma.priceListItem.findMany({ orderBy: [{ category: 'asc' }, { code: 'asc' }] });

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="mb-3 text-lg font-semibold">Listino prezzi</h1>
        <form action={createPriceListItem} className="grid gap-3 md:grid-cols-4">
          <div><Label>Codice</Label><Input name="code" required placeholder="es. TINT_MQ" /></div>
          <div><Label>Descrizione</Label><Input name="description" required /></div>
          <div><Label>Unità</Label><Input name="unit" required placeholder="h / mq / Forfait" /></div>
          <div><Label>Prezzo unitario CHF</Label><Input name="unitPrice" type="number" step="0.05" required /></div>
          <div>
            <Label>IVA</Label>
            <Select name="vatCode">
              <option value="STANDARD">8.1% Standard</option>
              <option value="RIDOTTA">2.6% Ridotta</option>
              <option value="ALLOGGIO">3.8% Alloggio</option>
              <option value="ESENTE">0% Esente</option>
            </Select>
          </div>
          <div><Label>Categoria</Label><Input name="category" placeholder="es. tinteggio, giardini" /></div>
          <div className="flex items-end">
            <Button type="submit">Aggiungi voce</Button>
          </div>
        </form>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <TableHead>Codice</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead>Unità</TableHead>
              <TableHead>Prezzo CHF</TableHead>
              <TableHead>IVA</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Azioni</TableHead>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <TableCell colSpan={6}>
                  <form action={updatePriceListItem} className="grid gap-2 md:grid-cols-6">
                    <input type="hidden" name="id" value={item.id} />
                    <span className="font-mono text-sm font-semibold">{item.code}</span>
                    <Input name="description" defaultValue={item.description} />
                    <Input name="unit" defaultValue={item.unit} />
                    <Input name="unitPrice" type="number" step="0.05" defaultValue={(item.unitPriceCents / 100).toFixed(2)} />
                    <Select name="vatCode" defaultValue={item.vatCode}>
                      <option value="STANDARD">8.1%</option>
                      <option value="RIDOTTA">2.6%</option>
                      <option value="ALLOGGIO">3.8%</option>
                      <option value="ESENTE">0%</option>
                    </Select>
                    <Input name="category" defaultValue={item.category ?? ''} />
                    <input type="hidden" name="active" value={String(item.active)} />
                    <Button type="submit" size="sm">Salva</Button>
                  </form>
                </TableCell>
                <TableCell>
                  <Badge className={item.active ? '' : 'bg-gray-200 text-gray-500'}>
                    {item.active ? 'Attivo' : 'Inattivo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <form action={deletePriceListItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <ConfirmSubmit message="Eliminare voce listino?" className="rounded-md bg-red-600 px-3 py-1 text-sm text-white">
                      Elimina
                    </ConfirmSubmit>
                  </form>
                </TableCell>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
