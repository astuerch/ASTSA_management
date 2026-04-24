import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';

// Color palette (monochrome for text/tables, logo stays colored)
export const colors = {
  black: '#000000',
  dark: '#333333',
  mid: '#666666',
  light: '#999999',
  border: '#cccccc',
  bg: '#f8f8f8',
  white: '#ffffff',
};

export const baseStyles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.dark,
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 56,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  logoArea: {
    width: 160,
  },
  companyBlock: {
    textAlign: 'right',
    fontSize: 9,
    color: colors.mid,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: colors.black,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colors.black,
    marginTop: 16,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 140,
    fontSize: 9,
    color: colors.mid,
    fontFamily: 'Helvetica-Bold',
  },
  value: {
    flex: 1,
    fontSize: 10,
    color: colors.dark,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableCell: {
    fontSize: 9,
    color: colors.dark,
  },
  tableCellBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.black,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 56,
    right: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: colors.light,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  internalBadge: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffc107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  internalBadgeText: {
    fontSize: 8,
    color: '#856404',
    fontFamily: 'Helvetica-Bold',
  },
});

interface PdfHeaderProps {
  locale: Locale;
}

export function PdfHeader({ locale }: PdfHeaderProps) {
  return (
    <View style={baseStyles.header}>
      <View style={baseStyles.logoArea}>
        <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#000000', letterSpacing: 2 }}>
          ASTSA SA
        </Text>
        <Text style={{ fontSize: 8, color: colors.mid, marginTop: 2 }}>
          Servizi Custodia
        </Text>
      </View>
      <View style={baseStyles.companyBlock}>
        <Text style={{ fontFamily: 'Helvetica-Bold', color: colors.black }}>{t('report.company_name', locale)}</Text>
        <Text>{t('report.company_address', locale)}</Text>
        <Text>{t('report.company_city', locale)}</Text>
        <Text>{t('report.company_phone', locale)}</Text>
        <Text>{t('report.company_email', locale)}</Text>
      </View>
    </View>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={baseStyles.row}>
      <Text style={baseStyles.label}>{label}</Text>
      <Text style={baseStyles.value}>{value}</Text>
    </View>
  );
}
