-- Aggiunta valore enum PREPARATO al campo status di email_logs.
-- SQLite memorizza gli enum Prisma come TEXT con CHECK implicito a runtime,
-- quindi nessuna alterazione di tabella è strettamente richiesta.
-- Il file esiste come marker della migrazione applicata.

-- (no-op DDL)
SELECT 1;
