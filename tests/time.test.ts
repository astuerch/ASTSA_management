import { describe, expect, it } from 'vitest';
import { calculateDurationMinutes, formatDuration } from '@/lib/time';

describe('calculateDurationMinutes', () => {
  it('calcola durata esatta', () => {
    const start = new Date('2024-01-01T08:00:00Z');
    const end = new Date('2024-01-01T10:15:00Z');
    expect(calculateDurationMinutes(start, end)).toBe(135);
  });

  it('calcola 0 minuti per inizio = fine', () => {
    const d = new Date('2024-01-01T09:00:00Z');
    expect(calculateDurationMinutes(d, d)).toBe(0);
  });

  it('gestisce durata di 1 ora esatta', () => {
    const start = new Date('2024-01-01T09:00:00Z');
    const end = new Date('2024-01-01T10:00:00Z');
    expect(calculateDurationMinutes(start, end)).toBe(60);
  });

  it('gestisce durate in secondi con arrotondamento', () => {
    const start = new Date('2024-01-01T09:00:00Z');
    const end = new Date('2024-01-01T09:00:30Z');
    expect(calculateDurationMinutes(start, end)).toBe(1);
  });
});

describe('formatDuration', () => {
  it('formatta ore e minuti', () => {
    expect(formatDuration(135)).toBe('2h 15min');
  });

  it('formatta solo minuti', () => {
    expect(formatDuration(45)).toBe('45min');
  });

  it('formatta solo ore senza minuti', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  it('formatta 0 minuti', () => {
    expect(formatDuration(0)).toBe('0min');
  });

  it('formatta numeri negativi come 0min', () => {
    expect(formatDuration(-5)).toBe('0min');
  });

  it('formatta 1 ora 1 minuto', () => {
    expect(formatDuration(61)).toBe('1h 1min');
  });
});
