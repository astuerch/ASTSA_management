import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { QuotePdf } from '@/lib/pdf/QuotePdf';
import { InvoiceDraftPdf } from '@/lib/pdf/InvoiceDraftPdf';

const sampleData = {
  number: 'PR-2026-0001',
  subject: 'Appartamento Test – tinteggio',
  locale: 'it',
  documentDate: new Date('2026-04-01'),
  validUntil: new Date('2026-05-01'),
  client: {
    businessName: 'Cliente Test SA',
    address: 'Via Roma 1, 6900 Lugano',
    sageCustomerNumber: '1383',
  },
  lines: [
    {
      position: 1,
      description: 'Tinteggio (45 mq)',
      quantity: 45,
      unit: 'mq',
      unitPriceCents: 1200,
      discountCents: 0,
      vatCode: 'STANDARD' as const,
      netAmountCents: 54000,
      vatAmountCents: 4375,
      totalAmountCents: 58375,
    },
  ],
  subtotalCents: 54000,
  vatTotalCents: 4375,
  totalCents: 58375,
};

describe('pdf.quote', () => {
  it('renders QuotePdf to non-empty buffer (IT)', async () => {
    const element = React.createElement(QuotePdf, { data: sampleData });
    const buffer = await renderToBuffer(element as React.ReactElement<unknown>);
    expect(Buffer.from(buffer).length).toBeGreaterThan(1000);
  });

  it('renders QuotePdf to non-empty buffer (DE-CH)', async () => {
    const element = React.createElement(QuotePdf, { data: { ...sampleData, locale: 'de-ch' } });
    const buffer = await renderToBuffer(element as React.ReactElement<unknown>);
    expect(Buffer.from(buffer).length).toBeGreaterThan(1000);
  });
});

describe('pdf.invoice', () => {
  const invoiceData = {
    number: 'BZ-2026-0001',
    subject: 'Appartamento Test – tinteggio',
    locale: 'it',
    documentDate: new Date('2026-04-01'),
    dueDate: new Date('2026-05-01'),
    sequence: 1,
    client: {
      id: 1,
      businessName: 'Cliente Test SA',
      address: 'Via Roma 1, 6900 Lugano',
      sageCustomerNumber: '1383',
    },
    lines: [
      {
        position: 1,
        description: 'Tinteggio (45 mq)',
        quantity: 45,
        unit: 'mq',
        unitPriceCents: 1200,
        discountCents: 0,
        vatCode: 'STANDARD' as const,
        netAmountCents: 54000,
        vatAmountCents: 4375,
        totalAmountCents: 58375,
      },
    ],
    subtotalCents: 54000,
    vatTotalCents: 4375,
    totalCents: 58375,
  };

  it('renders InvoiceDraftPdf to non-empty buffer (IT)', async () => {
    const element = React.createElement(InvoiceDraftPdf, { data: invoiceData });
    const buffer = await renderToBuffer(element as React.ReactElement<unknown>);
    expect(Buffer.from(buffer).length).toBeGreaterThan(1000);
  });

  it('renders InvoiceDraftPdf to non-empty buffer (DE-CH)', async () => {
    const element = React.createElement(InvoiceDraftPdf, { data: { ...invoiceData, locale: 'de-ch' } });
    const buffer = await renderToBuffer(element as React.ReactElement<unknown>);
    expect(Buffer.from(buffer).length).toBeGreaterThan(1000);
  });
});
