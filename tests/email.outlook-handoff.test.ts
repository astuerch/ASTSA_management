import { describe, expect, it } from 'vitest';
import { buildMailtoUrl } from '@/lib/email/outlook-handoff';

describe('buildMailtoUrl', () => {
  it('compone subject e body URL-encoded', () => {
    const url = buildMailtoUrl({
      to: 'cliente@example.ch',
      subject: 'Rapporto intervento',
      body: 'Gentile cliente,\nin allegato il rapporto.',
    });
    expect(url).toMatch(/^mailto:cliente@example\.ch\?/);
    expect(url).toContain('subject=Rapporto%20intervento');
    expect(url).toContain('body=Gentile%20cliente%2C%0Ain%20allegato%20il%20rapporto.');
  });

  it('encoda caratteri speciali nel subject', () => {
    const url = buildMailtoUrl({
      to: 'a@b.ch',
      subject: 'F&B: 50% sconto?',
      body: '',
    });
    expect(url).toContain('F%26B%3A%2050%25%20sconto%3F');
  });

  it('preserva accentate italiane (UTF-8 percent encoding)', () => {
    const url = buildMailtoUrl({
      to: 'a@b.ch',
      subject: 'Preventivo accettato',
      body: 'Cliente ha ringraziato perché veloce è stato',
    });
    // "perché" → percent-encoded utf-8: %C3%A9
    expect(url).toContain('perch%C3%A9');
    // "è" → %C3%A8
    expect(url).toContain('%C3%A8');
  });

  it('aggiunge cc e bcc se forniti', () => {
    const url = buildMailtoUrl({
      to: 'a@b.ch',
      subject: 's',
      body: 'b',
      cc: ['x@y.ch', 'w@z.ch'],
      bcc: ['admin@astsa.ch'],
    });
    expect(url).toContain('cc=x%40y.ch%2Cw%40z.ch');
    expect(url).toContain('bcc=admin%40astsa.ch');
  });

  it('lascia il TO non encoded (RFC 6068)', () => {
    const url = buildMailtoUrl({
      to: 'cliente@dominio.ch',
      subject: 's',
      body: 'b',
    });
    expect(url.startsWith('mailto:cliente@dominio.ch?')).toBe(true);
  });

  it('non inserisce cc/bcc vuoti', () => {
    const url = buildMailtoUrl({
      to: 'a@b.ch',
      subject: 's',
      body: 'b',
      cc: [],
      bcc: [],
    });
    expect(url).not.toContain('cc=');
    expect(url).not.toContain('bcc=');
  });
});
