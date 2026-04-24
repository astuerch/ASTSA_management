'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PhotoKind } from '@prisma/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const PHOTO_KIND_LABELS: Record<PhotoKind, string> = {
  PRIMA: 'Prima',
  DOPO: 'Dopo',
  ANOMALIA: 'Anomalia',
};

interface PhotoClientProps {
  interventionId: number;
}

export function PhotoClient({ interventionId }: PhotoClientProps) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [kind, setKind] = useState<PhotoKind>(PhotoKind.DOPO);
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleUpload() {
    if (!files || files.length === 0) {
      setStatus('Seleziona almeno una foto');
      return;
    }
    setStatus('Caricamento in corso…');
    let uploaded = 0;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `astsa/interventions/${interventionId}`);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        setStatus(`Errore caricamento ${file.name}`);
        return;
      }
      const data = (await res.json()) as { url: string; publicId: string };

      const actionRes = await fetch('/api/intervention/add-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interventionId, url: data.url, publicId: data.publicId, kind }),
      });
      if (!actionRes.ok) {
        setStatus('Errore salvataggio foto');
        return;
      }
      uploaded++;
    }

    setStatus(`✅ ${uploaded} foto caricate`);
    startTransition(() => router.refresh());
  }

  return (
    <Card>
      <h1 className="mb-4 text-xl font-bold">Aggiungi foto</h1>
      <div className="space-y-4">
        <div>
          <Label>Tipo foto</Label>
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as PhotoKind)}
          >
            {Object.entries(PHOTO_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Seleziona foto</Label>
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={(e) => setFiles(e.target.files)}
            className="mt-1 block w-full text-sm"
          />
        </div>

        {status && <p className="rounded-md bg-slate-100 px-3 py-2 text-sm">{status}</p>}

        <Button
          type="button"
          onClick={handleUpload}
          disabled={isPending}
          className="h-14 w-full bg-slate-700 text-base"
        >
          📷 Carica foto
        </Button>
      </div>
    </Card>
  );
}
