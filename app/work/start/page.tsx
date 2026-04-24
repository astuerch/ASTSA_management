import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { startIntervention } from '@/lib/actions/interventions';
import { WorkType } from '@prisma/client';

const WORK_TYPE_LABELS: Record<WorkType, string> = {
  ORDINARIO: 'Ordinario',
  EXTRA: 'Extra',
  TRASFERTA: 'Trasferta',
  REGIA: 'A regia',
  FORFAIT: 'A forfait',
  STRAORDINARIO: 'Straordinario',
  PICCHETTO: 'Picchetto',
  EMERGENZA: 'Emergenza',
};

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) redirect('/login');
  const userId = parseInt(session.user.id, 10);

  const properties = await prisma.property.findMany({
    orderBy: { name: 'asc' },
    include: { client: true },
  });

  const colleagues = await prisma.user.findMany({
    where: { isActive: true, id: { not: userId } },
    orderBy: { firstName: 'asc' },
  });

  async function handleStart(formData: FormData) {
    'use server';
    await startIntervention(formData);
    redirect('/work');
  }

  const preselectedPropertyId = params.propertyId ? parseInt(params.propertyId, 10) : null;

  return (
    <Card>
      <h1 className="mb-4 text-xl font-bold">Inizia lavoro</h1>
      <form action={handleStart} className="space-y-4">
        <div>
          <Label>Stabile *</Label>
          <Select name="propertyId" required defaultValue={preselectedPropertyId?.toString() ?? ''}>
            <option value="">Seleziona stabile…</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.client?.businessName ?? ''}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Tipo intervento *</Label>
          <Select name="workType" required defaultValue={WorkType.ORDINARIO}>
            {Object.entries(WORK_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Colleghi presenti</Label>
          <div className="mt-1 space-y-1 rounded-md border p-2">
            {colleagues.length === 0 && (
              <p className="text-sm text-slate-500">Nessun collega disponibile</p>
            )}
            {colleagues.map((c) => (
              <label key={c.id} className="flex items-center gap-2 py-1 text-sm">
                <input type="checkbox" name="workerIds" value={c.id} className="h-5 w-5" />
                {c.firstName} {c.lastName}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" id="geoConsent" className="h-5 w-5" />
            Consenti geolocalizzazione
          </label>
          <input type="hidden" name="startLat" id="startLat" />
          <input type="hidden" name="startLng" id="startLng" />
          <input type="hidden" name="startAccuracy" id="startAccuracy" />
        </div>

        <Button type="submit" className="h-14 w-full bg-green-600 text-base hover:bg-green-700">
          ▶ Inizia
        </Button>
      </form>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('geoConsent').addEventListener('change', function(e) {
              if (!e.target.checked) return;
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition(function(pos) {
                document.getElementById('startLat').value = pos.coords.latitude;
                document.getElementById('startLng').value = pos.coords.longitude;
                document.getElementById('startAccuracy').value = pos.coords.accuracy;
              }, function() {
                e.target.checked = false;
              });
            });
          `,
        }}
      />
    </Card>
  );
}
