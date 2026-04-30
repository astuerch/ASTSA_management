# Phase 6 PR #9 — Auto-notifiche, reminder e retry

Seconda slice della Fase 6. Aggiunge:

- **Auto-trigger admin** su 4 eventi chiave del workflow
- **Reminder manuale** scadenza fattura via email
- **Retry queue** con cron orario e backoff esponenziale
- **Bottone "Riinvia"** sul log per retry manuale

## Cosa è incluso

### Auto-notifiche admin

Hook nelle Server Actions esistenti. Ogni hook chiama una funzione di
`lib/email/notifications.ts` che invia un alert all'amministrazione,
loggandolo in `EmailLog`. Per design **non blocca mai il flusso utente**:
qualsiasi errore viene catturato e loggato come `FALLITO`.

| Evento | Action sorgente | Tipo log |
|--------|-----------------|----------|
| Intervento EXTRA chiuso (COMPLETATO) | `stopIntervention` | `ADMIN_ALERT_INTERVENTION_EXTRA_CLOSED` |
| Preventivo ACCETTATO | `markAsAccepted` | `ADMIN_ALERT_QUOTE_ACCEPTED` |
| Bozza fattura PRONTO_EXPORT | `markReadyForExport` (invoices) | `ADMIN_ALERT_INVOICE_READY_EXPORT` |
| Documento OCR caricato (DA_VALIDARE) | `uploadIncomingDocumentCore` | `ADMIN_ALERT_OCR_DOC_TO_VALIDATE` |

Recipient: `EMAIL_TO_ADMIN` (priorità) o `EMAIL_BCC_ADMIN`. Se nessuno dei due
è configurato, l'alert viene loggato come skipped e non bloccato.

### Reminder fattura manuale

Bottone su `/dashboard/invoices/[id]` (visibile per stati `PRONTO_EXPORT`,
`ESPORTATO`, `REGISTRATO_SAGE`). Usa `<SendEmailForm>` con selettore lingua
+ override email. Il template adatta il testo in base ai giorni alla scadenza:

- `daysToDue > 0` → "in scadenza tra N giorni"
- `daysToDue == 0` → "in scadenza oggi"
- `daysToDue < 0` → "scaduta da N giorni"

I giorni si calcolano in **UTC sui giorni-solare** per evitare scarti DST e
fasce orarie.

### Retry queue + cron

Aggiunti a `EmailLog`:

- `retryCount Int @default(0)` — quanti retry sono stati tentati (0..3)
- `nextRetryAt DateTime?` — quando schedulare il prossimo tentativo
- `parentLogId String?` — riservato per encadenamento futuro retry

Backoff: **1h → 4h → 16h** per un totale di max 3 retry (4 tentativi totali).
Calcolato da `nextRetryAtFor(retryCount, base)`. Quando `retryCount` raggiunge
`MAX_RETRIES`, `nextRetryAt` rimane `null` e il log non viene più ripreso.

Cron: `vercel.json` schedula `GET /api/cron/email-retry` ogni ora (`0 * * * *`).
L'endpoint:

1. Trova `EmailLog` con `status=FALLITO`, `retryCount<3`, `nextRetryAt<=now`,
   `attachmentName=null` (vedi limitazione sotto).
2. Per ognuno: tenta il reinvio. Se ok → `status=INVIATO`, `nextRetryAt=null`.
   Se fallisce → `retryCount++`, `nextRetryAt = now + backoff`.
3. Limite: 50 candidati per esecuzione (budget cron).

Sicurezza: protetto da `Bearer ${CRON_SECRET}`. In assenza di `CRON_SECRET`
(dev) la chiamata è ammessa per facilitare i test manuali.

### Bottone "Riinvia" manuale

Sul `/dashboard/email-log`, accanto a ogni riga `FALLITO` con `retryCount<3`.
Chiama `retryEmailLog` action che setta `nextRetryAt = now`, così il prossimo
giro cron lo prende. (Alternativa "trigger immediato" rimandata: per ora
basta questo.)

### Limitazione retry con allegati

Il **body originale e gli allegati PDF** non sono persistiti in `EmailLog`.
Per i tipi `INTERVENTION_REPORT` e `QUOTE` (che hanno un PDF allegato), il
retry automatico via cron è disattivato (filtro `attachmentName: null`).
L'admin può comunque rilanciare l'invio dal detail del documento, oppure
cliccare "Riinvia" nel log che però userà solo subject + recipient (non
l'allegato).

Per la prossima iterazione (PR #10): persistere il payload sufficiente a
ricostruire il messaggio (es. `originalBodyText`, `attachmentBlobId`),
oppure usare un job-queue dedicata.

## Variabili d'ambiente nuove

| Variabile | Obbligatoria | Note |
|-----------|:------------:|------|
| `EMAIL_TO_ADMIN` | ❌ | Recipient principale per gli alert admin (es. `amministrazione@astsa.ch`) |
| `CRON_SECRET` | consigliata | Bearer secret per autenticare le chiamate Vercel Cron. Senza, l'endpoint è aperto. |

`EMAIL_BCC_ADMIN` (Phase 6 PR #8) viene riusata come fallback per gli alert.

## Test

| File | Cosa verifica |
|------|---------------|
| `tests/email.notifications.test.ts` | Subject + body IT/DE-CH per i 4 alert + reminder, no "ß" in DE-CH, gestione campi opzionali |
| `tests/email.retry.test.ts` | `nextRetryAtFor` calcola correttamente backoff 1h/4h/16h, ritorna null oltre il max |

## Diagramma flusso

```
[Worker stops EXTRA intervention]
   └─> stopIntervention
          ├─> intervention.status = COMPLETATO
          └─> notifyInterventionExtraClosed → EmailLog(ADMIN_ALERT_…)
                                          └─> sendEmail (Resend|mock)

[Admin markAsAccepted quote]
   └─> notifyQuoteAccepted → EmailLog(ADMIN_ALERT_QUOTE_ACCEPTED)

[Admin markReadyForExport invoice]
   └─> notifyInvoiceReadyExport → EmailLog(ADMIN_ALERT_INVOICE_READY_EXPORT)

[Worker uploads document]
   └─> uploadIncomingDocumentCore
          ├─> incoming_document inserted
          └─> notifyOcrDocToValidate → EmailLog(ADMIN_ALERT_OCR_DOC_TO_VALIDATE)

[Cron orario]
   └─> /api/cron/email-retry
          └─> processRetryQueue
                ├─> picks FALLITO logs eligible
                ├─> retries via sendEmail
                └─> updates retryCount + nextRetryAt
```

## Cosa NON è incluso (PR #10)

- Webhook Resend per tracking apertura/bounce/spam → log live status
- Persistenza body/allegati per retry completo dei rapporti/preventivi
- Pannello settings UI per editare template, mittente default, soglie retry
- Invii batch programmati (digest giornaliero/settimanale)
- Audit log dedicato (separato da EmailLog)
- SMS/WhatsApp/push
