# Phase 4c — OCR documenti in entrata (Mindee)

Modulo per acquisire fatture fornitori, ricevute e bolle di consegna relative
ai lavori EXTRA. Sostituisce l'archiviazione cartacea con upload + OCR
automatico + validazione manuale, e produce un export CSV pronto per la
contabilità.

## Architettura

```
[/work/scan]  ──┐
                ├──> Server Action `uploadIncomingDocument`
[/dashboard/   ─┤      ├─> Cloudinary (storage file)
 documents]     │      ├─> lib/ocr/provider (Mindee | mock)
                │      └─> Prisma `incoming_documents`
                │
                └──> [/dashboard/documents/:id]   (validazione admin)
                          └─> updateIncomingDocument / validate / discard
                                       │
                                       └──> [/api/documents/export.csv]
```

I file sono caricati su Cloudinary nella cartella `astsa/incoming-documents`.
La risposta grezza del provider OCR è salvata in `raw_ocr_data` per debug e
ri-parsing futuri; i dati validati dall'admin in `verified_data`.

## Modello dati

Tabella: `incoming_documents`

| Campo                | Tipo    | Note |
|----------------------|---------|------|
| `id`                 | cuid    | PK |
| `type`               | enum    | FATTURA_FORNITORE \| RICEVUTA \| BOLLA_CONSEGNA \| PREVENTIVO_RICEVUTO |
| `status`             | enum    | DA_VALIDARE → VALIDATO → PRONTO_EXPORT (o SCARTATO) |
| `file_url`           | text    | URL Cloudinary |
| `raw_ocr_data`       | text    | JSON raw del provider |
| `extracted`          | text    | JSON `ExtractedDocument` |
| `verified_data`      | text    | JSON dati post-correzione admin |
| `ocr_confidence`     | float   | Confidenza media campi chiave (0..1) |
| `ocr_provider`       | text    | `mindee` o `mock` |
| `client_id`/`property_id`/`intervention_id` | int | Collegamenti opzionali |
| `discard_reason`     | text    | Obbligatorio per SCARTATO |

Importi sono in **centesimi** come tutto il resto del progetto.

## Flusso utente

### Mobile (`/work/scan`)
1. Dipendente apre l'app di lavoro → "📄 Scansiona documento".
2. Sceglie tipo (default: ricevuta).
3. Scatta foto via `<input type="file" capture="environment">` (camera nativa).
4. La foto > 2 MB viene compressa in JPEG client-side mantenendo l'aspect ratio.
5. Submit → upload su Cloudinary → OCR → redirect a riepilogo.

### Dashboard (`/dashboard/documents`)
- Lista filtrata per stato/tipo/ricerca testuale.
- Upload manuale (PDF o immagine) per documenti che arrivano via email.
- Apertura documento singolo:
  - anteprima file (image inline / PDF iframe)
  - tabella campi estratti con badge confidenza (verde ≥ 85%, giallo ≥ 60%, rosso < 60%)
  - form di correzione completo
  - workflow: Valida / Pronto export / Scarta (con motivo obbligatorio).

### Export contabile
`GET /api/documents/export.csv?status=PRONTO_EXPORT&type=...&from=...&to=...`

CSV UTF-8 con BOM, separatore `;`, EOL CRLF, date `DD.MM.YYYY`, importi a due
decimali. Compatibile con Excel/Numbers e con il workflow Phase 4b.

## Provider OCR

```
lib/ocr/
  ├── types.ts        ExtractedDocument, ExtractedField, OcrDocumentKind
  ├── mindee.ts       chiamata API + mapping
  ├── mock.ts         fallback dummy
  └── provider.ts     entry-point (sceglie tra Mindee e mock)
```

### Mindee
- Endpoint Invoice v4: `https://api.mindee.net/v1/products/mindee/invoices/v4/predict`
- Endpoint Receipt v5: `https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict`
- Header: `Authorization: Token ${MINDEE_API_KEY}`
- Body: `multipart/form-data` con campo `document`
- Free tier: 250 documenti/mese — `RICEVUTA` usa l'API receipt, gli altri tipi
  l'API invoice.

### Fallback
Se `MINDEE_API_KEY` non è impostata, o se la chiamata fallisce, `provider.ts`
restituisce dati `mock` realistici. Niente crash, l'admin valida tutto a mano.
Questo permette dev locale + CI senza chiavi reali.

### Estensione futura
`provider.ts` è il punto unico da toccare per aggiungere un secondo provider
(Azure Form Recognizer, Google Document AI, ecc.). Le actions e la UI
consumano esclusivamente `ExtractedDocument`.

## Permessi

| Azione                | DIPENDENTE | CAPOSQUADRA | AMMINISTRAZIONE | DIREZIONE |
|-----------------------|:----------:|:-----------:|:---------------:|:---------:|
| Upload (`/work/scan`) | ✅ | ✅ | ✅ | ✅ |
| Vedere lista          | ❌ | ❌ | ✅ | ✅ |
| Validare / scartare   | ❌ | ❌ | ✅ | ✅ |
| Export CSV            | ❌ | ❌ | ✅ | ✅ |

Enforcement via `requireRole` nelle Server Actions e nelle pagine.

## Variabili d'ambiente

| Variabile         | Obbligatoria | Note |
|-------------------|:------------:|------|
| `MINDEE_API_KEY`  | ❌ | Senza chiave, parte il fallback mock |
| `CLOUDINARY_*`    | ❌ | Senza Cloudinary, file salvati come URL placeholder |

Aggiungere in `.env`:
```
MINDEE_API_KEY=xxxxxxxxxxxx
```

## Test

| File | Cosa verifica |
|------|---------------|
| `tests/ocr.mindee.test.ts` | Mapping JSON Mindee → schema interno, conversione importi in centesimi, robustezza payload vuoto |
| `tests/ocr.provider.test.ts` | Fallback automatico al mock senza API key |
| `tests/documents.csv.test.ts` | Header, formattazione date/importi, escape `;` e virgolette |

## Cosa NON è in questa PR (foundation-first)

- Bulk actions multiple in lista (validate N, scarta N)
- Audit log dedicato `IncomingDocumentAuditLog` (tracciamento via timestamp + verified_data)
- Crop manuale immagine sul mobile (delegato alla camera nativa del telefono)
- Excel `.xlsx` (CSV è già conforme al workflow contabile esistente)

Questi seguono in PR successive una volta validato il core.

## Esempi

Vedi `docs/examples/incoming-documents.csv` per un esempio di output.
