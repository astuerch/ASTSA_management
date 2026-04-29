# Phase 4b – Export Contabilità Infoniqa ONE Start

## Panoramica

La feature "Sage/Infoniqa Export" consente all'ufficio amministrativo di esportare le bozze fatture (stato `PRONTO_EXPORT`) verso il software di contabilità **Infoniqa ONE Start** tramite un file CSV Prima Nota + PDF allegati compressi in un archivio ZIP.

---

## Workflow

```
Bozza fattura (BOZZA)
    → Pronto export (PRONTO_EXPORT)
        → Esportato (ESPORTATO)          ← dopo generateExport()
            → Registrato Sage (REGISTRATO_SAGE)  ← dopo confirmSageImport()
        → Annullato (ANNULLATO)          ← cancelExport() ripristina a PRONTO_EXPORT
```

### Step-by-step

1. **Preparazione** – L'amministrazione porta le fatture allo stato `PRONTO_EXPORT` dalla pagina `/dashboard/invoices`.
2. **Nuovo export** – Vai su `/dashboard/sage/exports/new`, seleziona le fatture e clicca "Genera export e scarica ZIP".
3. **ZIP scaricato automaticamente** – Il batch viene registrato, le fatture cambiano stato a `ESPORTATO`.
4. **Import in Infoniqa** – Segui le istruzioni nel file `README.txt` incluso nello ZIP.
5. **Conferma** – Dopo l'import in Infoniqa, clicca "Conferma import avvenuto" nella pagina di dettaglio batch. Lo stato diventa `REGISTRATO_SAGE`.
6. **Annullamento** (se necessario) – Se l'import fallisce, usa "Annulla batch" per ripristinare le fatture a `PRONTO_EXPORT`.

---

## Struttura ZIP

```
sage-export-EXP-2026-0001.zip
├── registrazioni.csv       ← Prima Nota CSV per Infoniqa
├── README.txt              ← Istruzioni import
├── mapping-info.txt        ← Mapping colonne CSV → campi Infoniqa
└── pdf/
    ├── BZ-2026-0001.pdf
    ├── BZ-2026-0002.pdf
    └── ...
```

---

## Specifiche CSV Prima Nota

| Parametro | Valore |
|-----------|--------|
| Encoding | UTF-8 con BOM (`\uFEFF`) |
| Separatore campi | `;` (punto e virgola) |
| Separatore decimale | `.` (punto) |
| Formato data | `DD.MM.YYYY` |
| Fine riga | CRLF (`\r\n`) |
| Escaping | RFC4180: campi con `;`, `"`, newline avvolti in `"..."`, doppiatura `""` interna |

### Colonne (14 totali)

| # | Nome | Descrizione |
|---|------|-------------|
| 1 | Data | Data documento (DD.MM.YYYY) |
| 2 | NumeroDocumento | Numero fattura (es. BZ-2026-0001) |
| 3 | ContoDare | Conto clienti (default: 1100) |
| 4 | ContoAvere | Conto ricavi (da AccountingConfig) |
| 5 | ImportoLordo | Totale incl. IVA |
| 6 | CodiceIVA | Codice IVA Infoniqa (es. IP81) |
| 7 | Testo | Oggetto fattura |
| 8 | CentroCosto | Centro di costo (da AccountingConfig) |
| 9 | NumeroCliente | Numero cliente Sage (da campo cliente) |
| 10 | PdfAllegato | Percorso PDF relativo (es. `pdf/BZ-2026-0001.pdf`) |
| 11 | Valuta | Sempre `CHF` |
| 12 | Imponibile | Imponibile (senza IVA) |
| 13 | ImportoIVA | Importo IVA |
| 14 | RigheDettaglio | Righe dettaglio in formato `desc\|qty\|unit\|amount` separate da `;` |

---

## Configurazione contabile

La configurazione è gestita nella tabella `accounting_configs` e modificabile da DIREZIONE su `/dashboard/sage/config`.

