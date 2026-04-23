import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmSubmit } from '@/components/ui/confirm-submit';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableCell, TableHead } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { createProperty, deleteProperty, updateProperty } from '@/lib/actions/properties';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function PropertiesPage() {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);
  const [properties, clients] = await Promise.all([
    prisma.property.findMany({ include: { client: true }, orderBy: { name: 'asc' } }),
    prisma.client.findMany({ orderBy: { businessName: 'asc' } }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="mb-3 text-lg font-semibold">Stabili</h1>
        <form action={createProperty} className="grid gap-3 md:grid-cols-3">
          <div><Label>Nome stabile</Label><Input name="name" required /></div>
          <div><Label>Indirizzo</Label><Input name="address" required /></div>
          <div><Label>Cliente</Label><Select name="clientId" required>{clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}</Select></div>
          <div><Label>Frequenza settimanale</Label><Input name="serviceFrequency" /></div>
          <div><Label>Ore previste/settimana</Label><Input name="expectedWeeklyHours" type="number" step="0.5" /></div>
          <div className="md:col-span-3"><Label>Note operative</Label><Textarea name="operationalNotes" /></div>
          <Button type="submit" className="w-fit">Crea stabile</Button>
        </form>
      </Card>
      <Card>
        <Table>
          <thead><tr><TableHead>Dati</TableHead><TableHead>Cliente</TableHead><TableHead>Azioni</TableHead></tr></thead>
          <tbody>
            {properties.map((property) => (
              <tr key={property.id}>
                <TableCell colSpan={2}>
                  <form action={updateProperty} className="grid gap-2 md:grid-cols-3">
                    <input type="hidden" name="id" value={property.id} />
                    <Input name="name" defaultValue={property.name} />
                    <Input name="address" defaultValue={property.address} />
                    <Select name="clientId" defaultValue={String(property.clientId)}>{clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}</Select>
                    <Input name="serviceFrequency" defaultValue={property.serviceFrequency ?? ''} placeholder="Frequenza" />
                    <Input name="expectedWeeklyHours" defaultValue={property.expectedWeeklyHours ?? ''} type="number" step="0.5" />
                    <Textarea name="operationalNotes" defaultValue={property.operationalNotes ?? ''} className="md:col-span-3" />
                    <Button type="submit" className="w-fit">Modifica</Button>
                  </form>
                </TableCell>
                <TableCell>
                  <form action={deleteProperty}>
                    <input type="hidden" name="id" value={property.id} />
                    <ConfirmSubmit type="submit" message="Eliminare stabile?" className="rounded-md bg-red-600 px-3 py-1 text-sm text-white">Elimina</ConfirmSubmit>
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
