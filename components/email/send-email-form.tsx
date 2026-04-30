'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

type Action = (formData: FormData) => Promise<void>;

interface Props {
  action: Action;
  /** Hidden field con l'ID del documento da inviare */
  hiddenFields: Record<string, string>;
  defaultRecipient?: string | null;
  /** Etichetta del bottone, es. "Invia rapporto al cliente" */
  buttonLabel: string;
}

export function SendEmailForm({
  action,
  hiddenFields,
  defaultRecipient,
  buttonLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError(null);
    try {
      await action(formData);
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
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
      action={handleSubmit}
      className="rounded-md border bg-slate-50 p-3 space-y-2 max-w-md"
    >
      {Object.entries(hiddenFields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

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
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? 'Invio in corso…' : 'Invia'}
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
