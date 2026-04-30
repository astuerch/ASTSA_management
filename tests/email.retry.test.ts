import { describe, expect, it } from 'vitest';
import { nextRetryAtFor } from '@/lib/email/retry';

describe('nextRetryAtFor (backoff)', () => {
  const base = new Date('2026-04-30T10:00:00.000Z');

  it('retryCount 0 → 1 ora dopo', () => {
    const next = nextRetryAtFor(0, base);
    expect(next).not.toBeNull();
    expect(next!.getTime() - base.getTime()).toBe(60 * 60 * 1000);
  });

  it('retryCount 1 → 4 ore dopo', () => {
    const next = nextRetryAtFor(1, base);
    expect(next!.getTime() - base.getTime()).toBe(4 * 60 * 60 * 1000);
  });

  it('retryCount 2 → 16 ore dopo', () => {
    const next = nextRetryAtFor(2, base);
    expect(next!.getTime() - base.getTime()).toBe(16 * 60 * 60 * 1000);
  });

  it('retryCount 3 → null (esauriti)', () => {
    expect(nextRetryAtFor(3, base)).toBeNull();
  });

  it('retryCount oltre il max → null', () => {
    expect(nextRetryAtFor(99, base)).toBeNull();
  });
});
