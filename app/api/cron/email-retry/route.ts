import { NextRequest, NextResponse } from 'next/server';
import { processRetryQueue } from '@/lib/email/retry';

/**
 * Cron endpoint chiamato da Vercel Cron ogni ora (vedi vercel.json).
 *
 * Sicurezza: Vercel Cron passa header `Authorization: Bearer ${CRON_SECRET}`
 * per richieste autorizzate. In assenza di CRON_SECRET (dev locale) consentiamo
 * comunque la chiamata in modo da poter testare manualmente.
 */
export async function GET(req: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret) {
    const authHeader = req.headers.get('authorization') ?? '';
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await processRetryQueue();
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

// Anche POST consentito perché alcuni provider Cron preferiscono POST
export const POST = GET;
