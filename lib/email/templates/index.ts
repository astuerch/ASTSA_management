import type { EmailLocale } from '../types';
import { interventionReportEmailDeCh, quoteEmailDeCh } from './de-ch';
import { interventionReportEmailIT, quoteEmailIT } from './it';
import {
  alertInterventionExtraClosedDeCh,
  alertInvoiceReadyExportDeCh,
  alertOcrDocToValidateDeCh,
  alertQuoteAcceptedDeCh,
  invoiceReminderDeCh,
} from './admin-alerts-de-ch';
import {
  alertInterventionExtraClosedIT,
  alertInvoiceReadyExportIT,
  alertOcrDocToValidateIT,
  alertQuoteAcceptedIT,
  invoiceReminderIT,
} from './admin-alerts-it';

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

export function buildInterventionReportEmail(
  locale: EmailLocale,
  ctx: InterventionReportContext,
) {
  return locale === 'de-ch'
    ? interventionReportEmailDeCh(ctx)
    : interventionReportEmailIT(ctx);
}

export function buildQuoteEmail(locale: EmailLocale, ctx: QuoteContext) {
  return locale === 'de-ch' ? quoteEmailDeCh(ctx) : quoteEmailIT(ctx);
}

interface AdminAlertInterventionContext {
  interventionId: number;
  propertyName: string;
  clientName: string;
  workerNames: string[];
  durationLabel: string;
  url: string;
}

interface AdminAlertQuoteContext {
  quoteNumber: string;
  clientName: string;
  totalChf: string;
  url: string;
}

interface AdminAlertInvoiceContext {
  invoiceNumber: string;
  clientName: string;
  totalChf: string;
  url: string;
}

interface AdminAlertOcrContext {
  documentType: string;
  uploaderName: string;
  supplierName: string | null;
  totalChf: string | null;
  url: string;
}

interface InvoiceReminderContext {
  clientName: string;
  invoiceNumber: string;
  totalChf: string;
  dueDate: string;
  daysToDue: number;
}

export function buildAlertInterventionExtraClosed(
  locale: EmailLocale,
  ctx: AdminAlertInterventionContext,
) {
  return locale === 'de-ch'
    ? alertInterventionExtraClosedDeCh(ctx)
    : alertInterventionExtraClosedIT(ctx);
}

export function buildAlertQuoteAccepted(
  locale: EmailLocale,
  ctx: AdminAlertQuoteContext,
) {
  return locale === 'de-ch' ? alertQuoteAcceptedDeCh(ctx) : alertQuoteAcceptedIT(ctx);
}

export function buildAlertInvoiceReadyExport(
  locale: EmailLocale,
  ctx: AdminAlertInvoiceContext,
) {
  return locale === 'de-ch'
    ? alertInvoiceReadyExportDeCh(ctx)
    : alertInvoiceReadyExportIT(ctx);
}

export function buildAlertOcrDocToValidate(
  locale: EmailLocale,
  ctx: AdminAlertOcrContext,
) {
  return locale === 'de-ch'
    ? alertOcrDocToValidateDeCh(ctx)
    : alertOcrDocToValidateIT(ctx);
}

export function buildInvoiceReminder(
  locale: EmailLocale,
  ctx: InvoiceReminderContext,
) {
  return locale === 'de-ch' ? invoiceReminderDeCh(ctx) : invoiceReminderIT(ctx);
}
