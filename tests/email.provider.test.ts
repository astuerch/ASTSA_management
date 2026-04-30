import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sendEmail } from '@/lib/email/provider';

describe('sendEmail provider', () => {
  const prev = {
    resend: process.env.RESEND_API_KEY,
    safe: process.env.SAFE_EMAIL_ONLY,
    from: process.env.EMAIL_FROM,
  };

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.SAFE_EMAIL_ONLY;
    process.env.EMAIL_FROM = 'info@astsa.test';
  });

  afterEach(() => {
    if (prev.resend !== undefined) process.env.RESEND_API_KEY = prev.resend;
    if (prev.safe !== undefined) process.env.SAFE_EMAIL_ONLY = prev.safe;
    if (prev.from !== undefined) process.env.EMAIL_FROM = prev.from;
    else delete process.env.EMAIL_FROM;
  });

  it('senza RESEND_API_KEY usa il mock e ritorna successo', async () => {
    const result = await sendEmail({
      to: 'cliente@example.ch',
      subject: 'Test',
      text: 'corpo',
      html: '<p>corpo</p>',
    });
    expect(result.success).toBe(true);
    expect(result.provider).toBe('mock');
    expect(result.messageId).toMatch(/^mock_/);
  });

  it('safety guard blocca destinatari fuori allow-list', async () => {
    process.env.SAFE_EMAIL_ONLY = '@astsa.local';
    const result = await sendEmail({
      to: 'esterno@gmail.com',
      subject: 'Test',
      text: 'corpo',
      html: '<p>corpo</p>',
    });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('SAFE_EMAIL_ONLY');
  });

  it('safety guard lascia passare destinatari in allow-list', async () => {
    process.env.SAFE_EMAIL_ONLY = '@astsa.local';
    const result = await sendEmail({
      to: 'mario@astsa.local',
      subject: 'Test',
      text: 'corpo',
      html: '<p>corpo</p>',
    });
    expect(result.success).toBe(true);
  });
});
