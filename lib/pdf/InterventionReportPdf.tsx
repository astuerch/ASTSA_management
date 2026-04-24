import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';
import { baseStyles, colors, PdfHeader, InfoRow } from './shared';
import { formatDuration } from '@/lib/time';

export interface InterventionReportData {
  id: number;
  property: { name: string; address: string; client?: { businessName: string } | null };
  startedAt: Date | null;
  endedAt: Date | null;
  durationMinutes: number | null;
  workType: string;
  notes: string | null;
  anomaly: string | null;
  workers: Array<{ user: { firstName: string; lastName: string } }>;
  photos: Array<{ url: string; kind: string }>;
  materials: Array<{
    quantity: number;
    unitCostCents: number | null;
    material: { name: string; unit: string; unitCostCents: number };
  }>;
  clientSignatureUrl: string | null;
  clientSignerName: string | null;
}

interface Props {
  data: InterventionReportData;
  locale: Locale;
  variant: 'client' | 'internal';
}

const styles = StyleSheet.create({
  col1: { width: '40%' },
  col2: { width: '15%', textAlign: 'right' as const },
  col3: { width: '15%', textAlign: 'right' as const },
  col4: { width: '15%', textAlign: 'right' as const },
  col5: { width: '15%', textAlign: 'right' as const },
});

export function InterventionReportPdf({ data, locale, variant }: Props) {
  const isInternal = variant === 'internal';
  const generatedAt = new Date().toLocaleString('it-CH');

  const totalMaterialCents = data.materials.reduce(
    (sum, m) => sum + (m.unitCostCents ?? m.material.unitCostCents) * m.quantity,
    0,
  );

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PdfHeader locale={locale} />

        {isInternal && (
          <View style={baseStyles.internalBadge}>
            <Text style={baseStyles.internalBadgeText}>{t('report.internal_note', locale)}</Text>
          </View>
        )}

        <Text style={baseStyles.title}>{t('report.title.intervention', locale)}</Text>

        {/* Client / Property info */}
        <Text style={baseStyles.sectionTitle}>{t('report.client', locale)} / {t('report.property', locale)}</Text>
        <InfoRow label={t('report.client', locale)} value={data.property.client?.businessName ?? '—'} />
        <InfoRow label={t('report.property', locale)} value={data.property.name} />
        <InfoRow label={t('report.address', locale)} value={data.property.address} />

        {/* Intervention info */}
        <Text style={baseStyles.sectionTitle}>{t('report.work_type', locale)}</Text>
        <InfoRow
          label={t('report.date', locale)}
          value={data.startedAt ? data.startedAt.toLocaleDateString('it-CH') : '—'}
        />
        <InfoRow
          label={t('report.start_time', locale)}
          value={data.startedAt ? data.startedAt.toLocaleTimeString('it-CH', { hour: '2-digit', minute: '2-digit' }) : '—'}
        />
        <InfoRow
          label={t('report.end_time', locale)}
          value={data.endedAt ? data.endedAt.toLocaleTimeString('it-CH', { hour: '2-digit', minute: '2-digit' }) : '—'}
        />
        <InfoRow
          label={t('report.duration', locale)}
          value={data.durationMinutes != null ? formatDuration(data.durationMinutes) : '—'}
        />
        <InfoRow
          label={t('report.work_type', locale)}
          value={t(`workType.${data.workType}` as `workType.${string}`, locale) || data.workType}
        />
        <InfoRow
          label={t('report.workers', locale)}
          value={data.workers.map((w) => `${w.user.firstName} ${w.user.lastName}`).join(', ') || '—'}
        />

        {/* Notes */}
        {(data.notes || data.anomaly) && (
          <>
            <Text style={baseStyles.sectionTitle}>{t('report.notes', locale)}</Text>
            {data.notes && <InfoRow label={t('report.notes', locale)} value={data.notes} />}
            {data.anomaly && <InfoRow label={t('report.anomalies', locale)} value={data.anomaly} />}
          </>
        )}

        {/* Materials */}
        {data.materials.length > 0 && (
          <>
            <Text style={baseStyles.sectionTitle}>{t('report.materials', locale)}</Text>
            <View style={baseStyles.tableHeader}>
              <Text style={[baseStyles.tableCellBold, styles.col1]}>{t('report.description', locale)}</Text>
              <Text style={[baseStyles.tableCellBold, styles.col2]}>{t('report.unit', locale)}</Text>
              <Text style={[baseStyles.tableCellBold, styles.col3]}>{t('report.quantity', locale)}</Text>
              {isInternal && (
                <>
                  <Text style={[baseStyles.tableCellBold, styles.col4]}>{t('report.unit_cost', locale)}</Text>
                  <Text style={[baseStyles.tableCellBold, styles.col5]}>{t('report.subtotal', locale)}</Text>
                </>
              )}
            </View>
            {data.materials.map((m, i) => {
              const unitCost = m.unitCostCents ?? m.material.unitCostCents;
              const subtotal = unitCost * m.quantity;
              return (
                <View key={i} style={baseStyles.tableRow}>
                  <Text style={[baseStyles.tableCell, styles.col1]}>{m.material.name}</Text>
                  <Text style={[baseStyles.tableCell, styles.col2]}>{m.material.unit}</Text>
                  <Text style={[baseStyles.tableCell, styles.col3]}>{m.quantity}</Text>
                  {isInternal && (
                    <>
                      <Text style={[baseStyles.tableCell, styles.col4]}>
                        CHF {(unitCost / 100).toFixed(2)}
                      </Text>
                      <Text style={[baseStyles.tableCell, styles.col5]}>
                        CHF {(subtotal / 100).toFixed(2)}
                      </Text>
                    </>
                  )}
                </View>
              );
            })}
            {isInternal && (
              <View style={[baseStyles.tableRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <Text style={[baseStyles.tableCellBold, { flex: 1 }]}>{t('report.total_cost', locale)}</Text>
                <Text style={[baseStyles.tableCellBold, styles.col5]}>
                  CHF {(totalMaterialCents / 100).toFixed(2)}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Signature */}
        {data.clientSignatureUrl && (
          <>
            <Text style={baseStyles.sectionTitle}>{t('report.signature', locale)}</Text>
            {data.clientSignerName && (
              <InfoRow label={t('report.signer', locale)} value={data.clientSignerName} />
            )}
          </>
        )}

        {/* Footer */}
        <View style={baseStyles.footer} fixed>
          <Text>{t('report.generated_on', locale)} {generatedAt}</Text>
          <Text render={({ pageNumber, totalPages }) => `${t('report.page', locale)} ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
