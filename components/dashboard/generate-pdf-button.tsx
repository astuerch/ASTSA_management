'use client';

import { useState } from 'react';

interface Props {
  interventionId: number;
  isAdmin: boolean;
}

export function GeneratePdfButton({ interventionId, isAdmin }: Props) {
  const [loading, setLoading] = useState(false);

  const download = async (locale: string, variant: string) => {
    setLoading(true);
    try {
      const url = `/api/reports/intervention/${interventionId}?locale=${locale}&variant=${variant}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? 'Errore generazione PDF');
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `rapporto-intervento-${interventionId}-${locale}-${variant}.pdf`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <details className="rounded-md border">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium flex items-center gap-2">
          📄 Genera PDF {loading && <span className="text-xs text-slate-500">(caricamento...)</span>}
        </summary>
        <div className="absolute right-0 z-10 mt-1 w-52 rounded-md border bg-white shadow-lg">
          <div className="py-1">
            <button
              onClick={() => download('it', 'client')}
              disabled={loading}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              🇮🇹 Cliente (IT)
            </button>
            <button
              onClick={() => download('de-ch', 'client')}
              disabled={loading}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              🇨🇭 Cliente (DE-CH)
            </button>
            {isAdmin && (
              <>
                <div className="my-1 border-t" />
                <button
                  onClick={() => download('it', 'internal')}
                  disabled={loading}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                >
                  🔒 Interno (IT)
                </button>
                <button
                  onClick={() => download('de-ch', 'internal')}
                  disabled={loading}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                >
                  🔒 Interno (DE-CH)
                </button>
              </>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
