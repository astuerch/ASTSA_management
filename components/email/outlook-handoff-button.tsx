'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { HandoffType } from '@/lib/email/outlook-handoff';

interface Props {
  type: HandoffType;
  id: string;
  defaultRecipient?: string | null;
  /** Etichetta del bottone, es. "Prepara email rapporto per Outlook" */
  buttonLabel: string;
}

interface ApiResponse {
  mailtoUrl: string;
  filename: string;
  pdfBase64: string;
  logId: string;
}

function base64ToBlob(base64: string, contentType = 'application/pdf'): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
}

export function OutlookHandoffButton({
  type,
  id,
  defaultRecipient,
  buttonLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const locale = String(formData.get('locale') ?? 'it');
    const recipientOverride = String(formData.get('recipientOverride') ?? '');

    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/emails/outlook-handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, locale, recipientOverride }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Errore preparazione email');
      }
      const data = (await res.json()) as ApiResponse;

      // 1. Forza il download del PDF (se presente)
      if (data.pdfBase64) {
        const blob = base64ToBlob(data.pdfBase64);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // L'URL viene revocato dopo 1s per dare tempo al browser di gestire il download
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      // 2. Apre Outlook con la mail precompilata
      window.location.href = data.mailtoUrl;

      setInfo(
        data.pdfBase64
          ? '✓ PDF scaricato e Outlook aperto. Trascina il PDF nell\'email da Outlook prima di inviarlo.'
          : '✓ Outlook aperto con email precompilata.',
      );
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (info && !open) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
          {info}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => { setInfo(null); setOpen(true); }}>
          Prepara altra email
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        ✉️ {buttonLabel}
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-md border bg-slate-50 p-3 space-y-2 max-w-md"
    >
      <p className="text-xs text-slate-600">
        Cliccando &quot;Prepara&quot;: scarico il PDF nei tuoi Download e apro Outlook con
        oggetto e testo già precompilati. Tu trascini il PDF nella mail, controlli, e
        invii dal tuo account aziendale.
      </p>

      <div>
        <Label>Lingua email</Label>
        <Select name="locale" defaultValue="it">
          <option value="it">Italiano</option>
          <option value="de-ch">Deutsch (CH)</option>
        </Select>
      </div>

      <div>
        <Label>
          Email destinatario {defaultRecipient ? `(default: ${defaultRecipient})` : ''}
        </Label>
        <Input
          type="email"
          name="recipientOverride"
          placeholder={defaultRecipient ?? 'cliente@esempio.ch'}
        />
        {!defaultRecipient && (
          <p className="mt-1 text-xs text-amber-700">
            Nessuna email cliente in anagrafica: la inserisci direttamente in Outlook
            oppure qui sopra.
          </p>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? 'Preparazione…' : 'Prepara per Outlook'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          disabled={submitting}
        >
          Annulla
        </Button>
      </div>
    </form>
  );
}
