import { describe, expect, it } from 'vitest';
import { formatCents, parseCentsFromInput } from '@/lib/money';

describe('money helpers', () => {
  it('formatta centesimi in CHF', () => {
    expect(formatCents(12345)).toContain('123.45');
  });

  it('parse da stringa con virgola', () => {
    expect(parseCentsFromInput('12,50')).toBe(1250);
  });

  it('parse da stringa con punto', () => {
    expect(parseCentsFromInput('19.9')).toBe(1990);
  });

  it('lancia errore su input invalido', () => {
    expect(() => parseCentsFromInput('abc')).toThrow();
  });
});
