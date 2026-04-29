import React from 'react';
import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';
import { company } from '@/lib/company';
import type { VatCode } from '@prisma/client';
import { getVatRate } from '@/lib/swiss-rounding';

// ─── Colors ──────────────────────────────────────────────────────────────────

const colors = {
  black: '#000000',
  dark: '#333333',
  mid: '#666666',
  light: '#999999',
  border: '#CCCCCC',
  tableHeaderBg: '#EEEEEE',
  tableRowAlt: '#FAFAFA',
  white: '#FFFFFF',
  orange: '#E07B00',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.dark,
    paddingTop: 57, // 2cm
    paddingBottom: 57,
    paddingHorizontal: 57,
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logo: {
    width: 140,
    height: 40,
  },
  clientBlock: {
    textAlign: 'right',
    fontSize: 10,
    color: colors.dark,
  },
  companyBlock: {
    fontSize: 9,
    color: colors.mid,
    marginBottom: 16,
  },
  // Document info
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    width: 180,
    fontSize: 9,
    color: colors.mid,
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
    color: colors.dark,
  },
  infoValueOrange: {
    flex: 1,
    fontSize: 9,
    color: colors.orange,
    fontFamily: 'Helvetica-Bold',
  },
  // Title
  docTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: colors.black,
    marginTop: 12,
    marginBottom: 4,
  },
  docSubject: {
    fontSize: 10,
    color: colors.dark,
    marginBottom: 14,
  },
  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.tableHeaderBg,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRowEven: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  tableRowOdd: {
    flexDirection: 'row',
    backgroundColor: colors.tableRowAlt,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  colDesc: { flex: 3, fontSize: 9, color: colors.dark },
  colQty: { width: 45, fontSize: 9, color: colors.dark, textAlign: 'right' },
  colUnit: { width: 40, fontSize: 9, color: colors.dark, textAlign: 'center' },
  colVat: { width: 35, fontSize: 9, color: colors.dark, textAlign: 'right' },
  colPrice: { width: 65, fontSize: 9, color: colors.dark, textAlign: 'right' },
  colDiscount: { width: 55, fontSize: 9, color: colors.dark, textAlign: 'right' },
  colAmount: { width: 65, fontSize: 9, color: colors.dark, textAlign: 'right' },
  colDescHdr: { flex: 3, fontSize: 9, color: colors.black, fontFamily: 'Helvetica-Bold' },
  colQtyHdr: { width: 45, fontSize: 9, color: colors.black, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  colUnitHdr: { width: 40, fontSize: 9, color: colors.black, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  colVatHdr: { width: 35, fontSize: 9, color: colors.black, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  colPriceHdr: { width: 65, fontSize: 9, color: colors.black, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  colDiscountHdr: { width: 55, fontSize: 9, color: colors.black, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  colAmountHdr: { width: 65, fontSize: 9, color: colors.black, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  // Totals
  totalsSection: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 3,
    width: 280,
  },
  totalLabel: {
    flex: 1,
    fontSize: 9,
    color: colors.dark,
    textAlign: 'right',
    paddingRight: 10,
  },
  totalValue: {
    width: 90,
    fontSize: 9,
    color: colors.dark,
    textAlign: 'right',
  },
  totalGrossLabel: {
    flex: 1,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.black,
    textAlign: 'right',
    paddingRight: 10,
    textDecoration: 'underline',
  },
  totalGrossValue: {
    width: 90,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.black,
    textAlign: 'right',
    textDecoration: 'underline',
  },
  // Footer note
  reminderNote: {
    marginTop: 16,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.dark,
  },
  // Validity note (for quotes)
  validityNote: {
    marginTop: 6,
    fontSize: 9,
    color: colors.mid,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCHF(cents: number): string {
  return new Intl.NumberFormat('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('it-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PdfLine {
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  discountCents: number;
  vatCode: VatCode;
  netAmountCents: number;
  vatAmountCents: number;
  totalAmountCents: number;
}

export interface QuotePdfData {
  number: string;
  subject: string;
  locale: string;
  documentDate: Date;
  validUntil?: Date | null;
  notes?: string | null;
  client: {
    businessName: string;
    address?: string | null;
    sageCustomerNumber?: string | null;
  };
  lines: PdfLine[];
  subtotalCents: number;
  vatTotalCents: number;
  totalCents: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  data: QuotePdfData;
}

export function QuotePdf({ data }: Props) {
  const locale = (data.locale as Locale) ?? 'it';
  const vatBreakdown = buildVatBreakdown(data.lines);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src="/branding/logo-long.png" style={styles.logo} />
          <View style={styles.clientBlock}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{data.client.businessName}</Text>
            {data.client.address ? <Text>{data.client.address}</Text> : null}
          </View>
        </View>

        {/* ── Company data ── */}
        <View style={styles.companyBlock}>
          <Text>{company.address}, {company.city} | {company.website} | {company.email} | {company.vatNumber}</Text>
        </View>

        {/* ── Document info ── */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('invoice.documentDate', locale)}</Text>
          <Text style={styles.infoValue}>{formatDate(data.documentDate)}</Text>
        </View>
        {data.client.sageCustomerNumber ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('invoice.customerNumber', locale)}</Text>
            <Text style={styles.infoValue}>{data.client.sageCustomerNumber}</Text>
          </View>
        ) : null}
        {data.validUntil ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('quote.validity', locale)}</Text>
            <Text style={styles.infoValue}>{formatDate(data.validUntil)}</Text>
          </View>
        ) : null}

        {/* ── Title ── */}
        <Text style={styles.docTitle}>{t('quote.title', locale)} {data.number}</Text>
        <Text style={styles.docSubject}>{data.subject}</Text>

        {/* ── Table ── */}
        <TableHeader locale={locale} />
        {data.lines.map((line, idx) => (
          <LineRow key={line.position} line={line} idx={idx} />
        ))}

        {/* ── Totals ── */}
        <TotalsSection
          subtotalCents={data.subtotalCents}
          vatBreakdown={vatBreakdown}
          totalCents={data.totalCents}
          locale={locale}
        />

        {/* ── Footer note ── */}
        <Text style={styles.reminderNote}>{t('invoice.reminderNote', locale)}</Text>

        {data.notes ? (
          <Text style={styles.validityNote}>{data.notes}</Text>
        ) : null}
      </Page>
    </Document>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TableHeader({ locale }: { locale: Locale }) {
  return (
    <View style={styles.tableHeader}>
      <Text style={styles.colDescHdr}>{t('invoice.column.description', locale)}</Text>
      <Text style={styles.colQtyHdr}>{t('invoice.column.quantity', locale)}</Text>
      <Text style={styles.colUnitHdr}>{t('invoice.column.unit', locale)}</Text>
      <Text style={styles.colVatHdr}>{t('invoice.column.vat', locale)}</Text>
      <Text style={styles.colPriceHdr}>{t('invoice.column.price', locale)}</Text>
      <Text style={styles.colDiscountHdr}>{t('invoice.column.discount', locale)}</Text>
      <Text style={styles.colAmountHdr}>{t('invoice.column.amount', locale)}</Text>
    </View>
  );
}

function LineRow({ line, idx }: { line: PdfLine; idx: number }) {
  const rowStyle = idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd;
  const vatRate = getVatRate(line.vatCode);
  return (
    <View style={rowStyle}>
      <Text style={styles.colDesc}>{line.description}</Text>
      <Text style={styles.colQty}>{line.quantity.toLocaleString('de-CH', { maximumFractionDigits: 3 })}</Text>
      <Text style={styles.colUnit}>{line.unit}</Text>
      <Text style={styles.colVat}>{vatRate > 0 ? `${(vatRate * 100).toFixed(1)}%` : '—'}</Text>
      <Text style={styles.colPrice}>{formatCHF(line.unitPriceCents)}</Text>
      <Text style={styles.colDiscount}>{line.discountCents > 0 ? formatCHF(line.discountCents) : '—'}</Text>
      <Text style={styles.colAmount}>{formatCHF(line.netAmountCents)}</Text>
    </View>
  );
}

interface VatGroup {
  rate: number;
  baseCents: number;
  vatCents: number;
}

function buildVatBreakdown(lines: PdfLine[]): VatGroup[] {
  const map = new Map<number, VatGroup>();
  for (const line of lines) {
    const rate = getVatRate(line.vatCode);
    if (rate === 0) continue;
    const existing = map.get(rate);
    if (existing) {
      existing.baseCents += line.netAmountCents;
      existing.vatCents += line.vatAmountCents;
    } else {
      map.set(rate, { rate, baseCents: line.netAmountCents, vatCents: line.vatAmountCents });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.rate - a.rate);
}

function TotalsSection({
  subtotalCents,
  vatBreakdown,
  totalCents,
  locale,
}: {
  subtotalCents: number;
  vatBreakdown: VatGroup[];
  totalCents: number;
  locale: Locale;
}) {
  return (
    <View style={styles.totalsSection}>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{t('invoice.totalNet', locale)}</Text>
        <Text style={styles.totalValue}>{formatCHF(subtotalCents)}</Text>
      </View>
      {vatBreakdown.map((group) => {
        const label = t('invoice.totalVat', locale)
          .replace('{rate}', (group.rate * 100).toFixed(1))
          .replace('{base}', formatCHF(group.baseCents));
        return (
          <View key={group.rate} style={styles.totalRow}>
            <Text style={styles.totalLabel}>{label}</Text>
            <Text style={styles.totalValue}>{formatCHF(group.vatCents)}</Text>
          </View>
        );
      })}
      <View style={[styles.totalRow, { marginTop: 4 }]}>
        <Text style={styles.totalGrossLabel}>{t('invoice.totalGross', locale)}</Text>
        <Text style={styles.totalGrossValue}>{formatCHF(totalCents)}</Text>
      </View>
    </View>
  );
}
