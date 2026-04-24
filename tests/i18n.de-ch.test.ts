import { describe, it, expect } from 'vitest';
import deCh from '@/lib/i18n/de-ch';

function getAllStringValues(obj: Record<string, string>): [string, string][] {
  return Object.entries(obj);
}

describe('DE-CH dictionary – Swiss German rules', () => {
  const entries = getAllStringValues(deCh);

  it('non contiene il carattere ß (vietato in svizzero tedesco)', () => {
    for (const [key, value] of entries) {
      if (typeof value === 'string') {
        const hasEszett = value.includes('ß') || value.includes('ẞ');
        expect(hasEszett, `Stringa DE-CH contiene 'ß' vietato (Svizzera usa 'ss'): chiave="${key}", valore="${value}"`).toBe(false);
      }
    }
  });

  it('usa "Total" (svizzero) e non "Gesamt" come traduzione di totale', () => {
    expect(deCh['report.total']).toBe('Total');
    expect(deCh['report.total']).not.toContain('Gesamt');
  });

  it('usa "Adresse" (non "Straße") per indirizzo', () => {
    expect(deCh['report.address']).toBe('Adresse');
    expect(deCh['report.address']).not.toContain('Stra');
  });

  it('usa "Grusse" o "Grüsse" (svizzero) e non "Grüße" per saluti', () => {
    const greetings = deCh['report.greetings'];
    expect(greetings).toContain('Grusse');
    expect(greetings).not.toContain('Grüße');
  });

  it('tutte le chiavi sono presenti nel dizionario IT', async () => {
    const { default: it } = await import('@/lib/i18n/it');
    const itKeys = Object.keys(it);
    const dechKeys = Object.keys(deCh);
    expect(dechKeys.length).toBe(itKeys.length);
    for (const key of itKeys) {
      expect(dechKeys, `Chiave mancante in DE-CH: ${key}`).toContain(key);
    }
  });
});
