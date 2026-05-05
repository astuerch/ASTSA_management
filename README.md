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
| `MINDEE_API_KEY` | ❌ | OCR Mindee per Phase 4c. Senza chiave, attivo il fallback mock |
| `RESEND_API_KEY` | ❌ | Provider email Phase 6. Senza chiave, attivo il fallback mock |
| `EMAIL_FROM` | con Resend | Sender, es. `ASTSA <info@astsa.ch>` (dominio verificato) |
| `EMAIL_BCC_ADMIN` | ❌ | BCC automatica su ogni invio, es. `amministrazione@astsa.ch` |
| `EMAIL_TO_ADMIN` | ❌ | Recipient alert auto-trigger (Phase 6 PR #9). Fallback su `EMAIL_BCC_ADMIN`. |
| `SAFE_EMAIL_ONLY` | ❌ | Allow-list invii per dev/staging, es. `@astsa.local` |
| `CRON_SECRET` | consigliata | Bearer secret per Vercel Cron `/api/cron/email-retry` |

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


## Preventivi e bozze fatture

### Moduli disponibili (da /dashboard)

| Modulo | Path | Ruoli |
|---|---|---|
| Preventivi | `/dashboard/quotes` | AMMINISTRAZIONE, DIREZIONE |
| Bozze fatture | `/dashboard/invoices` | AMMINISTRAZIONE, DIREZIONE |
| Listino prezzi | `/dashboard/price-list` | AMMINISTRAZIONE, DIREZIONE |

### Numerazione

- **Preventivi**: `PR-{ANNO}-{SEQUENZA}` (es. `PR-2026-0001`)
- **Bozze Fatture**: `BZ-{ANNO}-{SEQUENZA}` (es. `BZ-2026-0001`)
- Sage/Infoniqa assegna il numero ufficiale `FA00xxxx` in fase di import (PR #6)

### Workflow tipico

1. Crea preventivo → inserisci righe → marca "Inviato" → "Accettato"
2. "Trasforma in bozza fattura" → genera BZ- automaticamente con righe copiate
3. Verifica bozza → "Marca pronto per export" → export CSV Infoniqa (PR #6)

### PDF

I PDF vengono generati con `@react-pdf/renderer` con:
- Logo aziendale a colori top-left
- Testo monocromo (nero/grigi)
- Scadenza in arancione `#E07B00`
- QR-bill svizzera completa (conforme SIX Group) in calce alle fatture

### Calcolo IVA svizzera

Arrotondamento al 5 centesimo (`roundSwiss`). Aliquote: 8.1% standard, 2.6% ridotta, 3.8% alloggio, 0% esente.

Documentazione tecnica completa: [`docs/phase-4a-quotes-invoices.md`](docs/phase-4a-quotes-invoices.md)

## Export contabilità Infoniqa

Il modulo **Phase 4b** consente di esportare le bozze fatture verso **Infoniqa ONE Start** tramite Prima Nota CSV + PDF allegati in un archivio ZIP.

### Funzionalità

| Feature | Path | Ruoli |
|---|---|---|
| Lista batch export | `/dashboard/sage/exports` | AMMINISTRAZIONE, DIREZIONE |
| Nuovo export | `/dashboard/sage/exports/new` | AMMINISTRAZIONE, DIREZIONE |
| Dettaglio batch | `/dashboard/sage/exports/[id]` | AMMINISTRAZIONE, DIREZIONE |
| Configurazione contabile | `/dashboard/sage/config` | AMMINISTRAZIONE (edit: DIREZIONE) |

### Workflow export

1. Le fatture in stato `PRONTO_EXPORT` vengono selezionate
2. Il sistema genera un CSV Prima Nota (14 colonne, UTF-8 BOM, separatore `;`)
3. I PDF vengono generati per ogni fattura
4. CSV + PDF vengono compressi in uno ZIP (`sage-export-EXP-YYYY-NNNN.zip`)
5. Il file viene scaricato automaticamente nel browser
6. Dopo l'import in Infoniqa, clicca "Conferma import avvenuto" → stato `REGISTRATO_SAGE`

### Numerazione batch

- **Export batch**: `EXP-{ANNO}-{SEQUENZA}` (es. `EXP-2026-0001`)

Documentazione tecnica completa: [`docs/phase-4b-sage-export.md`](docs/phase-4b-sage-export.md)

## Documenti in entrata (OCR Mindee)

Il modulo **Phase 4c** acquisisce fatture fornitori, ricevute e bolle relative
a lavori EXTRA, con OCR automatico via Mindee, validazione admin e export CSV.

| Feature | Path | Ruoli |
|---|---|---|
| Lista documenti | `/dashboard/documents` | AMMINISTRAZIONE, DIREZIONE |
| Validazione documento | `/dashboard/documents/[id]` | AMMINISTRAZIONE, DIREZIONE |
| Mobile scan | `/work/scan` | DIPENDENTE+ |
| Export CSV | `/api/documents/export.csv` | AMMINISTRAZIONE, DIREZIONE |

Senza `MINDEE_API_KEY` configurata, l'app usa un fallback mock con dati demo,
così sviluppo e CI funzionano senza chiavi reali.

Documentazione tecnica completa: [`docs/phase-4c-ocr-documents.md`](docs/phase-4c-ocr-documents.md)

## Dashboard KPI direzione

Il modulo **Phase 5 PR #8** aggiunge la pagina KPI della direzione con KPI
top-line del mese corrente vs mese precedente e tre grafici principali
(trend ore 12 mesi, mix ricavi per WorkType, top 10 stabili per ore).

| Feature | Path | Ruoli |
|---|---|---|
| Dashboard KPI | `/dashboard/kpi` | DIREZIONE |

Calcoli live a ogni accesso (Prisma `aggregate` parallele, < 100ms su SQLite
con il volume corrente). Niente cron, niente snapshot — aggiungeremo
materializzazione solo se misureremo lentezza vera.

Documentazione tecnica completa: [`docs/phase-5-kpi-dashboard.md`](docs/phase-5-kpi-dashboard.md)

## Invio email rapporti e preventivi

Il modulo **Phase 6 PR #8** abilita l'invio manuale via email di rapporti
intervento e preventivi al cliente, con allegato PDF generato server-side e
log di tutti gli invii.

| Feature | Path | Ruoli |
|---|---|---|
| Bottone invio rapporto | `/dashboard/interventions/[id]` | AMMINISTRAZIONE, DIREZIONE |
| Bottone invio preventivo | `/dashboard/quotes/[id]` | AMMINISTRAZIONE, DIREZIONE |
| Log invii | `/dashboard/email-log` | AMMINISTRAZIONE, DIREZIONE |

Provider Resend con fallback mock se `RESEND_API_KEY` non è configurata.
Safety guard `SAFE_EMAIL_ONLY` per evitare invii accidentali in dev/staging.
Templates IT / DE-CH (senza "ß").

Documentazione tecnica completa: [`docs/phase-6a-email.md`](docs/phase-6a-email.md)

## Email cliente: Outlook handoff (no Resend)

Le email ai clienti **non vengono mai spedite dall'app**. L'app prepara la
bozza in Outlook desktop (subject + body precompilati, PDF scaricato) e
l'amministrazione invia dal proprio account aziendale dopo aver controllato.

| Bottone | Path | Azione |
|---|---|---|
| Prepara email rapporto | `/dashboard/interventions/[id]` | Apre Outlook + scarica PDF rapporto |
| Prepara email preventivo | `/dashboard/quotes/[id]` | Apre Outlook + scarica PDF preventivo |
| Prepara promemoria scadenza | `/dashboard/invoices/[id]` | Apre Outlook con messaggio precompilato |

Resend resta usato **solo per gli alert interni** all'amministrazione
(vedi sotto), non per i clienti.

Documentazione tecnica completa: [`docs/phase-6c-outlook-handoff.md`](docs/phase-6c-outlook-handoff.md)

## Auto-notifiche, reminder e retry

Il modulo **Phase 6 PR #9** aggiunge automazione email su 4 eventi chiave del
workflow, reminder scadenza fattura manuale, e retry queue con cron orario.

| Evento | Trigger automatico | Tipo log |
|---|---|---|
| Intervento EXTRA chiuso | `stopIntervention` | `ADMIN_ALERT_INTERVENTION_EXTRA_CLOSED` |
| Preventivo ACCETTATO | `markAsAccepted` | `ADMIN_ALERT_QUOTE_ACCEPTED` |
| Bozza fattura PRONTO_EXPORT | `markReadyForExport` | `ADMIN_ALERT_INVOICE_READY_EXPORT` |
| Documento OCR caricato | `uploadIncomingDocument` | `ADMIN_ALERT_OCR_DOC_TO_VALIDATE` |

Cron `0 * * * *` su `/api/cron/email-retry` riprova le email fallite con
backoff 1h → 4h → 16h, max 3 retry. Bottone "Riinvia" manuale nel log.

Documentazione tecnica completa: [`docs/phase-6b-automation.md`](docs/phase-6b-automation.md)
