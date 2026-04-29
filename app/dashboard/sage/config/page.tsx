import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { canAccessRole } from '@/lib/permissions';
import { ConfigTable } from './ConfigTable';

export default async function SageConfigPage() {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);

  const session = await auth();
  const canEdit = canAccessRole(session?.user?.role ?? '', ['DIREZIONE']);

  const configs = await prisma.accountingConfig.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Configurazione contabile</h1>
        {!canEdit && (
          <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mt-2">
            Solo gli utenti con ruolo DIREZIONE possono modificare la configurazione.
          </p>
        )}
      </div>
      <ConfigTable configs={configs} canEdit={canEdit} />
    </div>
  );
}
