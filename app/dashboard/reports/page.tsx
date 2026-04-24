import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { canAccessRole } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const KIND_LABELS: Record<string, string> = {
  INTERVENTION: 'Intervento',
  DAILY: 'Giornaliero',
  PROPERTY_HISTORY: 'Storico stabile',
  MONTHLY_HOURS: 'Ore mensili',
};

const LOCALE_LABELS: Record<string, string> = {
  it: '🇮🇹 IT',
  'de-ch': '🇨🇭 DE-CH',
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  if (!canAccessRole(session.user.role, ['AMMINISTRAZIONE'])) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const kindFilter = params.kind ?? '';
  const localeFilter = params.locale ?? '';

  const reports = await prisma.generatedReport.findMany({
    where: {
      ...(kindFilter ? { kind: kindFilter as 'INTERVENTION' | 'DAILY' | 'PROPERTY_HISTORY' | 'MONTHLY_HOURS' } : {}),
      ...(localeFilter ? { locale: localeFilter } : {}),
    },
    include: {
      generatedBy: true,
    },
    orderBy: { generatedAt: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Rapporti PDF</h1>
        <Link href="/dashboard/interventions" className="text-sm text-blue-600 hover:underline">
          ← Interventi
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <form className="flex flex-wrap gap-3">
          <select
            name="kind"
            defaultValue={kindFilter}
            className="rounded-md border px-2 py-1 text-sm"
          >
            <option value="">Tutti i tipi</option>
            {Object.entries(KIND_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            name="locale"
            defaultValue={localeFilter}
            className="rounded-md border px-2 py-1 text-sm"
          >
            <option value="">Tutte le lingue</option>
            <option value="it">🇮🇹 Italiano</option>
            <option value="de-ch">🇨🇭 Svizzero tedesco</option>
          </select>
          <button type="submit" className="rounded-md bg-slate-700 px-3 py-1 text-sm text-white">
            Filtra
          </button>
          <Link href="/dashboard/reports" className="rounded-md border px-3 py-1 text-sm hover:bg-slate-50">
            Reset
          </Link>
        </form>
      </Card>

      {/* Reports table */}
      <Card>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun rapporto generato.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-slate-500">
                  <th className="pb-2 pr-4">Data</th>
                  <th className="pb-2 pr-4">Tipo</th>
                  <th className="pb-2 pr-4">Lingua</th>
                  <th className="pb-2 pr-4">Variante</th>
                  <th className="pb-2 pr-4">Generato da</th>
                  <th className="pb-2">Download</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-slate-50">
                    <td className="py-2 pr-4 text-xs text-slate-500">
                      {r.generatedAt.toLocaleString('it-CH')}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge>{KIND_LABELS[r.kind] ?? r.kind}</Badge>
                    </td>
                    <td className="py-2 pr-4">{LOCALE_LABELS[r.locale] ?? r.locale}</td>
                    <td className="py-2 pr-4">{r.variant ?? '—'}</td>
                    <td className="py-2 pr-4">
                      {r.generatedBy.firstName} {r.generatedBy.lastName}
                    </td>
                    <td className="py-2">
                      <a
                        href={r.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        📥 PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
