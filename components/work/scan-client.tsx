'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { uploadAndRedirectFromMobile } from '@/lib/actions/incomingDocuments';

const MAX_BYTES = 2 * 1024 * 1024; // soft limit lato client per upload mobile

/**
 * Compressione client-side semplice: ridimensiona e ri-encode in JPEG fino a
 * stare sotto MAX_BYTES. Mantiene l'aspect ratio. Salta la compressione per i PDF.
 */
async function compressIfNeeded(file: File): Promise<File> {
  if (file.type === 'application/pdf') return file;
  if (file.size <= MAX_BYTES) return file;
  if (typeof window === 'undefined') return file;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  let { width, height } = img;
  const MAX_DIM = 2000;
  if (width > MAX_DIM || height > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  // Tenta diversi livelli di qualità finché si scende sotto il limite
  for (const quality of [0.85, 0.7, 0.55]) {
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality),
    );
    if (blob && blob.size <= MAX_BYTES) {
      return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    }
  }

  // Fallback: restituisci comunque la versione compressa più aggressiva
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.55),
  );
  return blob
    ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
    : file;
}

export function ScanClient() {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressIfNeeded(file);

    // Reinietta il file (eventualmente compresso) nel input
    const dt = new DataTransfer();
    dt.items.add(compressed);
    if (fileInputRef.current) fileInputRef.current.files = dt.files;

    if (compressed.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(compressed));
    } else {
      setPreviewUrl(null);
    }
    setInfo(`${(compressed.size / 1024).toFixed(0)} KB · ${compressed.type || 'file'}`);
  }

  return (
    <form
      ref={formRef}
      action={uploadAndRedirectFromMobile}
      onSubmit={() => setSubmitting(true)}
      encType="multipart/form-data"
      className="space-y-4"
    >
      <div>
        <Label>Tipo documento</Label>
        <Select name="type" defaultValue="RICEVUTA" required>
          <option value="RICEVUTA">Ricevuta / Scontrino</option>
          <option value="FATTURA_FORNITORE">Fattura fornitore</option>
          <option value="BOLLA_CONSEGNA">Bolla di consegna</option>
        </Select>
      </div>

      <div>
        <Label>Scatta foto o seleziona file</Label>
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept="image/*,application/pdf"
          capture="environment"
          required
          onChange={handleFileChange}
          className="block w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
        {info && <p className="mt-1 text-xs text-slate-500">{info}</p>}
      </div>

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="anteprima"
          className="max-h-72 w-full rounded-md border object-contain"
        />
      )}

      <div>
        <Label>Note (facoltativo)</Label>
        <Textarea name="notes" placeholder="Es. carburante furgone giovedì mattina" rows={2} />
      </div>

      <Button type="submit" className="h-14 w-full text-base" disabled={submitting}>
        {submitting ? 'Caricamento…' : 'Invia per OCR'}
      </Button>
      <p className="text-xs text-slate-500">
        L&apos;ufficio amministrazione validerà il documento entro le ore successive. Le foto sopra
        i 2 MB vengono compresse automaticamente.
      </p>
    </form>
  );
}
