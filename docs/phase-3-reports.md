# Fase 3 – Generazione Rapporti PDF

## Tipologie di rapporto

| Tipo | Template | Route API | Descrizione |
|---|---|---|---|
| `INTERVENTION` | `InterventionReportPdf` | `GET /api/reports/intervention/[id]` | Rapporto singolo intervento |
| `DAILY` | `DailyReportPdf` | `GET /api/reports/daily` | Rapporto giornaliero dipendente |
| `PROPERTY_HISTORY` | `PropertyHistoryReportPdf` | `GET /api/reports/property/[id]` | Storico stabile per periodo |
| `MONTHLY_HOURS` | `MonthlyHoursReportPdf` | `GET /api/reports/monthly` | Riepilogo ore mensile |

## Varianti

| Variante | Descrizione | Chi può generarla |
|---|---|---|
| `client` | Senza costi/prezzi, destinata al cliente | Tutti i ruoli (solo propri interventi per DIPENDENTE) |
| `internal` | Con costi e prezzi, uso interno | CAPOSQUADRA, AMMINISTRAZIONE, DIREZIONE |

## Lingue supportate

| Codice | Lingua | Note |
|---|---|---|
| `it` | Italiano | Default |
| `de-ch` | Svizzero tedesco | Senza "ß" (usa "ss"), "Total" non "Gesamt", "Grüsse" non "Grüße" |

## Regole svizzero tedesco (DE-CH)

Il dizionario `lib/i18n/de-ch.ts` segue le regole del tedesco svizzero:
- **Niente "ß"**: usare sempre "ss" (es. "Strasse" non "Straße", "Grüsse" non "Grüße")
- **"Total"** (non "Gesamt") per i totali
- **"Adresse"** (non "Straße") per l'indirizzo
- Verificato automaticamente dal test `tests/i18n.de-ch.test.ts`

## Struttura header/footer PDF

**Header** (ogni pagina):
- Sinistra: Logo ASTSA SA + tagline
- Destra: Dati azienda (nome, indirizzo, città, telefono, email)
- Separato dal contenuto con linea grigia

**Footer** (ogni pagina, fisso):
- Sinistra: "Generato il {data e ora}"
- Destra: "Pagina X / Y"

## Come aggiungere una nuova lingua

1. Creare `lib/i18n/XX.ts` con tutti i valori del tipo `Messages`
2. Aggiungere la nuova lingua all'union type `Locale` in `lib/i18n/types.ts`
3. Registrare il dizionario in `lib/i18n/index.ts`
4. Aggiungere test guard in `tests/i18n.XX.test.ts` per le regole specifiche della lingua
5. Aggiornare i dropdown UI per includere la nuova opzione

## Archivio rapporti

I rapporti generati vengono salvati nel modello `GeneratedReport` con:
- URL Cloudinary del PDF
- Metadati (tipo, lingua, variante, periodo, intervento/stabile/dipendente associato)
- Chi ha generato il report e quando

L'archivio è consultabile da `/dashboard/reports` (solo AMMINISTRAZIONE e DIREZIONE).
