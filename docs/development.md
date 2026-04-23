# Development Guide

## Convenzioni codice
- App Router (`app/`) con Server Components di default.
- Mutation tramite Server Actions in `lib/actions/*`.
- Validazione input con Zod in `lib/validation.ts`.
- Gestione importi sempre in centesimi (`lib/money.ts`).
- UI in italiano.

## Struttura cartelle
- `app/`: pagine e layout Next.js.
- `components/ui/`: componenti UI stile shadcn.
- `lib/`: auth, prisma client, helpers, validation, actions.
- `prisma/`: schema ORM e seed.
- `tests/`: test Vitest unitari.

## Come aggiungere una nuova anagrafica
1. Estendere `prisma/schema.prisma` e lanciare migrazione.
2. Aggiungere schema Zod in `lib/validation.ts`.
3. Creare Server Actions in `lib/actions/<entita>.ts`.
4. Creare pagina `app/dashboard/<entita>/page.tsx` con tabella + form CRUD.
5. Aggiornare sidebar in `lib/sidebar.ts` e permessi con `requireRole`.
6. Aggiungere test unitari mirati in `tests/`.
