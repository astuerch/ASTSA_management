# ASTSA Management

Sistema gestionale modulare per Active Services Team SA.

## Getting Started

### Prerequisiti
- Node.js 20+
- npm 10+

### Avvio locale
1. Installa dipendenze:
   ```bash
   npm install
   ```
2. Copia variabili ambiente:
   ```bash
   cp .env.example .env
   ```
3. Crea il database con Prisma:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Popola i dati demo:
   ```bash
   npm run db:seed
   ```
5. Avvia l'app:
   ```bash
   npm run dev
   ```

Apri [http://localhost:3000/login](http://localhost:3000/login).

### Credenziali admin demo
- Email: `admin@astsa.local`
- Password: `Admin123!`

## Script principali
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run test`
- `npm run db:migrate`
- `npm run db:seed`

## Documentazione
- `docs/architecture.md`
- `docs/roadmap.md`
- `docs/development.md`
- `docs/phase-2-interventions.md`
- `docs/phase-3-reports.md`
- `db/schema.sql` (storico di riferimento)

## Rapporti PDF

L'app supporta la generazione di rapporti PDF tramite `@react-pdf/renderer`. I rapporti sono disponibili in:
- **Italiano** (`it`) e **Svizzero tedesco** (`de-ch`, senza "ß")
- **Variante cliente** (senza costi) e **variante interna** (con costi, solo CAPOSQUADRA+)

### Tipi di rapporto
| Tipo | Route | Descrizione |
|---|---|---|
| Intervento | `/api/reports/intervention/[id]` | Singolo intervento |
| Giornaliero | `/api/reports/daily` | Ore del giorno per dipendente |
| Storico stabile | `/api/reports/property/[id]` | Tutti gli interventi su uno stabile |
| Ore mensili | `/api/reports/monthly` | Riepilogo mensile per dipendente |

Tutti i rapporti generati vengono archiviati in `/dashboard/reports`.

## Variabili d'ambiente

| Variabile | Obbligatoria | Descrizione |
|---|---|---|
| `DATABASE_URL` | ✅ | Path SQLite (es. `file:./dev.db`) |
| `NEXTAUTH_SECRET` | ✅ | Secret JWT NextAuth |
| `NEXTAUTH_URL` | ✅ | URL base app (es. `http://localhost:3000`) |
| `CLOUDINARY_CLOUD_NAME` | ❌ | Nome cloud Cloudinary (opzionale, mock in dev) |
| `CLOUDINARY_API_KEY` | ❌ | API key Cloudinary |
| `CLOUDINARY_API_SECRET` | ❌ | API secret Cloudinary |

### Setup Cloudinary (gratuito)
1. Registra un account free su [cloudinary.com](https://cloudinary.com/users/register/free)
2. Dalla dashboard Cloudinary, copia **Cloud Name**, **API Key** e **API Secret**
3. Aggiungi le variabili nel tuo `.env`
4. Senza queste variabili, l'app funziona comunque in dev usando immagini mock

## Utenti demo (post-seed)
| Email | Password | Ruolo |
|---|---|---|
| `admin@astsa.local` | `Admin123!` | AMMINISTRAZIONE |
| `dipendente@astsa.local` | `Demo123!` | DIPENDENTE |
