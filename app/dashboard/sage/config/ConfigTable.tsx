'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AccountingConfig } from '@prisma/client';

const CATEGORY_LABELS: Record<string, string> = {
  ACCOUNT: 'Conti contabili',
  VAT_CODE: 'Codici IVA',
  COST_CENTER: 'Centri di costo',
  GENERAL: 'Generali',
};

interface ConfigTableProps {
  configs: AccountingConfig[];
  canEdit: boolean;
}

export function ConfigTable({ configs, canEdit }: ConfigTableProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(configs.map((c) => [c.id, c.value])),
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = configs.reduce<Record<string, AccountingConfig[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});

  async function handleSave(config: AccountingConfig) {
    setSaving(config.id);
    setError(null);
    try {
      const res = await fetch(`/api/sage/config/${encodeURIComponent(config.key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: values[config.id] }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Errore salvataggio');
      }
      setEditing(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h2 className="text-base font-semibold mb-2">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Chiave</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Valore</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Descrizione</th>
                  {canEdit && <th className="px-4 py-2" />}
                </tr>
              </thead>
              <tbody>
                {items.map((config) => (
                  <tr key={config.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs text-gray-600">{config.key}</td>
                    <td className="px-4 py-2">
                      {editing === config.id ? (
                        <input
                          className="border rounded px-2 py-1 text-sm w-32"
                          value={values[config.id]}
                          onChange={(e) =>
                            setValues((prev) => ({ ...prev, [config.id]: e.target.value }))
                          }
                        />
                      ) : (
                        <span className="font-mono">{values[config.id]}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{config.description}</td>
                    {canEdit && (
                      <td className="px-4 py-2">
                        {editing === config.id ? (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleSave(config)}
                              disabled={saving === config.id}
                              className="text-xs px-2 py-1 h-7"
                            >
                              Salva
                            </Button>
                            <Button
                              onClick={() => {
                                setEditing(null);
                                setValues((prev) => ({ ...prev, [config.id]: config.value }));
                              }}
                              variant="outline"
                              className="text-xs px-2 py-1 h-7"
                            >
                              Annulla
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setEditing(config.id)}
                            variant="outline"
                            className="text-xs px-2 py-1 h-7"
                          >
                            Modifica
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
