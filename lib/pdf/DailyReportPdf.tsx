import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';
import { baseStyles, colors, PdfHeader, InfoRow } from './shared';
import { formatDuration } from '@/lib/time';

export interface DailyReportData {
  worker: { firstName: string; lastName: string };
  date: Date;
  interventions: Array<{
    id: number;
    startedAt: Date | null;
    endedAt: Date | null;
    durationMinutes: number | null;
    workType: string;
    property: { name: string };
  }>;
}

interface Props {
  data: DailyReportData;
  locale: Locale;
}

const styles = {
  col1: { width: '18%' as const },
  col2: { width: '42%' as const },
  col3: { width: '20%' as const },
  col4: { width: '20%' as const },
};

export function DailyReportPdf({ data, locale }: Props) {
  const generatedAt = new Date().toLocaleString('it-CH');
  const totalMinutes = data.interventions.reduce((s, i) => s + (i.durationMinutes ?? 0), 0);

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PdfHeader locale={locale} />

        <Text style={baseStyles.title}>{t('report.title.daily', locale)}</Text>

        <InfoRow
          label={t('report.employee', locale)}
          value={`${data.worker.firstName} ${data.worker.lastName}`}
        />
        <InfoRow
          label={t('report.date', locale)}
          value={data.date.toLocaleDateString('it-CH')}
        />

        <Text style={baseStyles.sectionTitle}>{t('report.title.daily', locale)}</Text>

        <View style={baseStyles.tableHeader}>
          <Text style={[baseStyles.tableCellBold, styles.col1]}>{t('report.start_time', locale)}</Text>
          <Text style={[baseStyles.tableCellBold, styles.col2]}>{t('report.property', locale)}</Text>
          <Text style={[baseStyles.tableCellBold, styles.col3]}>{t('report.work_type', locale)}</Text>
          <Text style={[baseStyles.tableCellBold, styles.col4]}>{t('report.duration', locale)}</Text>
        </View>

        {data.interventions.map((iv, i) => (
          <View key={i} style={baseStyles.tableRow}>
            <Text style={[baseStyles.tableCell, styles.col1]}>
              {iv.startedAt ? iv.startedAt.toLocaleTimeString('it-CH', { hour: '2-digit', minute: '2-digit' }) : '—'}
            </Text>
            <Text style={[baseStyles.tableCell, styles.col2]}>{iv.property.name}</Text>
            <Text style={[baseStyles.tableCell, styles.col3]}>
              {t(`workType.${iv.workType}` as `workType.${string}`, locale) || iv.workType}
            </Text>
            <Text style={[baseStyles.tableCell, styles.col4]}>
              {iv.durationMinutes != null ? formatDuration(iv.durationMinutes) : '—'}
            </Text>
          </View>
        ))}

        <View style={[baseStyles.tableRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 }]}>
          <Text style={[baseStyles.tableCellBold, { flex: 1 }]}>{t('report.daily_total', locale)}</Text>
          <Text style={[baseStyles.tableCellBold, styles.col4]}>{formatDuration(totalMinutes)}</Text>
        </View>

        <View style={baseStyles.footer} fixed>
          <Text>{t('report.generated_on', locale)} {generatedAt}</Text>
          <Text render={({ pageNumber, totalPages }) => `${t('report.page', locale)} ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
