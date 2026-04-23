import { auth } from '@/lib/auth';
import { Card } from '@/components/ui/card';

export default async function DashboardPage() {
  const session = await auth();

  return (
    <Card>
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-sm text-slate-600">
        Benvenuto {session?.user?.name}. Seleziona una voce dal menu laterale.
      </p>
    </Card>
  );
}
