import { prisma } from '@/lib/prisma';
import { sendEmail } from './provider';
import type { EmailMessage } from './types';

/**
 * Retry policy:
 * - retryCount = numero di retry già tentati (0 = nessun retry, solo invio iniziale)
 * - max retry = 3 → totale 4 tentativi (1 iniziale + 3 retry)
 * - backoff: 1h → 4h → 16h
 */
const MAX_RETRIES = 3;
const BACKOFF_HOURS = [1, 4, 16];

export function nextRetryAtFor(retryCount: number, base: Date = new Date()): Date | null {
  // retryCount = numero di retry GIÀ tentati. Quindi se retryCount=0 e l'invio
  // iniziale è fallito, schedula il PRIMO retry tra BACKOFF_HOURS[0] ore.
  if (retryCount >= MAX_RETRIES) return null;
  const hours = BACKOFF_HOURS[retryCount] ?? BACKOFF_HOURS[BACKOFF_HOURS.length - 1];
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

export interface RetryProcessResult {
  scanned: number;
  retried: number;
  succeeded: number;
  stillFailing: number;
  exhausted: number;
}

/**
 * Trova le email FALLITO con `nextRetryAt <= now` e `retryCount < MAX_RETRIES`,
 * tenta il reinvio per ognuna, aggiorna stato + retryCount + nextRetryAt.
 *
 * NB: il messaggio originale (text/html/attachment) NON è memorizzato in
 * EmailLog. Per ora il retry è limitato agli invii senza allegato (alert
 * admin, reminder fattura). Per i rapporti/preventivi con PDF allegato il
 * retry richiederebbe re-rendering del PDF — lo facciamo solo se utile,
 * altrimenti l'admin ricarica manualmente con il bottone "Riinvia" (che fa
 * partire un nuovo invio dal detail del documento).
 *
 * Per il foundation: il cron retry tenta solo log con `attachmentName == null`.
 * I retry manuali da UI per i log con allegato passano dalle action originali.
 */
export async function processRetryQueue(now: Date = new Date()): Promise<RetryProcessResult> {
  const candidates = await prisma.emailLog.findMany({
    where: {
      status: 'FALLITO',
      retryCount: { lt: MAX_RETRIES },
      nextRetryAt: { lte: now, not: null },
      attachmentName: null,
    },
    orderBy: { nextRetryAt: 'asc' },
    take: 50, // budget per esecuzione cron
  });

  let succeeded = 0;
  let stillFailing = 0;
  let exhausted = 0;

  for (const log of candidates) {
    // Per ora ricostruiamo il messaggio dal subject/recipient.
    // Body originale non disponibile → riusiamo il subject come testo, segnalando
    // che è un retry. NON ideale ma ammissibile per gli alert interni che
    // hanno subject auto-esplicativo. Per i tipi che richiedono body completo
    // (es. INVOICE_REMINDER), rieseguire dall'azione originale.
    const message: EmailMessage = {
      to: log.recipientEmail,
      cc: log.ccEmails ? log.ccEmails.split(',').filter(Boolean) : undefined,
      subject: `[retry] ${log.subject}`,
      text: `Tentativo di invio nuovamente schedulato.\nOggetto originale: ${log.subject}\nRiferimento: ${log.referenceId}`,
      html: `<p>Tentativo di invio nuovamente schedulato.</p><p><strong>Oggetto originale:</strong> ${log.subject}<br/><strong>Riferimento:</strong> ${log.referenceId}</p>`,
    };

    const result = await sendEmail(message);
    const newRetryCount = log.retryCount + 1;

    if (result.success) {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: 'INVIATO',
          retryCount: newRetryCount,
          nextRetryAt: null,
          errorMessage: null,
          providerMessageId: result.messageId ?? null,
        },
      });
      succeeded++;
    } else {
      const next = nextRetryAtFor(newRetryCount, now);
      await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          retryCount: newRetryCount,
          nextRetryAt: next,
          errorMessage: result.errorMessage ?? null,
        },
      });
      if (next === null) exhausted++;
      else stillFailing++;
    }
  }

  return {
    scanned: candidates.length,
    retried: candidates.length,
    succeeded,
    stillFailing,
    exhausted,
  };
}
