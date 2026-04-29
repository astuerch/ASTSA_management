'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableCell, TableHead } from '@/components/ui/table';

interface Invoice {
  id: string;
  number: string;
  subject: string;
  totalCents: number;
  client: { businessName: string };
}

interface NewExportFormProps {
  invoices: Invoice[];
}

export function NewExportForm({ invoices }: NewExportFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === invoices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(invoices.map((i) => i.id)));
    }
  }

  async function handleSubmit() {
    if (selected.size === 0) {
      setError('Seleziona almeno una fattura');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sage/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Errore durante export');
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition') ?? '';
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'sage-export.zip';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      router.push('/dashboard/sage/exports');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const total = Array.from(selected).reduce((sum, id) => {
    const inv = invoices.find((i) => i.id === id);
    return sum + (inv?.totalCents ?? 0);
  }, 0);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <Table>
          <thead>
            <tr>
              <TableHead>
                <input
                  type="checkbox"
                  checked={selected.size === invoices.length && invoices.length > 0}
                  onChange={toggleAll}
                />
              </TableHead>
              <TableHead>Numero</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Oggetto</TableHead>
              <TableHead>Totale CHF</TableHead>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                  Nessuna fattura in stato PRONTO_EXPORT con numero cliente Sage.
                </TableCell>
              </tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(inv.id)}
                    onChange={() => toggle(inv.id)}
                  />
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm font-semibold">{inv.number}</span>
                </TableCell>
                <TableCell>{inv.client.businessName}</TableCell>
                <TableCell className="max-w-xs truncate">{inv.subject}</TableCell>
                <TableCell className="text-right font-mono">
                  {(inv.totalCents / 100).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                </TableCell>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {selected.size} fatture selezionate &bull; Totale:{' '}
          <span className="font-mono font-semibold">
            {(total / 100).toLocaleString('de-CH', { minimumFractionDigits: 2 })} CHF
          </span>
        </div>
        <Button onClick={handleSubmit} disabled={loading || selected.size === 0}>
          {loading ? 'Generazione in corso...' : 'Genera export e scarica ZIP'}
        </Button>
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  GENERATED: 'Generato',
  CONFIRMED_IMPORT: 'Importato',
  CANCELLED: 'Annullato',
};

const STATUS_COLORS: Record<string, string> = {
  GENERATED: 'bg-blue-100 text-blue-700',
  CONFIRMED_IMPORT: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge className={STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