### Chiavi principali

| Chiave | Default | Descrizione |
|--------|---------|-------------|
| `account.ricavi.default` | `3200` | Conto ricavi fallback |
| `account.ricavi.EXTRA` | `3200` | Conto ricavi per lavori Extra |
| `account.ricavi.PICCHETTO` | `3210` | Conto ricavi Picchetto |
| `account.ricavi.REGIA` | `3220` | Conto ricavi A regia |
| `account.ricavi.TRASFERTA` | `3300` | Conto ricavi Trasferta |
| `vat.STANDARD` | `IP81` | Codice IVA 8.1% |
| `vat.RIDOTTA` | `IP26` | Codice IVA 2.6% |
| `vat.ALLOGGIO` | `IP38` | Codice IVA 3.8% |
| `vat.ESENTE` | `IP00` | Esente IVA |
| `costCenter.EXTRA` | `EXTRA` | Centro di costo Extra |

---

## Istruzioni import Infoniqa ONE Start

1. Estrai il file ZIP in una cartella locale.
2. Apri **Infoniqa ONE Start** → **Contabilità** → **Importazione** → **Registrazioni**.
3. Seleziona `registrazioni.csv`.
4. **Al primo import**: configura il mapping colonne come da `mapping-info.txt`. Infoniqa memorizza il mapping per gli import successivi.
5. Verifica anteprima registrazioni e conferma import.
6. Per ogni registrazione importata, allega il PDF corrispondente dalla cartella `pdf/` (il campo `PdfAllegato` indica il file).
7. Torna nell'app ASTSA → `/dashboard/sage/exports` → batch → "Conferma import avvenuto".

---

## Ruoli e permessi

| Azione | Ruolo minimo |
|--------|-------------|
| Visualizzare export | AMMINISTRAZIONE |
| Creare nuovo export | AMMINISTRAZIONE |
| Confermare import | AMMINISTRAZIONE |
| Annullare batch | AMMINISTRAZIONE |
| Modificare configurazione contabile | DIREZIONE |

---

## Prerequisiti cliente

Il cliente deve avere il campo **Numero cliente Sage** (`sageCustomerNumber`) valorizzato. Se mancante, il sistema blocca l'export segnalando i clienti problematici.

---

## Troubleshooting

**"Fatture non in stato PRONTO_EXPORT"**
→ Verifica e aggiorna lo stato delle fatture dalla pagina `/dashboard/invoices`.

**"Clienti senza numero cliente Sage"**
→ Vai su `/dashboard/clients`, apri il cliente e aggiungi il numero cliente Sage.

**"Fatture già esportate in altro batch"**
→ Le fatture sono già associate a un batch precedente. Annulla il batch precedente se necessario.

**Lo ZIP non è stato caricato su Cloudinary**
→ Funzionalità non critica: il file viene comunque scaricato direttamente. Verifica le variabili d'ambiente Cloudinary.

---

## Modello dati

### SageExport

```prisma
model SageExport {
  id               String           @id @default(cuid())
  batchNumber      String           @unique   // EXP-YYYY-NNNN
  exportedAt       DateTime
  exportedById     Int
  invoiceCount     Int
  totalAmountCents Int
  csvFileName      String
  zipUrl           String?          // URL Cloudinary (opzionale)
  zipPublicId      String?
  status           SageExportStatus // GENERATED | CONFIRMED_IMPORT | CANCELLED
  importedAt       DateTime?
  importedById     Int?
  notes            String?
  invoices         InvoiceDraft[]
}
```

### AccountingConfig

```prisma
model AccountingConfig {
  id          String                   @id @default(cuid())
  key         String                   @unique
  value       String
  description String?
  category    AccountingConfigCategory // ACCOUNT | VAT_CODE | COST_CENTER | GENERAL
  updatedAt   DateTime
  updatedById Int?
}
```
