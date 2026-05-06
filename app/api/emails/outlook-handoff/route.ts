import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import {
  prepareOutlookHandoff,
  type HandoffType,
} from '@/lib/email/outlook-handoff';

const ADMIN_ROLES = ['AMMINISTRAZIONE', 'DIREZIONE'];

const bodySchema = z.object({
  type: z.enum(['INTERVENTION_REPORT', 'QUOTE', 'INVOICE_REMINDER']),
  id: z.string().min(1),
  locale: z.enum(['it', 'de-ch']).default('it'),
  recipientOverride: z.string().email().optional().or(z.literal('')),
});

/**
 * Endpoint di handoff Outlook: prende tipo + id, restituisce mailto URL +
 * PDF in base64. Il client apre Outlook con la mail precompilata e scarica
 * il PDF nei Download.
 *
 * Niente persistenza del PDF lato server.
 */
export async function POST(req: NextRequest) {
  const session = await requireRole(ADMIN_ROLES);
  const userId = Number(session.user?.id);
  if (!userId) {
    return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dati non validi' },
      { status: 400 },
    );
  }

  try {
    const result = await prepareOutlookHandoff(
      {
        type: parsed.data.type as HandoffType,
        id: parsed.data.id,
        locale: parsed.data.locale,
        recipientOverride: parsed.data.recipientOverride || null,
      },
      userId,
    );
    return NextResponse.json(result);
  } catch (err) {
    // Log everything we can get
    if (err instanceof Error) {
      console.error('[outlook-handoff] error message:', err.message);
      console.error('[outlook-handoff] error stack:', err.stack);
      console.error('[outlook-handoff] error name:', err.name);
      if ('cause' in err && err.cause) {
        console.error('[outlook-handoff] error cause:', err.cause);
      }
    } else {
      console.error('[outlook-handoff] non-error thrown:', err);
    }
    console.error('[outlook-handoff] payload was:', JSON.stringify(parsed.data));

    const message = err instanceof Error ? err.message : 'Errore sconosciuto';
    const userMessage = message.includes('Minified React error')
      ? 'Errore generazione PDF. Controlla i log server per i dettagli.'
      : message;
    return NextResponse.json({ error: userMessage }, { status: 400 });
  }
}
