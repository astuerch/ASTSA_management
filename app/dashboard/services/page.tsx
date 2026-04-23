import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmSubmit } from '@/components/ui/confirm-submit';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableCell, TableHead } from '@/components/ui/table';
import { createService, deleteService, updateService } from '@/lib/actions/services';
import { requireRole } from '@/lib/auth';
import { formatCents } from '@/lib/money';
import { prisma } from '@/lib/prisma';

export default async function ServicesPage() {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);
  const services = await prisma.service.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="mb-3 text-lg font-semibold">Servizi</h1>
        <form action={createService} className="grid gap-3 md:grid-cols-4">
          <div><Label>Nome</Label><Input name="name" required /></div>
          <div><Label>Categoria</Label><Select name="category"><option value="ORDINARIO">Ordinario</option><option value="EXTRA">Extra</option></Select></div>
          <div><Label>Unità</Label><Select name="unit"><option value="ora">Ora</option><option value="mq">mq</option><option value="forfait">Forfait</option></Select></div>
          <div><Label>Prezzo unitario (centesimi)</Label><Input name="defaultUnitRateCents" type="number" min="0" defaultValue="0" /></div>
          <Button type="submit" className="w-fit">Crea servizio</Button>
        </form>
      </Card>
      <Card>
        <Table>
          <thead><tr><TableHead>Servizio</TableHead><TableHead>Categoria</TableHead><TableHead>Unità</TableHead><TableHead>Prezzo</TableHead><TableHead>Azioni</TableHead></tr></thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                <TableCell>{service.name}</TableCell>
                <TableCell>{service.category}</TableCell>
                <TableCell>{service.unit}</TableCell>
                <TableCell>{formatCents(service.defaultUnitRateCents ?? 0)}</TableCell>
                <TableCell>
                  <form action={updateService} className="space-y-2">
                    <input type="hidden" name="id" value={service.id} />
                    <Input name="name" defaultValue={service.name} />
                    <Select name="category" defaultValue={service.category}><option value="ORDINARIO">Ordinario</option><option value="EXTRA">Extra</option></Select>
                    <Select name="unit" defaultValue={service.unit}><option value="ora">Ora</option><option value="mq">mq</option><option value="forfait">Forfait</option></Select>
                    <Input name="defaultUnitRateCents" type="number" min="0" defaultValue={service.defaultUnitRateCents ?? 0} />
                    <Button type="submit">Modifica</Button>
                  </form>
                  <form action={deleteService} className="mt-2">
                    <input type="hidden" name="id" value={service.id} />
                    <ConfirmSubmit type="submit" message="Eliminare servizio?" className="rounded-md bg-red-600 px-3 py-1 text-sm text-white">Elimina</ConfirmSubmit>
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
