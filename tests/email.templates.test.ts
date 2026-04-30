import { describe, expect, it } from 'vitest';
import {
  buildInterventionReportEmail,
  buildQuoteEmail,
} from '@/lib/email/templates';

const interventionCtx = {
  clientName: 'Studio Rossi SA',
  propertyName: 'Via Nassa 5',
  interventionDate: '12.04.2026',
  interventionId: 42,
  durationLabel: '2h 15min',
  signerName: 'Mario Rossi',
};

const quoteCtx = {
  clientName: 'Studio Rossi SA',
  quoteNumber: 'PR-2026-0001',
  totalChf: '1’250.00',
  validUntil: '12.05.2026',
  subject: 'Pulizia facciate primaverile',
};

describe('email templates IT', () => {
  it('rapporto intervento: subject contiene data e stabile', () => {
    const m = buildInterventionReportEmail('it', interventionCtx);
    expect(m.subject).toContain('12.04.2026');
    expect(m.subject).toContain('Via Nassa 5');
    expect(m.text).toContain('Studio Rossi SA');
    expect(m.text).toContain('#42');
    expect(m.text).toContain('2h 15min');
    expect(m.html).toContain('<html>');
  });

  it('preventivo: subject contiene numero', () => {
    const m = buildQuoteEmail('it', quoteCtx);
    expect(m.subject).toContain('PR-2026-0001');
    expect(m.text).toContain('CHF 1’250.00');
    expect(m.text).toContain('12.05.2026');
  });
});

describe('email templates DE-CH', () => {
  it('rapporto: nessuna ß (convenzione progetto)', () => {
    const m = buildInterventionReportEmail('de-ch', interventionCtx);
    expect(m.subject).not.toMatch(/ß/);
    expect(m.text).not.toMatch(/ß/);
    expect(m.html).not.toMatch(/ß/);
  });

  it('preventivo: nessuna ß', () => {
    const m = buildQuoteEmail('de-ch', quoteCtx);
    expect(m.subject).not.toMatch(/ß/);
    expect(m.text).not.toMatch(/ß/);
  });

  it('rapporto: usa "Einsatzbericht" (terminologia DE-CH)', () => {
    const m = buildInterventionReportEmail('de-ch', interventionCtx);
    expect(m.subject).toContain('Einsatzbericht');
    expect(m.text).toContain('Freundliche Gruesse');
  });

  it('preventivo: usa "Offerte"', () => {
    const m = buildQuoteEmail('de-ch', quoteCtx);
    expect(m.subject).toContain('Offerte');
  });
});

describe('escape HTML', () => {
  it('caratteri speciali nel nome cliente non rompono l\'html', () => {
    const m = buildInterventionReportEmail('it', {
      ...interventionCtx,
      clientName: 'Foo & <script>alert(1)</script>',
    });
    expect(m.html).toContain('&amp;');
    expect(m.html).toContain('&lt;script&gt;');
    expect(m.html).not.toContain('<script>alert');
  });
});
