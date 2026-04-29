# Fase 4a – Preventivi e Bozze Fatture

## Panoramica

Questa fase implementa il modulo **Preventivi** (PR-YYYY-XXXX) e **Bozze Fatture** (BZ-YYYY-XXXX), inclusi PDF brandizzati con QR-bill svizzera conforme SIX Group.

> **Nota**: il sistema gestisce **SOLO lavori extra/non-ricorrenti**. Gli abbonamenti annuali restano interamente in Sage/Infoniqa ONE Start.

---

## Strategia (Scenario B)

Il sistema crea bozze fatture con numerazione interna `BZ-YYYY-XXXX`. Sage/Infoniqa importa il CSV (PR #6) e assegna il numero ufficiale `FA00xxxx`.

---

## Workflow Stati

### Preventivi (`QuoteStatus`)

```
BOZZA → INVIATO → ACCETTATO → [conversione → InvoiceDraft]
                ↘ RIFIUTATO
        → SCADUTO (manuale)
```

| Stato | Descrizione | Transizioni consentite |
|-------|-------------|----------------------|
| `BOZZA` | In lavorazione | → INVIATO, → (eliminazione) |
| `INVIATO` | Inviato al cliente | → ACCETTATO, → RIFIUTATO |
| `ACCETTATO` | Accettato dal cliente | → converti in bozza, → RIFIUTATO |
| `RIFIUTATO` | Rifiutato | — (terminale) |
| `SCADUTO` | Scaduto senza risposta | — (terminale) |

### Bozze Fatture (`InvoiceDraftStatus`)

```
BOZZA → PRONTO_EXPORT → ESPORTATO → REGISTRATO_SAGE
     ↘ ANNULLATO
```

| Stato | Descrizione |
|-------|-------------|
| `BOZZA` | In lavorazione |
| `PRONTO_EXPORT` | Marcata pronta per CSV Infoniqa (PR #6) |
| `ESPORTATO` | CSV già generato |
| `REGISTRATO_SAGE` | Confermato registrato in Sage manualmente |
| `ANNULLATO` | Annullata |

---

## Regole Numerazione

- **Preventivi**: `PR-{ANNO}-{SEQUENZA 4 cifre}` (es. `PR-2026-0001`)
- **Bozze Fatture**: `BZ-{ANNO}-{SEQUENZA 4 cifre}` (es. `BZ-2026-0001`)
- Gestite dalla tabella `NumberingCounter` con transazione atomica Prisma
- Nessun buco, nessun duplicato anche con concorrenza
- Reset annuale automatico (nuova riga per ogni anno)

```typescript
// lib/numbering.ts
const sequence = await getNextNumber('PR', 2026);  // → 1, 2, 3...
const number = formatNumber('PR', 2026, sequence); // → 'PR-2026-0001'
```

---

## Calcolo IVA Svizzera

### Aliquote disponibili (`VatCode`)

| Codice | Aliquota | Uso |
|--------|----------|-----|
| `STANDARD` | 8.1% | Prestazioni standard |
| `RIDOTTA` | 2.6% | Prodotti essenziali |
| `ALLOGGIO` | 3.8% | Servizi alloggio |
| `ESENTE` | 0% | Esente IVA |

### Arrotondamento svizzero (5 centesimi)

In Svizzera il centesimo minimo è **0.05 CHF**. Tutti gli importi vengono arrotondati al multiplo di 5 centesimi più vicino.

```typescript
// lib/swiss-rounding.ts
roundSwiss(9713) // 97.13 → 97.15 CHF (arrotonda al 5ct superiore)
roundSwiss(9712) // 97.12 → 97.10 CHF (arrotonda al 5ct inferiore)
```

### Calcolo riga

```typescript
const result = calculateLineAmounts(
  quantity,       // es. 10 (ore)
  unitPriceCents, // es. 6500 (65.00 CHF/h)
  discountCents,  // es. 0
  vatCode         // es. 'STANDARD'
);
// result.netAmountCents:   65000 (65.00 CHF)
// result.vatAmountCents:    5265 (52.65 CHF = arrotondato al 5ct)
// result.totalAmountCents: 70265 (702.65 CHF)
```

---

## QR-Bill Svizzera

### Libreria

Utilizza `swissqrbill` v3.x (conforme SIX Group Swiss QR Bill Standard).

### Generazione riferimento (27 cifre)

Il riferimento QR è generato deterministicamente da `clientId` e `sequence`:

```
Formato: 000000000000000{clientId:6}{sequence:5}{checksum:1}
Esempio: 000000000000000001383000018
         ^^^^^^^^^^^^^^^^^^^  ^^^^^^ ^^^^^  ^
         15 zeri              client seq   checksum mod10
```

```typescript
import { generateQRReference } from '@/lib/pdf/qrBill';
const ref = generateQRReference(1383, 1);
// → '000000000000000001383000018' (27 cifre, checksum valido)
```

### Validazione

```typescript
import { utils } from 'swissqrbill';
utils.isQRReferenceValid(ref) // → true
```

### IBAN aziendale

`CH84 3000 0001 6577 0392 4` (configurato in `lib/company.ts`)

---

## Dati Azienda

Hardcoded in `lib/company.ts` con override via variabili d'ambiente opzionali:

```typescript
export const company = {
  name: 'Active Services Team SA',
  address: 'Via Al Dosso 11',
  city: '6807 Taverne',
  website: 'www.astsa.ch',
  email: 'info@astsa.ch',
  vatNumber: 'CHE-114.327.152 IVA',
  iban: 'CH84 3000 0001 6577 0392 4',
  ibanRaw: 'CH8430000001657703924',
};
```

---

## PDF

### QuotePdf.tsx

Layout preventivo (senza QR-bill):
- Header: logo a colori top-left + indirizzo cliente top-right
- Blocco dati azienda
- Sezione info: data, n. cliente Sage, validità
- Titolo: "Preventivo PR-YYYY-XXXX"
- Tabella righe con colonne: Descrizione | Qtà | Unità | IVA | Prezzo | Ribasso | Importo CHF
- Totali (netto + IVA breakdown + totale incl. IVA)
- Footer: "Eventuali richiami entro 8 giorni."

### InvoiceDraftPdf.tsx

Layout bozza fattura (con QR-bill):
- Identico a QuotePdf per la sezione superiore
- **"Scade il"** visualizzato in arancione `#E07B00` (unico accento colore)
- Titolo: "Fattura BZ-YYYY-XXXX"
- Linea tratteggiata con icona ✂ → separatore QR-bill
- **QR-bill svizzera** con sezioni: Ricevuta / Sezione pagamento / Dati

---

## Sorgenti Bozze Fatture

| `InvoiceLineSource` | Descrizione |
|--------------------|-------------|
| `MANUAL` | Inserita manualmente |
| `INTERVENTION_HOURS` | Ore lavoro da intervento EXTRA |
| `INTERVENTION_MATERIAL` | Materiali da intervento EXTRA (con markup +20% default) |
| `QUOTE_LINE` | Copiata da preventivo accettato |
| `DISCOUNT` | Riga sconto |

---

## Permessi

| Ruolo | Preventivi | Bozze Fatture | Listino |
|-------|-----------|---------------|---------|
| DIPENDENTE | ✗ | ✗ | ✗ |
| CAPOSQUADRA | ✗ | ✗ | ✗ |
| AMMINISTRAZIONE | ✓ | ✓ | ✓ |
| DIREZIONE | ✓ | ✓ | ✓ |

---

## Numero Cliente Sage

Il campo `sageCustomerNumber` (es. `1383`) è opzionale su `Client`. Un warning viene mostrato su preventivi e bozze se mancante, ma **non bloccante** in questa fase (sarà bloccante in PR #6 al momento dell'export Infoniqa).

---

## Fuori Scope (questa PR)

- Export CSV Infoniqa → PR #6
- OCR documenti in entrata → PR #7
- Email cliente → Fase 6
- Configurazione conti contabili UI → PR #6
- Notifiche scadenze → futuro
