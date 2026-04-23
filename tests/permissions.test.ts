import { describe, expect, it } from 'vitest';
import { canAccessRole } from '@/lib/permissions';

describe('permessi ruolo', () => {
  it('dipendente non accede area amministrazione', () => {
    expect(canAccessRole('DIPENDENTE', ['AMMINISTRAZIONE'])).toBe(false);
  });

  it('direzione accede aree amministrazione', () => {
    expect(canAccessRole('DIREZIONE', ['AMMINISTRAZIONE'])).toBe(true);
  });

  it('caposquadra accede alle pagine caposquadra', () => {
    expect(canAccessRole('CAPOSQUADRA', ['CAPOSQUADRA'])).toBe(true);
  });
});
