import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { ScanClient } from '@/components/work/scan-client';
import { auth } from '@/lib/auth';

export default async function ScanPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="mb-1 text-lg font-semibold">Scansiona documento</h1>
        <p className="mb-4 text-sm text-slate-500">
          Fattura fornitore, ricevuta o bolla di consegna relativa a un lavoro EXTRA.
        </p>
        <ScanClient />
      </Card>
    </div>
  );
}
