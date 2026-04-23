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
- `db/schema.sql` (storico di riferimento)
