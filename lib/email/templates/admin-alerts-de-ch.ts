/**
 * Template alert interni DE-CH. Convenzione progetto: nessuna "ß", sempre "ss".
 */

interface AlertContextIntervention {
  interventionId: number;
  propertyName: string;
  clientName: string;
  workerNames: string[];
  durationLabel: string;
  url: string;
}

interface AlertContextQuote {
  quoteNumber: string;
  clientName: string;
  totalChf: string;
  url: string;
}

interface AlertContextInvoice {
  invoiceNumber: string;
  clientName: string;
  totalChf: string;
  url: string;
}

interface AlertContextOcr {
  documentType: string;
  uploaderName: string;
  supplierName: string | null;
  totalChf: string | null;
  url: string;
}

interface ReminderContext {
  clientName: string;
  invoiceNumber: string;
  totalChf: string;
  dueDate: string;
  daysToDue: number;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapHtml(text: string): string {
  const paragraphs = text
    .split('\n\n')
    .map((p) => `<p style="margin: 0 0 12px 0;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
  return `<!doctype html><html><body style="font-family: Arial, sans-serif; font-size: 14px; color: #0f172a; line-height: 1.5;">${paragraphs}</body></html>`;
}

const ADMIN_FOOTER = `Automatische Benachrichtigung ASTSA Management.`;
const CLIENT_FOOTER = `Freundliche Gruesse,
ASTSA — Active Services Team SA
www.astsa.ch`;

export function alertInterventionExtraClosedDeCh(ctx: AlertContextIntervention) {
  const subject = `[ASTSA] EXTRA-Einsatz #${ctx.interventionId} abgeschlossen — Validierung erforderlich`;
  const text = `Ein EXTRA-Einsatz wurde abgeschlossen und wartet auf die administrative Validierung.

Liegenschaft: ${ctx.propertyName} (${ctx.clientName})
Einsatznummer: #${ctx.interventionId}
Dauer: ${ctx.durationLabel}
Mitarbeitende: ${ctx.workerNames.join(', ') || '—'}

Einsatz oeffnen: ${ctx.url}

${ADMIN_FOOTER}`;
  return { subject, text, html: wrapHtml(text) };
}

export function alertQuoteAcceptedDeCh(ctx: AlertContextQuote) {
  const subject = `[ASTSA] Offerte ${ctx.quoteNumber} angenommen — Rechnungsentwurf vorbereiten`;
  const text = `Die Kundschaft ${ctx.clientName} hat die Offerte ${ctx.quoteNumber} angenommen.

Betrag: CHF ${ctx.totalChf}

Sie kann nun in einen Rechnungsentwurf umgewandelt werden: ${ctx.url}

${ADMIN_FOOTER}`;
  return { subject, text, html: wrapHtml(text) };
}

export function alertInvoiceReadyExportDeCh(ctx: AlertContextInvoice) {
  const subject = `[ASTSA] Rechnungsentwurf ${ctx.invoiceNumber} bereit fuer Infoniqa`;
  const text = `Der Rechnungsentwurf ${ctx.invoiceNumber} (Kunde ${ctx.clientName}) ist im Status PRONTO_EXPORT.

Gesamtbetrag: CHF ${ctx.totalChf}

Den Infoniqa-Export bei Gelegenheit ausfuehren: ${ctx.url}

${ADMIN_FOOTER}`;
  return { subject, text, html: wrapHtml(text) };
}

export function alertOcrDocToValidateDeCh(ctx: AlertContextOcr) {
  const subject = `[ASTSA] Neues Dokument zur Validierung — ${ctx.documentType}`;
  const totalLine = ctx.totalChf ? `Betrag: CHF ${ctx.totalChf}\n` : '';
  const supplierLine = ctx.supplierName ? `Lieferant: ${ctx.supplierName}\n` : '';
  const text = `Ein neues Dokument wurde von ${ctx.uploaderName} hochgeladen und wartet auf die Validierung.

Typ: ${ctx.documentType}
${supplierLine}${totalLine}
Dokument oeffnen: ${ctx.url}

${ADMIN_FOOTER}`;
  return { subject, text, html: wrapHtml(text) };
}

export function invoiceReminderDeCh(ctx: ReminderContext) {
  const subject = `Erinnerung Rechnung ${ctx.invoiceNumber} — Faelligkeit ${ctx.dueDate}`;
  const dayLabel =
    ctx.daysToDue === 0
      ? 'heute faellig'
      : ctx.daysToDue === 1
        ? 'morgen faellig'
        : ctx.daysToDue > 0
          ? `in ${ctx.daysToDue} Tagen faellig`
          : `seit ${Math.abs(ctx.daysToDue)} Tagen faellig`;

  const text = `Sehr geehrte Damen und Herren,

wir erinnern Sie daran, dass die Rechnung ${ctx.invoiceNumber} ${dayLabel} ist (Faelligkeit ${ctx.dueDate}).

Betrag: CHF ${ctx.totalChf}

Falls Sie die Zahlung bereits vorgenommen haben, koennen Sie diese Nachricht ignorieren. Bei Rueckfragen koennen Sie uns gerne direkt antworten.

${CLIENT_FOOTER}`;
  return { subject, text, html: wrapHtml(text) };
}
