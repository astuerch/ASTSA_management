/**
 * Template email in italiano.
 * Funzioni pure: input → { subject, text, html }.
 * Tested via snapshot in tests/email.templates.test.ts.
 */

interface InterventionReportContext {
  clientName: string;
  propertyName: string;
  interventionDate: string; // formato DD.MM.YYYY
  interventionId: number;
  durationLabel: string; // es. "2h 15min"
  signerName?: string | null;
}

interface QuoteContext {
  clientName: string;
  quoteNumber: string;
  totalChf: string; // già formattato "1'250.00"
  validUntil?: string | null; // DD.MM.YYYY
  subject: string;
}

const SIGN_OFF = `Cordiali saluti,
ASTSA — Active Services Team SA
www.astsa.ch`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapHtml(bodyText: string): string {
  const paragraphs = bodyText
    .split('\n\n')
    .map((p) => `<p style="margin: 0 0 12px 0;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
  return `<!doctype html><html><body style="font-family: Arial, sans-serif; font-size: 14px; color: #0f172a; line-height: 1.5;">${paragraphs}</body></html>`;
}

export function interventionReportEmailIT(ctx: InterventionReportContext) {
  const subject = `Rapporto intervento del ${ctx.interventionDate} – ${ctx.propertyName}`;
  const text = `Gentile ${ctx.clientName},

in allegato trova il rapporto dell'intervento eseguito presso ${ctx.propertyName} in data ${ctx.interventionDate}.

Riferimento intervento: #${ctx.interventionId}
Durata totale: ${ctx.durationLabel}${ctx.signerName ? `\nFirmato da: ${ctx.signerName}` : ''}

Per qualsiasi chiarimento può rispondere a questa email.

${SIGN_OFF}`;

  return { subject, text, html: wrapHtml(text) };
}

export function quoteEmailIT(ctx: QuoteContext) {
  const subject = `Preventivo ${ctx.quoteNumber} – ${ctx.subject}`;
  const validityLine = ctx.validUntil ? `Il preventivo è valido fino al ${ctx.validUntil}.\n\n` : '';
  const text = `Gentile ${ctx.clientName},

in allegato trova il preventivo n. ${ctx.quoteNumber} per i lavori richiesti.

Importo totale: CHF ${ctx.totalChf}

${validityLine}Restiamo a disposizione per qualsiasi chiarimento o per concordare l'avvio dei lavori.

${SIGN_OFF}`;

  return { subject, text, html: wrapHtml(text) };
}
