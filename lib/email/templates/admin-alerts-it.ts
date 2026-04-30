/**
 * Template alert interni IT (mittente staff/admin, NON cliente).
 * Tono operativo: cosa è successo + link diretto al dashboard.
 */

interface AlertContextIntervention {
  interventionId: number;
  propertyName: string;
  clientName: string;
  workerNames: string[];
  durationLabel: string;
  url: string; // assoluto
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
  dueDate: string; // DD.MM.YYYY
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

const ADMIN_FOOTER = `Notifica automatica ASTSA Management.`;
const CLIENT_FOOTER = `Cordiali saluti,
ASTSA — Active Services Team SA
www.astsa.ch`;

export function alertInterventionExtraClosedIT(ctx: AlertContextIntervention) {
  const subject = `[ASTSA] Intervento EXTRA #${ctx.interventionId} chiuso — da validare`;
  const text = `Un intervento EXTRA è stato chiuso e attende validazione amministrativa.

Stabile: ${ctx.propertyName} (${ctx.clientName})
Intervento: #${ctx.interventionId}
Durata: ${ctx.durationLabel}
Operatori: ${ctx.workerNames.join(', ') || '—'}

Apri intervento: ${ctx.url}

${ADMIN_FOOTER}`;
  return { subject, text, html: wrapHtml(text) };
}

export function alertQuoteAcceptedIT(ctx: AlertContextQuote) {
  const subject = `[ASTSA] Preventivo ${ctx.quoteNumber} accettato — prepara bozza fattura`;
  const text = `Il cliente ${ctx.clientName} ha accettato il preventivo ${ctx.quoteNumber}.

Importo: CHF ${ctx.totalChf}

È possibile trasformarlo in bozza fattura: ${ctx.url}

${ADMIN_FOOTER}`;
  return { subject, text, html: wrapHtml(text) };
}

export function alertInvoiceReadyExportIT(ctx: AlertContextInvoice) {
  const subject = `[ASTSA] Bozza fattura ${ctx.invoiceNumber} pronta per Infoniqa`;
  const text = `La bozza fattura ${ctx.invoiceNumber} (cliente ${ctx.clientName}) è in stato PRONTO_EXPORT.

Importo totale: CHF ${ctx.totalChf}

Esegui l'export Infoniqa quando opportuno: ${ctx.url}

${ADMIN_FOOTER}`;
  return { subject, text, html: wrapHtml(text) };
}

export function alertOcrDocToValidateIT(ctx: AlertContextOcr) {
  const subject = `[ASTSA] Nuovo documento da validare — ${ctx.documentType}`;
  const totalLine = ctx.totalChf ? `Importo: CHF ${ctx.totalChf}\n` : '';
  const supplierLine = ctx.supplierName ? `Fornitore: ${ctx.supplierName}\n` : '';
  const text = `Un nuovo documento è stato caricato da ${ctx.uploaderName} ed è in attesa di validazione.

Tipo: ${ctx.documentType}
${supplierLine}${totalLine}
Apri documento: ${ctx.url}

${ADMIN_FOOTER}`;
  return { subject, text, html: wrapHtml(text) };
}

export function invoiceReminderIT(ctx: ReminderContext) {
  const subject = `Promemoria fattura ${ctx.invoiceNumber} — scadenza ${ctx.dueDate}`;
  const dayLabel =
    ctx.daysToDue === 0
      ? 'in scadenza oggi'
      : ctx.daysToDue === 1
        ? 'in scadenza domani'
        : ctx.daysToDue > 0
          ? `in scadenza tra ${ctx.daysToDue} giorni`
          : `scaduta da ${Math.abs(ctx.daysToDue)} giorni`;

  const text = `Gentile ${ctx.clientName},

le ricordiamo che la fattura ${ctx.invoiceNumber} è ${dayLabel} (scadenza ${ctx.dueDate}).

Importo: CHF ${ctx.totalChf}

Se ha già provveduto al pagamento, può ignorare questo messaggio. Per qualsiasi chiarimento può rispondere a questa email.

${CLIENT_FOOTER}`;
  return { subject, text, html: wrapHtml(text) };
}
