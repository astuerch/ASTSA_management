import React from 'react';
import { Document, Page, View, Text, StyleSheet, Image, Svg, Path, Line } from '@react-pdf/renderer';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';
import { company } from '@/lib/company';
import type { VatCode } from '@prisma/client';
import { getVatRate } from '@/lib/swiss-rounding';
import { generateQRBillSvg, generateQRReference } from '@/lib/pdf/qrBill';
import { utils } from 'swissqrbill';

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
    paddingTop: 57,
    paddingBottom: 57,
    paddingHorizontal: 57,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logo: { width: 140, height: 40 },
  clientBlock: { textAlign: 'right', fontSize: 10, color: colors.dark },
  companyBlock: { fontSize: 9, color: colors.mid, marginBottom: 16 },
  infoRow: { flexDirection: 'row', marginBottom: 3 },
  infoLabel: { width: 180, fontSize: 9, color: colors.mid },
  infoValue: { flex: 1, fontSize: 9, color: colors.dark },
  infoValueOrange: { flex: 1, fontSize: 9, color: colors.orange, fontFamily: 'Helvetica-Bold' },
  docTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: colors.black, marginTop: 12, marginBottom: 4 },
  docSubject: { fontSize: 10, color: colors.dark, marginBottom: 14 },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.tableHeaderBg, paddingVertical: 5, paddingHorizontal: 4 },
  tableRowEven: { flexDirection: 'row', backgroundColor: colors.white, paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  tableRowOdd: { flexDirection: 'row', backgroundColor: colors.tableRowAlt, paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
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
  totalsSection: { marginTop: 10, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 3, width: 280 },
  totalLabel: { flex: 1, fontSize: 9, color: colors.dark, textAlign: 'right', paddingRight: 10 },
  totalValue: { width: 90, fontSize: 9, color: colors.dark, textAlign: 'right' },
  totalGrossLabel: { flex: 1, fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.black, textAlign: 'right', paddingRight: 10, textDecoration: 'underline' },
  totalGrossValue: { width: 90, fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.black, textAlign: 'right', textDecoration: 'underline' },
  reminderNote: { marginTop: 16, fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.dark },
  scissorLine: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  scissorText: { fontSize: 10, color: colors.mid, marginRight: 6 },
  dashedBorder: { flex: 1, borderTopWidth: 1, borderTopColor: colors.border, borderStyle: 'dashed' },
  // QR-bill section
  qrBillContainer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.black, paddingTop: 8 },
  qrBillReceipt: { width: 62, paddingRight: 8, borderRightWidth: 1, borderRightColor: colors.border },
  qrBillPayment: { flex: 1, paddingHorizontal: 8 },
  qrBillData: { width: 90, paddingLeft: 8 },
  qrBillSectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: colors.black, marginBottom: 4 },
  qrBillLabel: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: colors.black, marginTop: 4, marginBottom: 1 },
  qrBillValue: { fontSize: 8, color: colors.dark },
  qrBillSmall: { fontSize: 6, color: colors.mid },
  qrBillAcceptance: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: colors.black, textAlign: 'right', marginTop: 8 },
  qrImage: { width: 46, height: 46 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCHF(cents: number): string {
  return new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('it-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function buildVatBreakdown(lines: PdfLine[]): Array<{ rate: number; baseCents: number; vatCents: number }> {
  const map = new Map<number, { rate: number; baseCents: number; vatCents: number }>();
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

export interface InvoiceDraftPdfData {
  number: string;
  subject: string;
  locale: string;
  documentDate: Date;
  dueDate: Date;
  sequence: number;
  notes?: string | null;
  client: {
    id: number;
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
  data: InvoiceDraftPdfData;
}

export function InvoiceDraftPdf({ data }: Props) {
  const locale = (data.locale as Locale) ?? 'it';
  const vatBreakdown = buildVatBreakdown(data.lines);
  const qrReference = generateQRReference(data.client.id, data.sequence);
  const formattedRef = utils.formatQRReference(qrReference);

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
          <Text>
            {company.address}, {company.city} | {company.website} | {company.email} | {company.vatNumber}
          </Text>
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
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('invoice.dueDate', locale)}</Text>
          <Text style={styles.infoValueOrange}>{formatDate(data.dueDate)}</Text>
        </View>

        {/* ── Title ── */}
        <Text style={styles.docTitle}>
          {t('invoice.title', locale)} {data.number}
        </Text>
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

        {/* ── Reminder note ── */}
        <Text style={styles.reminderNote}>{t('invoice.reminderNote', locale)}</Text>

        {/* ── Dashed scissor line ── */}
        <View style={styles.scissorLine}>
          <Text style={styles.scissorText}>✂</Text>
          <View style={styles.dashedBorder} />
        </View>

        {/* ── QR-bill section ── */}
        <QRBillSection
          data={data}
          locale={locale}
          qrReference={qrReference}
          formattedRef={formattedRef}
        />
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

function TotalsSection({
  subtotalCents,
  vatBreakdown,
  totalCents,
  locale,
}: {
  subtotalCents: number;
  vatBreakdown: Array<{ rate: number; baseCents: number; vatCents: number }>;
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

function QRBillSection({
  data,
  locale,
  qrReference,
  formattedRef,
}: {
  data: InvoiceDraftPdfData;
  locale: Locale;
  qrReference: string;
  formattedRef: string;
}) {
  const amountChf = formatCHF(data.totalCents);

  return (
    <View style={styles.qrBillContainer}>
      {/* ── Receipt (left) ── */}
      <View style={styles.qrBillReceipt}>
        <Text style={styles.qrBillSectionTitle}>{t('qrBill.receipt', locale)}</Text>
        <Text style={styles.qrBillLabel}>{t('qrBill.payableTo', locale)}</Text>
        <Text style={styles.qrBillValue}>{company.ibanRaw}</Text>
        <Text style={styles.qrBillValue}>{company.name}</Text>
        <Text style={styles.qrBillValue}>{company.address}</Text>
        <Text style={styles.qrBillValue}>{company.city}</Text>
        <Text style={styles.qrBillLabel}>{t('qrBill.reference', locale)}</Text>
        <Text style={styles.qrBillValue}>{formattedRef}</Text>
        {data.client.businessName ? (
          <>
            <Text style={styles.qrBillLabel}>{t('qrBill.payableBy', locale)}</Text>
            <Text style={styles.qrBillValue}>{data.client.businessName}</Text>
            {data.client.address ? <Text style={styles.qrBillValue}>{data.client.address}</Text> : null}
          </>
        ) : null}
        <Text style={styles.qrBillLabel}>{t('qrBill.currency', locale)}</Text>
        <Text style={styles.qrBillValue}>CHF</Text>
        <Text style={styles.qrBillLabel}>{t('qrBill.amount', locale)}</Text>
        <Text style={styles.qrBillValue}>{amountChf}</Text>
        <Text style={styles.qrBillAcceptance}>{t('qrBill.acceptancePoint', locale)}</Text>
      </View>

      {/* ── Payment section (centre + right) ── */}
      <View style={styles.qrBillPayment}>
        <Text style={styles.qrBillSectionTitle}>{t('qrBill.payment', locale)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {/* QR placeholder image – in production use the actual QR SVG */}
          <View style={[styles.qrImage, { backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center', marginRight: 8 }]}>
            <Text style={{ fontSize: 6, color: colors.mid, textAlign: 'center' }}>QR</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.qrBillLabel}>{t('qrBill.payableTo', locale)}</Text>
            <Text style={styles.qrBillValue}>{company.ibanRaw}</Text>
            <Text style={styles.qrBillValue}>{company.name}</Text>
            <Text style={styles.qrBillValue}>{company.address}, {company.city}</Text>
          </View>
        </View>
        <Text style={styles.qrBillLabel}>{t('qrBill.reference', locale)}</Text>
        <Text style={styles.qrBillValue}>{formattedRef}</Text>
      </View>

      {/* ── Data (right) ── */}
      <View style={styles.qrBillData}>
        {data.client.businessName ? (
          <>
            <Text style={styles.qrBillLabel}>{t('qrBill.payableBy', locale)}</Text>
            <Text style={styles.qrBillValue}>{data.client.businessName}</Text>
            {data.client.address ? <Text style={styles.qrBillValue}>{data.client.address}</Text> : null}
          </>
        ) : null}
        <Text style={styles.qrBillLabel}>{t('qrBill.currency', locale)}</Text>
        <Text style={styles.qrBillValue}>CHF</Text>
        <Text style={styles.qrBillLabel}>{t('qrBill.amount', locale)}</Text>
        <Text style={styles.qrBillValue}>{amountChf}</Text>
      </View>
    </View>
  );
}
