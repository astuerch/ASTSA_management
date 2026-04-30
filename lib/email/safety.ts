/**
 * Safety guard contro invii accidentali in dev/staging.
 *
 * Se la variabile `SAFE_EMAIL_ONLY` è impostata, ogni invio viene confrontato
 * con la lista di indirizzi/domini consentiti. Tutto il resto viene bloccato
 * con un errore esplicito.
 *
 * Uso tipico:
 *   - dev locale: SAFE_EMAIL_ONLY="ale.stuerchler@gmail.com"
 *   - staging:    SAFE_EMAIL_ONLY="@astsa.local,@example.com"
 *   - production: variabile non impostata → tutti gli invii ammessi
 */

export class EmailSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailSafetyError';
  }
}

function parseAllowList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

function matchesAllowEntry(address: string, entry: string): boolean {
  const lower = address.toLowerCase();
  // Pattern @dominio.tld → match per suffisso
  if (entry.startsWith('@')) {
    return lower.endsWith(entry);
  }
  // Match esatto
  return lower === entry;
}

/**
 * Verifica che gli indirizzi siano nella allow-list.
 * Lancia `EmailSafetyError` se la guard è attiva e qualche indirizzo
 * non passa.
 */
export function assertAllowedRecipients(addresses: string[]): void {
  const allowList = parseAllowList(process.env.SAFE_EMAIL_ONLY);
  if (allowList.length === 0) return; // guard disattivata = produzione

  const blocked = addresses.filter(
    (addr) => !allowList.some((entry) => matchesAllowEntry(addr, entry)),
  );

  if (blocked.length > 0) {
    throw new EmailSafetyError(
      `SAFE_EMAIL_ONLY attivo: invii bloccati a ${blocked.join(', ')}. ` +
        `Allow-list: ${allowList.join(', ')}.`,
    );
  }
}

export function isSafetyGuardActive(): boolean {
  return parseAllowList(process.env.SAFE_EMAIL_ONLY).length > 0;
}
