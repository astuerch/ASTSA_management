import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { InterventionStatus } from '@prisma/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InterventionTimer } from '@/components/work/intervention-timer';

export default async function WorkHomePage() {
  const session = await auth();
  if (!session?.user) return null;
  const userId = parseInt(session.user.id, 10);

  const openIntervention = await prisma.intervention.findFirst({
    where: {
      status: InterventionStatus.IN_CORSO,
      workers: { some: { userId } },
    },
    include: {
      property: { include: { client: true } },
    },
  });

  const recentProperties = await prisma.intervention.findMany({
    where: { workers: { some: { userId } } },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: { propertyId: true, property: { select: { id: true, name: true, address: true } } },
  });

  const uniqueProperties = Array.from(
    new Map(recentProperties.map((i) => [i.propertyId, i.property])).values(),
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      {openIntervention ? (
        <Card className="border-2 border-blue-500">
          <div className="mb-4">
            <h2 className="text-xl font-bold">{openIntervention.property.name}</h2>
            <p className="text-sm text-slate-500">{openIntervention.property.address}</p>
            {openIntervention.property.client && (
              <p className="text-sm text-slate-500">{openIntervention.property.client.businessName}</p>
            )}
            <p className="mt-1 text-sm font-medium text-blue-600">
              Tipo: {openIntervention.workType}
            </p>
          </div>
          <InterventionTimer startedAt={openIntervention.startedAt?.toISOString() ?? null} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link href={`/work/stop?id=${openIntervention.id}`}>
              <Button className="h-14 w-full bg-red-600 text-base hover:bg-red-700">
                ⏹ Termina
              </Button>
            </Link>
            <Link href={`/work/photo?id=${openIntervention.id}`}>
              <Button className="h-14 w-full bg-slate-700 text-base">📷 Foto</Button>
            </Link>
            <Link href={`/work/materials?id=${openIntervention.id}`}>
              <Button className="h-14 w-full bg-slate-700 text-base">📦 Materiale</Button>
            </Link>
            <Link href={`/work/stop?id=${openIntervention.id}&anomaly=1`}>
              <Button className="h-14 w-full bg-yellow-600 text-base hover:bg-yellow-700">
                ⚠️ Anomalia
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="mb-4 text-center text-slate-600">Nessun intervento in corso</p>
          <Link href="/work/start">
            <Button className="h-16 w-full bg-green-600 text-lg hover:bg-green-700">
              ▶ Inizia lavoro
            </Button>
          </Link>
        </Card>
      )}

      {uniqueProperties.length > 0 && !openIntervention && (
        <Card>
          <h3 className="mb-3 font-semibold text-slate-700">Ultimi stabili usati</h3>
          <div className="space-y-2">
            {uniqueProperties.map((prop) => (
              <Link
                key={prop.id}
                href={`/work/start?propertyId=${prop.id}`}
                className="block rounded-md border px-3 py-3 text-sm hover:bg-slate-50 active:bg-slate-100"
              >
                <span className="font-medium">{prop.name}</span>
                <span className="ml-2 text-slate-500">{prop.address}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h3 className="mb-3 font-semibold text-slate-700">Documenti</h3>
        <Link href="/work/scan">
          <Button className="h-14 w-full bg-slate-700 text-base">📄 Scansiona documento</Button>
        </Link>
        <p className="mt-2 text-xs text-slate-500">
          Fattura fornitore, ricevuta o bolla di consegna per lavori EXTRA.
        </p>
      </Card>
    </div>
  );
}
