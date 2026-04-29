import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { extractDocument } from '@/lib/ocr/provider';

describe('extractDocument fallback', () => {
  const previousKey = process.env.MINDEE_API_KEY;

  beforeEach(() => {
    delete process.env.MINDEE_API_KEY;
  });

  afterEach(() => {
    if (previousKey) process.env.MINDEE_API_KEY = previousKey;
  });

  it('usa il mock quando MINDEE_API_KEY non è configurata', async () => {
    const result = await extractDocument(Buffer.from('dummy'), 'demo.pdf', 'INVOICE');
    expect(result.extracted.provider).toBe('mock');
    expect(result.extracted.totalCents.value).toBeGreaterThan(0);
    expect(result.extracted.lineItems.length).toBeGreaterThan(0);
  });
});
