const roleRank: Record<string, number> = {
  DIPENDENTE: 1,
  CAPOSQUADRA: 2,
  AMMINISTRAZIONE: 3,
  DIREZIONE: 4,
};

export function canAccessRole(userRole: string | undefined, allowedRoles: string[]) {
  if (!userRole) return false;
  if (allowedRoles.includes(userRole)) return true;

  const rank = roleRank[userRole] ?? 0;
  return allowedRoles.some((role) => (roleRank[role] ?? 0) <= rank);
}
