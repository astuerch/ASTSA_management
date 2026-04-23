# Architettura tecnica proposta (modulare)

## Vincolo contabile
- **Sage resta il sistema ufficiale di contabilità e fatturazione annuale dei contratti custodia.**
- ASTSA Management prepara dati, controlli, bozze ed export per lavori extra.

## Moduli applicativi
1. **Anagrafiche:** clienti, stabili, personale, servizi, materiali, mezzi.
2. **Operativo dipendenti:** start/stop, note, foto, materiali, anomalie.
3. **Rapporti:** generazione rapporti PDF, storico consultabile.
4. **Extra/preventivi:** lavori straordinari, preventivi parametrici.
5. **Fatturazione extra:** bozza fattura e flusso validazione ufficio.
6. **Dashboard:** ore/costi/margini/scostamenti.
7. **Integrazione Sage:** export e stato passaggio amministrativo.

## Ruoli e permessi minimi
- **DIPENDENTE:** solo propri interventi; niente prezzi/margini.
- **CAPOSQUADRA:** visibilità squadra e validazioni base.
- **AMMINISTRAZIONE:** preventivi, rapporti, export Sage.
- **DIREZIONE:** accesso completo + KPI redditività.

## Flussi chiave
- **Intervento -> Rapporto:** start/stop + dati operativi -> rapporto automatico.
- **Extra -> Fatturabile:** intervento extra validato -> bozza fattura -> export Sage.
- **Contratto custodia -> Controllo:** confronto pianificato/consuntivo senza sostituire Sage.

## Base dati
Lo schema iniziale è in `/db/schema.sql` e copre:
- anagrafiche core
- contratti e servizi
- interventi e ore lavoro
- foto/materiali
- rapporti
- bozze fattura
- coda export Sage
