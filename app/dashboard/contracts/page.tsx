import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmSubmit } from '@/components/ui/confirm-submit';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableCell, TableHead } from '@/components/ui/table';
import { createContract, deleteContract, updateContract } from '@/lib/actions/contracts';
import { requireRole } from '@/lib/auth';
import { formatCents } from '@/lib/money';
import { prisma } from '@/lib/prisma';

export default async function ContractsPage() {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);
  const [contracts, properties, services] = await Promise.all([
    prisma.custodyContract.findMany({ include: { property: true, services: { include: { service: true } } }, orderBy: { id: 'desc' } }),
    prisma.property.findMany({ include: { client: true }, orderBy: { name: 'asc' } }),
    prisma.service.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="mb-3 text-lg font-semibold">Contratti di custodia</h1>
        <form action={createContract} className="grid gap-3 md:grid-cols-3">
          <div><Label>Stabile</Label><Select name="propertyId">{properties.map((p) => <option key={p.id} value={p.id}>{p.name} - {p.client.businessName}</option>)}</Select></div>
          <div><Label>Frequenza</Label><Input name="weeklyFrequency" type="number" min="1" max="7" defaultValue="1" /></div>
          <div><Label>Ore mensili previste</Label><Input name="expectedHoursMonthly" type="number" min="0" step="0.5" defaultValue="0" /></div>
          <div><Label>Prezzo mensile (centesimi)</Label><Input name="monthlyPriceCents" type="number" min="0" defaultValue="0" /></div>
          <div><Label>Data inizio</Label><Input name="startsOn" type="date" /></div>
          <div><Label>Data fine</Label><Input name="endsOn" type="date" /></div>
          <div className="md:col-span-3"><Label>Servizi inclusi</Label><Select name="serviceIds" multiple className="h-32">{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
          <Button type="submit" className="w-fit">Crea contratto</Button>
        </form>
      </Card>
      <Card>
        <Table>
          <thead><tr><TableHead>ID</TableHead><TableHead>Stabile</TableHead><TableHead>Frequenza</TableHead><TableHead>Ore/mese</TableHead><TableHead>Prezzo</TableHead><TableHead>Servizi</TableHead><TableHead>Azioni</TableHead></tr></thead>
          <tbody>
            {contracts.map((contract) => (
              <tr key={contract.id}>
                <TableCell>#{contract.id}</TableCell>
                <TableCell>{contract.property.name}</TableCell>
                <TableCell>{contract.weeklyFrequency ?? '-'}</TableCell>
                <TableCell>{contract.expectedHoursMonthly ?? '-'}</TableCell>
                <TableCell>{formatCents(contract.monthlyPriceCents)}</TableCell>
                <TableCell>{contract.services.map((s) => s.service.name).join(', ') || '-'}</TableCell>
                <TableCell>
                  <form action={updateContract} className="space-y-2">
                    <input type="hidden" name="id" value={contract.id} />
                    <Select name="propertyId" defaultValue={String(contract.propertyId)}>{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
                    <Input name="weeklyFrequency" type="number" min="1" max="7" defaultValue={contract.weeklyFrequency ?? 1} />
                    <Input name="expectedHoursMonthly" type="number" min="0" step="0.5" defaultValue={contract.expectedHoursMonthly ?? 0} />
                    <Input name="monthlyPriceCents" type="number" min="0" defaultValue={contract.monthlyPriceCents} />
                    <Input name="startsOn" type="date" defaultValue={contract.startsOn ? contract.startsOn.toISOString().slice(0, 10) : ''} />
                    <Input name="endsOn" type="date" defaultValue={contract.endsOn ? contract.endsOn.toISOString().slice(0, 10) : ''} />
                    <Select name="serviceIds" multiple className="h-28" defaultValue={contract.services.map((s) => String(s.serviceId))}>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
                    <Button type="submit">Modifica</Button>
                  </form>
                  <form action={deleteContract} className="mt-2">
                    <input type="hidden" name="id" value={contract.id} />
                    <ConfirmSubmit type="submit" message="Eliminare contratto?" className="rounded-md bg-red-600 px-3 py-1 text-sm text-white">Elimina</ConfirmSubmit>
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
