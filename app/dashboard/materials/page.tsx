import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmSubmit } from '@/components/ui/confirm-submit';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableCell, TableHead } from '@/components/ui/table';
import { createMaterial, deleteMaterial, updateMaterial } from '@/lib/actions/materials';
import { requireRole } from '@/lib/auth';
import { formatCents } from '@/lib/money';
import { prisma } from '@/lib/prisma';

export default async function MaterialsPage() {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);
  const materials = await prisma.material.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="mb-3 text-lg font-semibold">Materiali</h1>
        <form action={createMaterial} className="grid gap-3 md:grid-cols-4">
          <div><Label>Descrizione</Label><Input name="name" required /></div>
          <div><Label>Unità</Label><Input name="unit" required /></div>
          <div><Label>Costo (centesimi)</Label><Input name="unitCostCents" type="number" min="0" defaultValue="0" /></div>
          <div><Label>Giacenza</Label><Input name="stockQuantity" type="number" min="0" step="0.1" defaultValue="0" /></div>
          <Button type="submit" className="w-fit">Crea materiale</Button>
        </form>
      </Card>
      <Card>
        <Table>
          <thead><tr><TableHead>Materiale</TableHead><TableHead>Unità</TableHead><TableHead>Costo</TableHead><TableHead>Giacenza</TableHead><TableHead>Azioni</TableHead></tr></thead>
          <tbody>
            {materials.map((material) => (
              <tr key={material.id}>
                <TableCell>{material.name}</TableCell>
                <TableCell>{material.unit}</TableCell>
                <TableCell>{formatCents(material.unitCostCents)}</TableCell>
                <TableCell>{material.stockQuantity ?? 0}</TableCell>
                <TableCell>
                  <form action={updateMaterial} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={material.id} />
                    <Input name="name" defaultValue={material.name} />
                    <Input name="unit" defaultValue={material.unit} />
                    <Input name="unitCostCents" type="number" min="0" defaultValue={material.unitCostCents} />
                    <Input name="stockQuantity" type="number" min="0" step="0.1" defaultValue={material.stockQuantity ?? 0} />
                    <Button type="submit">Modifica</Button>
                  </form>
                  <form action={deleteMaterial} className="mt-2">
                    <input type="hidden" name="id" value={material.id} />
                    <ConfirmSubmit type="submit" message="Eliminare materiale?" className="rounded-md bg-red-600 px-3 py-1 text-sm text-white">Elimina</ConfirmSubmit>
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
