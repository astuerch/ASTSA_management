import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Crea un client Prisma. Due modalità:
 *
 * 1. **Turso (production)**: se `TURSO_DATABASE_URL` è impostata, usiamo
 *    l'adapter libSQL per parlare col database hostato Turso (SQLite-compatibile).
 *    Funziona anche senza `TURSO_AUTH_TOKEN` se il DB è pubblico (sconsigliato
 *    in prod ma utile in dev contro un sqld locale).
 *
 * 2. **SQLite locale (dev)**: se `TURSO_DATABASE_URL` non è impostata, Prisma
 *    legge `DATABASE_URL` (es. `file:./dev.db`) e usa il driver SQLite nativo.
 *
 * Il fallback automatico permette di sviluppare in locale senza Turso e
 * deployare su Vercel solo cambiando le env vars.
 */
function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;

  if (tursoUrl) {
    // Importi dinamici: evitano di fare risolvere `@libsql/client` quando
    // l'app gira in locale senza Turso (e senza la dep installata).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client') as typeof import('@libsql/client');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require('@prisma/adapter-libsql') as typeof import('@prisma/adapter-libsql');

    const libsqlClient = createClient({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(libsqlClient);
    return new PrismaClient({ adapter });
  }

  return new PrismaClient();
}

export const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
