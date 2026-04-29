import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NewExportForm } from './ExportForm';

export default async function NewExportPage() {
  await requireRole(['AMMINISTRAZIONE', 'DIREZIONE']);

  const invoices = await prisma.invoiceDraft.findMany({
    where: {
      status: 'PRONTO_EXPORT',
      exportedBatchId: null,
      client: { sageCustomerNumber: { not: null } },
    },
    orderBy: { documentDate: 'asc' },
    include: { client: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Nuovo export Infoniqa</h1>
      <p className="text-sm text-gray-600">
        Seleziona le fatture in stato PRONTO_EXPORT da includere nell&apos;export.
        Verranno generati un file CSV Prima Nota e i PDF allegati in un unico archivio ZIP.
      </p>
      <NewExportForm
        invoices={invoices.map((inv) => ({
          id: inv.id,
          number: inv.number,
          subject: inv.subject,
          totalCents: inv.totalCents,
          client: { businessName: inv.client.businessName },
        }))}
      />
    </div>
  );
}
