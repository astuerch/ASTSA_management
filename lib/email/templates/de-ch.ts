/**
 * Template email in tedesco svizzero.
 * Convenzione progetto: nessun "ß" — usare sempre "ss".
 * Lo snapshot test verifica che il carattere "ß" non compaia mai.
 */

interface InterventionReportContext {
  clientName: string;
  propertyName: string;
  interventionDate: string;
  interventionId: number;
  durationLabel: string;
  signerName?: string | null;
}

interface QuoteContext {
  clientName: string;
  quoteNumber: string;
  totalChf: string;
  validUntil?: string | null;
  subject: string;
}

const SIGN_OFF = `Freundliche Gruesse,
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

export function interventionReportEmailDeCh(ctx: InterventionReportContext) {
  const subject = `Einsatzbericht vom ${ctx.interventionDate} – ${ctx.propertyName}`;
  const text = `Sehr geehrte Damen und Herren,

im Anhang finden Sie den Bericht des Einsatzes vom ${ctx.interventionDate} bei ${ctx.propertyName}.

Einsatznummer: #${ctx.interventionId}
Dauer: ${ctx.durationLabel}${ctx.signerName ? `\nUnterzeichnet von: ${ctx.signerName}` : ''}

Bei Fragen koennen Sie uns gerne direkt auf diese E-Mail antworten.

${SIGN_OFF}`;

  return { subject, text, html: wrapHtml(text) };
}

export function quoteEmailDeCh(ctx: QuoteContext) {
  const subject = `Offerte ${ctx.quoteNumber} – ${ctx.subject}`;
  const validityLine = ctx.validUntil ? `Die Offerte ist gueltig bis zum ${ctx.validUntil}.\n\n` : '';
  const text = `Sehr geehrte Damen und Herren,

im Anhang finden Sie die Offerte Nr. ${ctx.quoteNumber} fuer die angefragten Arbeiten.

Gesamtbetrag: CHF ${ctx.totalChf}

${validityLine}Wir stehen Ihnen fuer Rueckfragen oder fuer die Auftragserteilung gerne zur Verfuegung.

${SIGN_OFF}`;

  return { subject, text, html: wrapHtml(text) };
}
