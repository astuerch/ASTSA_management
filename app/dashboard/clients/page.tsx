import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmSubmit } from '@/components/ui/confirm-submit';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableCell, TableHead } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { createClient, deleteClient, updateClient } from '@/lib/actions/clients';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function ClientsPage() {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);
  const clients = await prisma.client.findMany({ orderBy: { businessName: 'asc' } });

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="mb-3 text-lg font-semibold">Clienti</h1>
        <form action={createClient} className="grid gap-3 md:grid-cols-3">
          <div><Label>Ragione sociale</Label><Input name="businessName" required /></div>
          <div><Label>Tipo</Label><Select name="type"><option value="AMMINISTRAZIONE">Amministrazione</option><option value="FIDUCIARIA">Fiduciaria</option><option value="PRIVATO">Privato</option></Select></div>
          <div><Label>Email</Label><Input name="billingEmail" type="email" /></div>
          <div><Label>Telefono</Label><Input name="phone" /></div>
          <div><Label>Referente</Label><Input name="contactName" /></div>
          <div><Label>Indirizzo</Label><Input name="address" /></div>
          <div className="md:col-span-3"><Label>Note</Label><Textarea name="notes" /></div>
          <div className="md:col-span-3"><Label>Condizioni particolari</Label><Textarea name="specialConditions" /></div>
          <Button type="submit" className="w-fit">Crea cliente</Button>
        </form>
      </Card>

      <Card>
        <Table>
          <thead><tr><TableHead>Cliente</TableHead><TableHead>Tipo</TableHead><TableHead>Contatti</TableHead><TableHead>Azioni</TableHead></tr></thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <TableCell colSpan={3}>
                  <form action={updateClient} className="grid gap-2 md:grid-cols-3">
                    <input type="hidden" name="id" value={client.id} />
                    <Input name="businessName" defaultValue={client.businessName} />
                    <Select name="type" defaultValue={client.type}><option value="AMMINISTRAZIONE">Amministrazione</option><option value="FIDUCIARIA">Fiduciaria</option><option value="PRIVATO">Privato</option></Select>
                    <Input name="billingEmail" defaultValue={client.billingEmail ?? ''} type="email" />
                    <Input name="phone" defaultValue={client.phone ?? ''} />
                    <Input name="contactName" defaultValue={client.contactName ?? ''} />
                    <Input name="address" defaultValue={client.address ?? ''} />
                    <Textarea name="notes" defaultValue={client.notes ?? ''} className="md:col-span-3" />
                    <Textarea name="specialConditions" defaultValue={client.specialConditions ?? ''} className="md:col-span-3" />
                    <div className="md:col-span-3 flex items-center gap-2">
                      <Button type="submit">Modifica</Button>
                      <Badge>{client.type}</Badge>
                    </div>
                  </form>
                </TableCell>
                <TableCell>
                  <form action={deleteClient}>
                    <input type="hidden" name="id" value={client.id} />
                    <ConfirmSubmit type="submit" message="Eliminare cliente?" className="rounded-md bg-red-600 px-3 py-1 text-sm text-white">Elimina</ConfirmSubmit>
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
