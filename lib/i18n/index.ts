import type { MessageKey, Locale } from './types';
import it from './it';
import deCh from './de-ch';

const dictionaries: Record<Locale, Record<string, string>> = {
  it: it as unknown as Record<string, string>,
  'de-ch': deCh as unknown as Record<string, string>,
};

export function t(key: MessageKey | string, locale: Locale = 'it'): string {
  const dict = dictionaries[locale];
  const value = dict[key];
  if (value !== undefined) return value;
  // Fallback to Italian
  const itDict = dictionaries['it'];
  return itDict[key] ?? key;
}

export { it, deCh };
export type { MessageKey, Locale };
