import type { MessageKey, Locale } from './types';
import it from './it';
import deCh from './de-ch';

const dictionaries = {
  it,
  'de-ch': deCh,
};

export function t(key: MessageKey, locale: Locale = 'it'): string {
  const dict = dictionaries[locale];
  const value = dict[key];
  if (value !== undefined) return value;
  // Fallback to Italian
  return it[key] ?? key;
}

export { it, deCh };
export type { MessageKey, Locale };
