import { PrismaClient } from '@prisma/client';
import { createClient } from '@libsql/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

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
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl) {
    let host = tursoUrl;
    try { host = new URL(tursoUrl).host; } catch { /* keep raw value */ }
    console.log(`[prisma] Using Turso adapter, url=${host}`);
    console.log(`[prisma] TURSO_AUTH_TOKEN present: ${Boolean(tursoAuthToken)}`);

    const libsqlClient = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });
    const adapter = new PrismaLibSQL(libsqlClient);
    return new PrismaClient({ adapter });
  }

  console.log('[prisma] Using local SQLite via DATABASE_URL');
  return new PrismaClient();
}

export const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
