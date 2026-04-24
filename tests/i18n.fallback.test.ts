import { describe, it, expect } from 'vitest';
import { t } from '@/lib/i18n';

describe('i18n fallback', () => {
  it('restituisce il valore italiano per locale "it"', () => {
    expect(t('report.client', 'it')).toBe('Cliente');
  });

  it('restituisce il valore DE-CH per locale "de-ch"', () => {
    expect(t('report.client', 'de-ch')).toBe('Kunde');
  });

  it('usa locale "it" come default se non specificato', () => {
    expect(t('report.client')).toBe('Cliente');
  });

  it('traduce correttamente i WorkType in italiano', () => {
    expect(t('workType.ORDINARIO', 'it')).toBe('Ordinario');
    expect(t('workType.PICCHETTO', 'it')).toBe('Picchetto');
    expect(t('workType.EMERGENZA', 'it')).toBe('Emergenza');
  });

  it('traduce correttamente i WorkType in DE-CH', () => {
    expect(t('workType.ORDINARIO', 'de-ch')).toBe('Ordentlich');
    expect(t('workType.PICCHETTO', 'de-ch')).toBe('Pikett');
    expect(t('workType.EMERGENZA', 'de-ch')).toBe('Notfall');
  });

  it('traduce il titolo del rapporto in IT', () => {
    expect(t('report.title.intervention', 'it')).toBe('Rapporto di intervento');
  });

  it('traduce il titolo del rapporto in DE-CH', () => {
    expect(t('report.title.intervention', 'de-ch')).toBe('Einsatzrapport');
  });
});
