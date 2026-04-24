import { describe, expect, it } from 'vitest';
import { getSidebarItemsForRole } from '@/lib/sidebar';

describe('sidebar ruoli', () => {
  it('dipendente vede solo i miei lavori', () => {
    const items = getSidebarItemsForRole('DIPENDENTE');
    expect(items.map((x) => x.label)).toEqual(['I miei lavori', 'Interventi']);
  });

  it('caposquadra vede team e validazioni', () => {
    const items = getSidebarItemsForRole('CAPOSQUADRA').map((x) => x.label);
    expect(items).toContain('Team');
    expect(items).toContain('Validazioni');
  });

  it('amministrazione vede anagrafiche', () => {
    const items = getSidebarItemsForRole('AMMINISTRAZIONE').map((x) => x.label);
    expect(items).toContain('Clienti');
    expect(items).toContain('Materiali');
  });

  it('direzione vede KPI', () => {
    const items = getSidebarItemsForRole('DIREZIONE').map((x) => x.label);
    expect(items).toContain('Dashboard KPI');
  });
});
