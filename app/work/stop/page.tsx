import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { InterventionStatus } from '@prisma/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { stopIntervention } from '@/lib/actions/interventions';
import { SignatureCanvas } from '@/components/work/signature-canvas';

export default async function StopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) redirect('/login');

  const interventionId = params.id ? parseInt(params.id, 10) : null;
  if (!interventionId) redirect('/work');

  const intervention = await prisma.intervention.findUnique({
    where: { id: interventionId },
    include: { property: true },
  });

  if (!intervention || intervention.status !== InterventionStatus.IN_CORSO) {
    redirect('/work');
  }

  async function handleStop(formData: FormData) {
    'use server';
    await stopIntervention(interventionId!, formData);
    redirect('/work');
  }

  return (
    <Card>
      <h1 className="mb-1 text-xl font-bold">Termina lavoro</h1>
      <p className="mb-4 text-sm text-slate-500">{intervention.property.name}</p>

      <form action={handleStop} className="space-y-4">
        <div>
          <Label>Note finali</Label>
          <Textarea name="notes" rows={3} placeholder="Note intervento…" />
        </div>

        <div>
          <Label>Anomalie / Danni</Label>
          <Textarea
            name="anomaly"
            rows={2}
            placeholder="Descrivi eventuali anomalie o danni…"
            defaultValue={params.anomaly === '1' ? '' : undefined}
          />
        </div>

        <SignatureCanvas />

        <input type="hidden" name="endLat" id="endLat" />
        <input type="hidden" name="endLng" id="endLng" />

        <Button type="submit" className="h-14 w-full bg-red-600 text-base hover:bg-red-700">
          ⏹ Termina
        </Button>
      </form>
    </Card>
  );
}
