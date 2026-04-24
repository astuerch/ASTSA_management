import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';
import { baseStyles, colors, PdfHeader, InfoRow } from './shared';
import { formatDuration } from '@/lib/time';
import type { WorkType } from '@prisma/client';

export interface MonthlyHoursData {
  worker: { firstName: string; lastName: string };
  year: number;
  month: number;
  interventions: Array<{
    id: number;
    startedAt: Date | null;
    durationMinutes: number | null;
    workType: WorkType;
  }>;
}

interface Props {
  data: MonthlyHoursData;
  locale: Locale;
}

const WORK_TYPES: WorkType[] = [
  'ORDINARIO', 'EXTRA', 'TRASFERTA', 'REGIA', 'FORFAIT', 'STRAORDINARIO', 'PICCHETTO', 'EMERGENZA',
] as WorkType[];

export function MonthlyHoursReportPdf({ data, locale }: Props) {
  const generatedAt = new Date().toLocaleString('it-CH');

  // Group by week
  const byWeek = new Map<number, typeof data.interventions>();
  for (const iv of data.interventions) {
    if (!iv.startedAt) continue;
    const startOfYear = new Date(iv.startedAt.getFullYear(), 0, 1);
    const week = Math.ceil(((iv.startedAt.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    if (!byWeek.has(week)) byWeek.set(week, []);
    byWeek.get(week)!.push(iv);
  }
  const weeks = Array.from(byWeek.entries()).sort((a, b) => a[0] - b[0]);

  // Totals per work type
  const totalByType = new Map<WorkType, number>();
  for (const iv of data.interventions) {
    if (!iv.durationMinutes) continue;
    totalByType.set(iv.workType, (totalByType.get(iv.workType) ?? 0) + iv.durationMinutes);
  }
  const grandTotal = Array.from(totalByType.values()).reduce((s, v) => s + v, 0);

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PdfHeader locale={locale} />

        <Text style={baseStyles.title}>{t('report.title.monthly_hours', locale)}</Text>

        <InfoRow
          label={t('report.employee', locale)}
          value={`${data.worker.firstName} ${data.worker.lastName}`}
        />
        <InfoRow
          label={t('report.month', locale)}
          value={`${String(data.month).padStart(2, '0')} / ${data.year}`}
        />

        {/* Weekly breakdown */}
        {weeks.map(([week, ivs]) => {
          const weekTotal = ivs.reduce((s, i) => s + (i.durationMinutes ?? 0), 0);
          return (
            <View key={week} style={{ marginTop: 8 }}>
              <Text style={baseStyles.sectionTitle}>{t('report.week', locale)} {week}</Text>
              <View style={baseStyles.tableHeader}>
                <Text style={[baseStyles.tableCellBold, { width: '50%' }]}>{t('report.work_type', locale)}</Text>
                <Text style={[baseStyles.tableCellBold, { width: '50%', textAlign: 'right' as const }]}>{t('report.duration', locale)}</Text>
              </View>
              {ivs.map((iv, i) => (
                <View key={i} style={baseStyles.tableRow}>
                  <Text style={[baseStyles.tableCell, { width: '50%' }]}>
                    {t(`workType.${iv.workType}`, locale) || iv.workType}
                  </Text>
                  <Text style={[baseStyles.tableCell, { width: '50%', textAlign: 'right' as const }]}>
                    {iv.durationMinutes != null ? formatDuration(iv.durationMinutes) : '—'}
                  </Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', paddingHorizontal: 6, paddingTop: 4 }}>
                <Text style={[baseStyles.tableCellBold, { flex: 1 }]}>{t('report.total', locale)}</Text>
                <Text style={[baseStyles.tableCellBold, { width: '50%', textAlign: 'right' as const }]}>{formatDuration(weekTotal)}</Text>
              </View>
            </View>
          );
        })}

        {/* Monthly totals by type */}
        <Text style={baseStyles.sectionTitle}>{t('report.month', locale)} – {t('report.total', locale)}</Text>
        <View style={baseStyles.tableHeader}>
          <Text style={[baseStyles.tableCellBold, { width: '50%' }]}>{t('report.work_type', locale)}</Text>
          <Text style={[baseStyles.tableCellBold, { width: '50%', textAlign: 'right' as const }]}>{t('report.duration', locale)}</Text>
        </View>
        {WORK_TYPES.filter((wt) => totalByType.has(wt)).map((wt) => (
          <View key={wt} style={baseStyles.tableRow}>
            <Text style={[baseStyles.tableCell, { width: '50%' }]}>
              {t(`workType.${wt}`, locale) || wt}
            </Text>
            <Text style={[baseStyles.tableCell, { width: '50%', textAlign: 'right' as const }]}>
              {formatDuration(totalByType.get(wt) ?? 0)}
            </Text>
          </View>
        ))}
        <View style={[baseStyles.tableRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
          <Text style={[baseStyles.tableCellBold, { width: '50%' }]}>{t('report.total', locale)}</Text>
          <Text style={[baseStyles.tableCellBold, { width: '50%', textAlign: 'right' as const }]}>{formatDuration(grandTotal)}</Text>
        </View>

        <View style={baseStyles.footer} fixed>
          <Text>{t('report.generated_on', locale)} {generatedAt}</Text>
          <Text render={({ pageNumber, totalPages }) => `${t('report.page', locale)} ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
