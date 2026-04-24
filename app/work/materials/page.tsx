import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { addMaterial } from '@/lib/actions/interventions';

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) redirect('/login');

  const interventionId = params.id ? parseInt(params.id, 10) : null;
  if (!interventionId) redirect('/work');

  const materials = await prisma.material.findMany({ orderBy: { name: 'asc' } });

  const used = await prisma.interventionMaterial.findMany({
    where: { interventionId },
    include: { material: true },
  });

  async function handleAdd(formData: FormData) {
    'use server';
    await addMaterial(interventionId!, formData);
    redirect(`/work/materials?id=${interventionId}`);
  }

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="mb-4 text-xl font-bold">Aggiungi materiale</h1>
        <form action={handleAdd} className="space-y-4">
          <div>
            <Label>Materiale</Label>
            <select
              name="materialId"
              required
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base"
            >
              <option value="">Seleziona materiale…</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.unit})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Quantità</Label>
            <Input name="quantity" type="number" min="0.01" step="0.01" required placeholder="0" />
          </div>
          <div>
            <Label>Note</Label>
            <Input name="notes" placeholder="Note opzionali…" />
          </div>
          <Button type="submit" className="h-14 w-full bg-slate-700 text-base">
            📦 Aggiungi
          </Button>
        </form>
      </Card>

      {used.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">Materiali già aggiunti</h2>
          <div className="space-y-2">
            {used.map((im) => (
              <div key={im.id} className="flex justify-between text-sm">
                <span>{im.material.name}</span>
                <span className="font-medium">
                  {im.quantity} {im.material.unit}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
