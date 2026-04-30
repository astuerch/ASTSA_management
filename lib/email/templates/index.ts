import type { EmailLocale } from '../types';
import { interventionReportEmailDeCh, quoteEmailDeCh } from './de-ch';
import { interventionReportEmailIT, quoteEmailIT } from './it';

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
