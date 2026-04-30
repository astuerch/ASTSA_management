import { describe, expect, it } from 'vitest';
import {
  buildAlertInterventionExtraClosed,
  buildAlertInvoiceReadyExport,
  buildAlertOcrDocToValidate,
  buildAlertQuoteAccepted,
  buildInvoiceReminder,
} from '@/lib/email/templates';

const interventionCtx = {
  interventionId: 42,
  propertyName: 'Via Nassa 5',
  clientName: 'Studio Rossi SA',
  workerNames: ['Mario Rossi', 'Anna Bianchi'],
  durationLabel: '2h 15min',
  url: 'https://app.astsa.ch/dashboard/interventions/42',
};

const quoteCtx = {
  quoteNumber: 'PR-2026-0001',
  clientName: 'Studio Rossi SA',
  totalChf: '1’250.00',
  url: 'https://app.astsa.ch/dashboard/quotes/q1',
};

const invoiceCtx = {
  invoiceNumber: 'BZ-2026-0010',
  clientName: 'Studio Rossi SA',
  totalChf: '2’500.00',
  url: 'https://app.astsa.ch/dashboard/invoices/i1',
};

const ocrCtx = {
  documentType: 'Fattura fornitore',
  uploaderName: 'Mario Rossi',
  supplierName: 'Migros Lugano',
  totalChf: '120.00',
  url: 'https://app.astsa.ch/dashboard/documents/d1',
};

const reminderCtx = {
  clientName: 'Studio Rossi SA',
  invoiceNumber: 'BZ-2026-0010',
  totalChf: '2’500.00',
  dueDate: '15.05.2026',
  daysToDue: 5,
};

describe('admin alerts IT', () => {
  it('intervento extra: subject contiene #N e include URL nel body', () => {
    const m = buildAlertInterventionExtraClosed('it', interventionCtx);
    expect(m.subject).toContain('#42');
    expect(m.subject).toContain('EXTRA');
    expect(m.text).toContain('Via Nassa 5');
    expect(m.text).toContain('Studio Rossi SA');
    expect(m.text).toContain(interventionCtx.url);
    expect(m.text).toContain('2h 15min');
  });

  it('preventivo accettato: contiene numero e prepara bozza', () => {
    const m = buildAlertQuoteAccepted('it', quoteCtx);
    expect(m.subject).toContain('PR-2026-0001');
    expect(m.text).toContain('CHF 1’250.00');
    expect(m.text).toContain(quoteCtx.url);
  });

  it('bozza fattura pronta: contiene numero e link Infoniqa', () => {
    const m = buildAlertInvoiceReadyExport('it', invoiceCtx);
    expect(m.subject).toContain('BZ-2026-0010');
    expect(m.subject).toContain('Infoniqa');
    expect(m.text).toContain(invoiceCtx.url);
  });

  it('OCR doc: include uploader e fornitore opzionale', () => {
    const m = buildAlertOcrDocToValidate('it', ocrCtx);
    expect(m.text).toContain('Mario Rossi');
    expect(m.text).toContain('Migros Lugano');
    expect(m.text).toContain('CHF 120.00');
  });

  it('OCR doc senza supplier o totale gestisce omissioni', () => {
    const m = buildAlertOcrDocToValidate('it', {
      ...ocrCtx,
      supplierName: null,
      totalChf: null,
    });
    expect(m.text).not.toContain('Fornitore:');
    expect(m.text).not.toContain('Importo:');
  });
});

describe('admin alerts DE-CH (no ß)', () => {
  it('intervento extra', () => {
    const m = buildAlertInterventionExtraClosed('de-ch', interventionCtx);
    expect(m.subject).not.toMatch(/ß/);
    expect(m.text).not.toMatch(/ß/);
    expect(m.subject).toContain('EXTRA-Einsatz');
  });

  it('preventivo accettato usa Offerte', () => {
    const m = buildAlertQuoteAccepted('de-ch', quoteCtx);
    expect(m.subject).toContain('Offerte');
    expect(m.text).not.toMatch(/ß/);
  });

  it('bozza fattura usa Rechnungsentwurf e Faelligkeit ortografato senza ß', () => {
    const m = buildAlertInvoiceReadyExport('de-ch', invoiceCtx);
    expect(m.subject).toContain('Rechnungsentwurf');
    expect(m.text).not.toMatch(/ß/);
  });

  it('OCR doc DE-CH', () => {
    const m = buildAlertOcrDocToValidate('de-ch', ocrCtx);
    expect(m.subject).toContain('Validierung');
    expect(m.text).not.toMatch(/ß/);
  });
});

describe('reminder fattura', () => {
  it('IT: 5 giorni → "in scadenza tra 5 giorni"', () => {
    const m = buildInvoiceReminder('it', reminderCtx);
    expect(m.text).toContain('in scadenza tra 5 giorni');
    expect(m.subject).toContain('BZ-2026-0010');
    expect(m.text).toContain('15.05.2026');
  });

  it('IT: oggi → "in scadenza oggi"', () => {
    const m = buildInvoiceReminder('it', { ...reminderCtx, daysToDue: 0 });
    expect(m.text).toContain('in scadenza oggi');
  });

  it('IT: scaduta da N giorni', () => {
    const m = buildInvoiceReminder('it', { ...reminderCtx, daysToDue: -3 });
    expect(m.text).toContain('scaduta da 3 giorni');
  });

  it('DE-CH: nessun ß e usa Faelligkeit', () => {
    const m = buildInvoiceReminder('de-ch', reminderCtx);
    expect(m.text).not.toMatch(/ß/);
    expect(m.subject).toContain('Faelligkeit');
  });
});
