# Phase 5 PR #8 — Dashboard KPI direzione

Prima slice della Fase 5. Aggiunge la pagina `/dashboard/kpi` con KPI top-line
del mese corrente vs mese precedente e tre grafici principali. Calcoli **live**
a ogni accesso (no snapshot, no cron).

## Cosa è incluso

- 8 KpiCard top-line: interventi (totali / EXTRA / picchetto), ore (totali / EXTRA),
  ricavi previsti, costo materiali, margine lordo stimato.
- Confronto vs mese precedente con delta % e freccia colorata
  (positivo verde / negativo rosso, invertito per i KPI di costo).
- Grafico "Trend ore 12 mesi" (line, totale + EXTRA).
- Grafico "Mix ricavi per WorkType" (donut).
- Grafico "Top 10 stabili per ore consumate" (bar verticale).

## Cosa NON è incluso (PR successive)

- Report Excel dettagliati (PR #9): marginalità per stabile, performance dipendenti,
  consumo materiali, picchetto.
- Confronto preventivo vs consuntivo (PR #9).
- Sistema alert proattivi `AlertRule` + `AlertType` (PR #10).
- Heatmap operativa calendario (PR #10).
- Email/PDF mensile direzione schedulato (Fase 6).
- Tabella `KpiSnapshot` e cron job notturno (rimandato finché i calcoli live
  non saranno misurati come lenti).
- Selettore periodo custom: per ora il default è "mese corrente". Se serve
  scegliere mesi passati arriva nel prossimo iteration.

## Architettura

```
app/dashboard/kpi/page.tsx        ← server component, query parallele
   │
   ├── lib/kpi/period.ts          ← getCurrentMonthRange, getPreviousPeriodRange,
   │                                getLast12MonthlyBuckets, deltaPercent
   ├── lib/kpi/metrics.ts         ← getKpiSummary (top-line)
   ├── lib/kpi/charts.ts          ← getMonthlyHoursTrend,
   │                                getRevenueMixByWorkType, getTopPropertiesByHours
   │
   ├── components/kpi/kpi-card.tsx       ← server-rendered, valore + delta
   └── components/kpi/charts.tsx         ← 'use client' (recharts)
```

Il filtro `dynamic = 'force-dynamic'` è applicato alla pagina perché i KPI
dipendono da `new Date()`. Senza questo, Next.js statifizzerebbe la pagina
all'ora del build su Vercel.

## Formule

### Conteggio interventi

Un intervento ricade nel periodo se:
- ha `startedAt` ∈ [from, to), OPPURE
- ha `startedAt = null` e `createdAt` ∈ [from, to) (interventi creati a mano).

### Ore lavorate

Somma `intervention.durationMinutes` con stesso filtro temporale, limitato
agli interventi chiusi (`durationMinutes IS NOT NULL`).

### Ricavi previsti

Somma `invoice_drafts.totalCents` con:
- `status` ∈ {`PRONTO_EXPORT`, `ESPORTATO`, `REGISTRATO_SAGE`}
- `documentDate` ∈ [from, to).

Esclude `BOZZA` (non ancora pronta) e `ANNULLATO`.

### Costo materiali

Per ogni `intervention_material` collegato a un intervento del periodo:

```
costo = quantity * (intervention_material.unit_cost_cents
                    ?? material.unit_cost_cents)
```

Usa il costo "snapshot" del momento del consumo se presente, altrimenti
il costo corrente del materiale.

### Costo personale

Per ogni `intervention_worker` di un intervento chiuso del periodo:

```
costo = (intervention.durationMinutes / 60) * user.hourly_cost_cents
```

Approssima il costo personale come "tempo intervento × tariffa oraria"
moltiplicato per ogni dipendente associato. Non considera straordinari né
il costo storico al momento dell'intervento.

### Margine lordo stimato

```
margine = ricavi_previsti - costo_personale - costo_materiali
```

Non include costi fissi (affitti, ammortamenti, software). È un indicatore
gestionale, non contabile.

### Confronto vs precedente

Per il default "mese corrente fino a oggi", il periodo precedente è la
**stessa lunghezza in giorni** del mese precedente. Es. `1-29 aprile` →
`1-29 marzo`. Per un mese pieno, il confronto è col mese intero precedente.

Delta %: `(corrente - precedente) / precedente * 100`. Se `precedente == 0`
il delta è `null` e la card mostra "—".

## Performance

Tipico runtime su SQLite con ~500 interventi/mese: < 100ms totali (16 query
in parallelo per i KPI top-line, 12 query per il trend, 1 groupBy + 1 findMany
per i top-stabili, 1 findMany per il mix ricavi).

Se in futuro il volume cresce (~10k interventi/mese), si valuta
materializzazione `KpiSnapshot` come previsto in spec.

## Test

`tests/kpi.period.test.ts` (10 casi) copre:

- Inizio/fine mese corrente, mese parziale vs pieno
- Periodo precedente con stessa lunghezza in giorni
- Cambio anno (gennaio → dicembre anno prima)
- 12 bucket mensili (range corretto, ultimo termina nel mese del now)
- `deltaPercent` con divisione per zero, valori negativi, identità

Niente test su Prisma aggregate qui — quelli sono coperti da test E2E
manuali sulla dashboard. Le funzioni `getKpiSummary` e dintorni sono già
sottili wrapper di `prisma.aggregate`.
