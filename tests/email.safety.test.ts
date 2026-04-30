import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  assertAllowedRecipients,
  EmailSafetyError,
  isSafetyGuardActive,
} from '@/lib/email/safety';

describe('email safety guard', () => {
  const previous = process.env.SAFE_EMAIL_ONLY;

  beforeEach(() => {
    delete process.env.SAFE_EMAIL_ONLY;
  });

  afterEach(() => {
    if (previous !== undefined) process.env.SAFE_EMAIL_ONLY = previous;
    else delete process.env.SAFE_EMAIL_ONLY;
  });

  it('senza variabile ambient non blocca nulla', () => {
    expect(isSafetyGuardActive()).toBe(false);
    expect(() => assertAllowedRecipients(['anyone@example.com'])).not.toThrow();
  });

  it('match esatto sull\'indirizzo', () => {
    process.env.SAFE_EMAIL_ONLY = 'ale@astsa.local';
    expect(isSafetyGuardActive()).toBe(true);
    expect(() => assertAllowedRecipients(['ale@astsa.local'])).not.toThrow();
    expect(() => assertAllowedRecipients(['mario@astsa.local'])).toThrow(EmailSafetyError);
  });

  it('match per dominio con prefisso @', () => {
    process.env.SAFE_EMAIL_ONLY = '@astsa.local';
    expect(() => assertAllowedRecipients(['ale@astsa.local', 'mario@astsa.local'])).not.toThrow();
    expect(() => assertAllowedRecipients(['estraneo@gmail.com'])).toThrow(EmailSafetyError);
  });

  it('blocca anche se SOLO un indirizzo è fuori allow-list', () => {
    process.env.SAFE_EMAIL_ONLY = '@astsa.local';
    expect(() =>
      assertAllowedRecipients(['ale@astsa.local', 'leak@example.com']),
    ).toThrow(EmailSafetyError);
  });

  it('case-insensitive', () => {
    process.env.SAFE_EMAIL_ONLY = 'ALE@ASTSA.LOCAL';
    expect(() => assertAllowedRecipients(['ale@astsa.local'])).not.toThrow();
  });

  it('lista mista di domini e indirizzi', () => {
    process.env.SAFE_EMAIL_ONLY = '@astsa.local, specifico@esterno.ch';
    expect(() => assertAllowedRecipients(['x@astsa.local'])).not.toThrow();
    expect(() => assertAllowedRecipients(['specifico@esterno.ch'])).not.toThrow();
    expect(() => assertAllowedRecipients(['altro@esterno.ch'])).toThrow(EmailSafetyError);
  });
});
