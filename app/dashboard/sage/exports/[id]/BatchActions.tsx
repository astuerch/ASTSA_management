'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface BatchActionsProps {
  batchId: string;
  batchNumber: string;
  status: string;
}

type PendingAction = 'confirm' | 'cancel' | null;

export function BatchActions({ batchId, batchNumber, status }: BatchActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [cancelReason, setCancelReason] = useState('');

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sage/exports/${batchId}/zip`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Errore download');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sage-export-${batchNumber}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function executeConfirm() {
    setLoading(true);
    setError(null);
    setPendingAction(null);
    try {
      const res = await fetch(`/api/sage/exports/${batchId}/confirm`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Errore conferma');
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function executeCancel() {
    setLoading(true);
    setError(null);
    setPendingAction(null);
    try {
      const res = await fetch(`/api/sage/exports/${batchId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Errore annullamento');
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setCancelReason('');
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {pendingAction === 'confirm' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 space-y-3">
          <p className="text-sm font-medium">Confermi che l&apos;import in Infoniqa è stato completato?</p>
          <div className="flex gap-2">
            <Button onClick={executeConfirm} disabled={loading} size="sm">
              Sì, conferma
            </Button>
            <Button onClick={() => setPendingAction(null)} disabled={loading} variant="outline" size="sm">
              Annulla
            </Button>
          </div>
        </div>
      )}

      {pendingAction === 'cancel' && (
        <div className="bg-red-50 border border-red-200 rounded p-4 space-y-3">
          <p className="text-sm font-medium">Annulla questo batch export?</p>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            placeholder="Motivo annullamento (opzionale)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={executeCancel} disabled={loading} variant="outline" size="sm" className="text-red-600 border-red-300">
              Conferma annullamento
            </Button>
            <Button onClick={() => setPendingAction(null)} disabled={loading} variant="outline" size="sm">
              Indietro
            </Button>
          </div>
        </div>
      )}

      {!pendingAction && (
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleDownload} disabled={loading} variant="outline">
            Scarica ZIP
          </Button>
          {status === 'GENERATED' && (
            <>
              <Button onClick={() => setPendingAction('confirm')} disabled={loading}>
                Conferma import avvenuto
              </Button>
              <Button
                onClick={() => setPendingAction('cancel')}
                disabled={loading}
                variant="outline"
                className="text-red-600 border-red-300"
              >
                Annulla batch
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
