# Architettura tecnica proposta (modulare)

## Vincolo contabile
- **Sage resta il sistema ufficiale di contabilità e fatturazione annuale dei contratti custodia.**
- ASTSA Management prepara dati, controlli, bozze ed export per lavori extra.

## Moduli applicativi
1. **Anagrafiche:** clienti, stabili, personale, servizi, materiali, mezzi.
2. **Operativo dipendenti:** start/stop, note, foto, materiali, anomalie.
3. **Rapporti PDF:** generazione rapporti PDF (intervento, giornaliero, stabile, ore mensili), storico consultabile.
4. **Extra/preventivi:** lavori straordinari, preventivi parametrici.
5. **Fatturazione extra:** bozza fattura e flusso validazione ufficio.
6. **Dashboard:** ore/costi/margini/scostamenti.
7. **Integrazione Sage:** export e stato passaggio amministrativo.

## Ruoli e permessi minimi
- **DIPENDENTE:** solo propri interventi; niente prezzi/margini; PDF solo variante client.
- **CAPOSQUADRA:** visibilità squadra e validazioni base; PDF variante client + internal per team.
- **AMMINISTRAZIONE:** preventivi, rapporti, export Sage; tutti i PDF.
- **DIREZIONE:** accesso completo + KPI redditività.

## Flussi chiave
- **Intervento -> Rapporto:** start/stop + dati operativi -> rapporto automatico.
- **Extra -> Fatturabile:** intervento extra validato -> bozza fattura -> export Sage.
- **Contratto custodia -> Controllo:** confronto pianificato/consuntivo senza sostituire Sage.

## Modulo PDF (Fase 3)

### Stack PDF
- `@react-pdf/renderer` per generazione server-side (renderToBuffer)
- 4 template: `InterventionReportPdf`, `DailyReportPdf`, `PropertyHistoryReportPdf`, `MonthlyHoursReportPdf`
- Varianti: `client` (senza costi) e `internal` (con costi)
- Lingue: `it` (default) e `de-ch` (svizzero tedesco, senza ß)
- Archivio in tabella `GeneratedReport` con link Cloudinary

### i18n
- `lib/i18n/it.ts` e `lib/i18n/de-ch.ts` con dizionari type-safe (`Messages`)
- Helper `t(key, locale)` con fallback a IT
- Guard anti-ß in `tests/i18n.de-ch.test.ts`

### API routes PDF
- `GET /api/reports/intervention/[id]?locale=it&variant=client`
- `GET /api/reports/daily?workerId=X&date=YYYY-MM-DD&locale=it`
- `GET /api/reports/property/[id]?from=YYYY-MM-DD&to=YYYY-MM-DD&locale=it&variant=client`
- `GET /api/reports/monthly?workerId=X&year=YYYY&month=MM&locale=it`

## Base dati
Lo schema iniziale è in `/db/schema.sql` e copre:
- anagrafiche core
- contratti e servizi
- interventi e ore lavoro
- foto/materiali
- rapporti
- bozze fattura
- coda export Sage
- rapporti generati (`GeneratedReport`, Fase 3)
