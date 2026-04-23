import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmSubmit } from '@/components/ui/confirm-submit';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableCell, TableHead } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { createStaff, deleteStaff, updateStaff } from '@/lib/actions/staff';
import { requireRole } from '@/lib/auth';
import { formatCents } from '@/lib/money';
import { prisma } from '@/lib/prisma';

export default async function StaffPage() {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);
  const [roles, users] = await Promise.all([
    prisma.role.findMany({ orderBy: { id: 'asc' } }),
    prisma.user.findMany({ include: { role: true }, orderBy: { lastName: 'asc' } }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="mb-3 text-lg font-semibold">Personale</h1>
        <form action={createStaff} className="grid gap-3 md:grid-cols-3">
          <div><Label>Nome</Label><Input name="firstName" required /></div>
          <div><Label>Cognome</Label><Input name="lastName" required /></div>
          <div><Label>Email</Label><Input name="email" type="email" required /></div>
          <div><Label>Ruolo</Label><Select name="roleId">{roles.map((r) => <option key={r.id} value={r.id}>{r.code}</option>)}</Select></div>
          <div><Label>Costo orario (centesimi)</Label><Input name="hourlyCostCents" type="number" min="0" defaultValue="0" /></div>
          <div><Label>Password iniziale</Label><Input name="password" type="password" defaultValue="Password123!" /></div>
          <div className="md:col-span-3"><Label>Abilitazioni</Label><Textarea name="qualifications" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked /> Attivo</label>
          <Button type="submit" className="w-fit">Crea persona</Button>
        </form>
      </Card>
      <Card>
        <Table>
          <thead><tr><TableHead>Dati</TableHead><TableHead>Ruolo</TableHead><TableHead>Costo</TableHead><TableHead>Azioni</TableHead></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <TableCell>
                  <form action={updateStaff} className="grid gap-2 md:grid-cols-2">
                    <input type="hidden" name="id" value={user.id} />
                    <Input name="firstName" defaultValue={user.firstName} />
                    <Input name="lastName" defaultValue={user.lastName} />
                    <Input name="email" defaultValue={user.email} type="email" className="md:col-span-2" />
                    <Select name="roleId" defaultValue={String(user.roleId)}>{roles.map((r) => <option key={r.id} value={r.id}>{r.code}</option>)}</Select>
                    <Input name="hourlyCostCents" type="number" min="0" defaultValue={user.hourlyCostCents ?? 0} />
                    <Textarea name="qualifications" defaultValue={user.qualifications ?? ''} className="md:col-span-2" />
                    <label className="md:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={user.isActive} /> Attivo</label>
                    <Button type="submit" className="w-fit">Modifica</Button>
                  </form>
                </TableCell>
                <TableCell><Badge>{user.role.code}</Badge></TableCell>
                <TableCell>{formatCents(user.hourlyCostCents ?? 0)}</TableCell>
                <TableCell>
                  <form action={deleteStaff}>
                    <input type="hidden" name="id" value={user.id} />
                    <ConfirmSubmit type="submit" message="Eliminare dipendente?" className="rounded-md bg-red-600 px-3 py-1 text-sm text-white">Elimina</ConfirmSubmit>
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
