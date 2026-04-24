import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';
import { baseStyles, colors, PdfHeader, InfoRow } from './shared';
import { formatDuration } from '@/lib/time';

export interface PropertyHistoryData {
  property: { name: string; address: string; client?: { businessName: string } | null };
  periodFrom: Date;
  periodTo: Date;
  interventions: Array<{
    id: number;
    startedAt: Date | null;
    endedAt: Date | null;
    durationMinutes: number | null;
    workType: string;
    notes: string | null;
    workers: Array<{ user: { firstName: string; lastName: string } }>;
    materials?: Array<{
      quantity: number;
      unitCostCents: number | null;
      material: { unitCostCents: number };
    }>;
  }>;
  variant: 'client' | 'internal';
}

interface Props {
  data: PropertyHistoryData;
  locale: Locale;
}

export function PropertyHistoryReportPdf({ data, locale }: Props) {
  const isInternal = data.variant === 'internal';
  const generatedAt = new Date().toLocaleString('it-CH');

  const totalMinutes = data.interventions.reduce((s, i) => s + (i.durationMinutes ?? 0), 0);
  const totalCostCents = isInternal
    ? data.interventions.reduce((sum, iv) => {
        return sum + (iv.materials ?? []).reduce((s, m) => s + (m.unitCostCents ?? m.material.unitCostCents) * m.quantity, 0);
      }, 0)
    : 0;

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PdfHeader locale={locale} />

        {isInternal && (
          <View style={baseStyles.internalBadge}>
            <Text style={baseStyles.internalBadgeText}>{t('report.internal_note', locale)}</Text>
          </View>
        )}

        <Text style={baseStyles.title}>{t('report.title.property_history', locale)}</Text>

        <InfoRow label={t('report.property', locale)} value={data.property.name} />
        <InfoRow label={t('report.client', locale)} value={data.property.client?.businessName ?? '—'} />
        <InfoRow label={t('report.address', locale)} value={data.property.address} />
        <InfoRow label={t('report.period_from', locale)} value={data.periodFrom.toLocaleDateString('it-CH')} />
        <InfoRow label={t('report.period_to', locale)} value={data.periodTo.toLocaleDateString('it-CH')} />

        <Text style={baseStyles.sectionTitle}>{t('report.title.property_history', locale)}</Text>

        <View style={baseStyles.tableHeader}>
          <Text style={[baseStyles.tableCellBold, { width: '15%' }]}>{t('report.date', locale)}</Text>
          <Text style={[baseStyles.tableCellBold, { width: '30%' }]}>{t('report.workers', locale)}</Text>
          <Text style={[baseStyles.tableCellBold, { width: '20%' }]}>{t('report.work_type', locale)}</Text>
          <Text style={[baseStyles.tableCellBold, { width: '15%', textAlign: 'right' as const }]}>{t('report.duration', locale)}</Text>
          <Text style={[baseStyles.tableCellBold, { width: '20%' }]}>{t('report.notes', locale)}</Text>
        </View>

        {data.interventions.map((iv, i) => (
          <View key={i} style={baseStyles.tableRow}>
            <Text style={[baseStyles.tableCell, { width: '15%' }]}>
              {iv.startedAt ? iv.startedAt.toLocaleDateString('it-CH') : '—'}
            </Text>
            <Text style={[baseStyles.tableCell, { width: '30%' }]}>
              {iv.workers.map((w) => `${w.user.firstName} ${w.user.lastName}`).join(', ') || '—'}
            </Text>
            <Text style={[baseStyles.tableCell, { width: '20%' }]}>
              {t(`workType.${iv.workType}` as `workType.${string}`, locale) || iv.workType}
            </Text>
            <Text style={[baseStyles.tableCell, { width: '15%', textAlign: 'right' as const }]}>
              {iv.durationMinutes != null ? formatDuration(iv.durationMinutes) : '—'}
            </Text>
            <Text style={[baseStyles.tableCell, { width: '20%' }]}>
              {iv.notes ? iv.notes.slice(0, 30) : '—'}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
          <InfoRow
            label={t('report.interventions_total', locale)}
            value={String(data.interventions.length)}
          />
          <InfoRow
            label={t('report.hours_total', locale)}
            value={formatDuration(totalMinutes)}
          />
          {isInternal && (
            <InfoRow
              label={t('report.total_cost', locale)}
              value={`CHF ${(totalCostCents / 100).toFixed(2)}`}
            />
          )}
        </View>

        <View style={baseStyles.footer} fixed>
          <Text>{t('report.generated_on', locale)} {generatedAt}</Text>
          <Text render={({ pageNumber, totalPages }) => `${t('report.page', locale)} ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
