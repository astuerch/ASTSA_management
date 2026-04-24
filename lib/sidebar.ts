export type SidebarItem = {
  href: string;
  label: string;
  minRole: 'DIPENDENTE' | 'CAPOSQUADRA' | 'AMMINISTRAZIONE' | 'DIREZIONE';
};

const roleRank: Record<SidebarItem['minRole'], number> = {
  DIPENDENTE: 1,
  CAPOSQUADRA: 2,
  AMMINISTRAZIONE: 3,
  DIREZIONE: 4,
};

export const sidebarItems: SidebarItem[] = [
  { href: '/dashboard/jobs', label: 'I miei lavori', minRole: 'DIPENDENTE' },
  { href: '/dashboard/interventions', label: 'Interventi', minRole: 'DIPENDENTE' },
  { href: '/dashboard/team', label: 'Team', minRole: 'CAPOSQUADRA' },
  { href: '/dashboard/validations', label: 'Validazioni', minRole: 'CAPOSQUADRA' },
  { href: '/dashboard/clients', label: 'Clienti', minRole: 'AMMINISTRAZIONE' },
  { href: '/dashboard/properties', label: 'Stabili', minRole: 'AMMINISTRAZIONE' },
  { href: '/dashboard/contracts', label: 'Contratti', minRole: 'AMMINISTRAZIONE' },
  { href: '/dashboard/staff', label: 'Personale', minRole: 'AMMINISTRAZIONE' },
  { href: '/dashboard/services', label: 'Servizi', minRole: 'AMMINISTRAZIONE' },
  { href: '/dashboard/materials', label: 'Materiali', minRole: 'AMMINISTRAZIONE' },
  { href: '/dashboard/kpi', label: 'Dashboard KPI', minRole: 'DIREZIONE' },
];

export function getSidebarItemsForRole(role: SidebarItem['minRole']) {
  const rank = roleRank[role] ?? 1;
  return sidebarItems.filter((item) => roleRank[item.minRole] <= rank);
}
