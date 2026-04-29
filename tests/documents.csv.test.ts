import { describe, expect, it } from 'vitest';
import { buildIncomingDocumentsCsv } from '@/lib/documents/csv-export';

describe('buildIncomingDocumentsCsv', () => {
  it('genera header in italiano con BOM e separatore ;', () => {
    const csv = buildIncomingDocumentsCsv([]);
    expect(csv.startsWith('﻿')).toBe(true);
    const headerLine = csv.replace('﻿', '').split('\r\n')[0];
    const cols = headerLine.split(';');
    expect(cols).toContain('DataDocumento');
    expect(cols).toContain('Fornitore');
    expect(cols).toContain('Totale');
    expect(cols).toContain('FileUrl');
  });

  it('formatta le date in DD.MM.YYYY e gli importi con 2 decimali', () => {
    const csv = buildIncomingDocumentsCsv([
      {
        id: 'doc_1',
        type: 'FATTURA_FORNITORE',
        status: 'PRONTO_EXPORT',
        docDate: new Date('2026-04-12T10:00:00Z'),
        dueDate: null,
        supplierName: 'Migros',
        supplierVat: null,
        docNumber: 'F-001',
        currency: 'CHF',
        subtotalCents: 9250,
        vatCents: 750,
        totalCents: 10000,
        iban: null,
        category: null,
        client: null,
        property: null,
        interventionId: null,
        fileUrl: 'https://cdn/doc.pdf',
        notes: null,
      },
    ]);
    const dataLine = csv.split('\r\n')[1];
    expect(dataLine).toContain('12.04.2026');
    expect(dataLine).toContain('100.00');
    expect(dataLine).toContain('92.50');
    expect(dataLine).toContain('Migros');
  });

  it('quota i campi che contengono ; o virgolette', () => {
    const csv = buildIncomingDocumentsCsv([
      {
        id: 'doc_2',
        type: 'RICEVUTA',
        status: 'PRONTO_EXPORT',
        docDate: null,
        dueDate: null,
        supplierName: 'Pulizie; Co.',
        supplierVat: null,
        docNumber: null,
        currency: 'CHF',
        subtotalCents: null,
        vatCents: null,
        totalCents: null,
        iban: null,
        category: null,
        client: null,
        property: null,
        interventionId: null,
        fileUrl: 'https://cdn/x.pdf',
        notes: 'cliente ha detto "ok"',
      },
    ]);
    expect(csv).toContain('"Pulizie; Co."');
    expect(csv).toContain('"cliente ha detto ""ok"""');
  });
});
