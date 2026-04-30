# Phase 6 PR #8 — Invio email rapporti / preventivi (Resend)

Prima slice della Fase 6. Aggiunge invio manuale via email di:

- **Rapporto intervento** (variant cliente, senza costi) dal detail intervento
- **Preventivo** dal detail preventivo (con auto-mark `BOZZA → INVIATO`)

## Cosa è incluso

- Provider Resend (REST API) con fallback **mock** se `RESEND_API_KEY` non
  configurata. Niente crash in dev/CI.
- Safety guard `SAFE_EMAIL_ONLY` per bloccare invii accidentali a domini reali
  in dev/staging.
- Template i18n IT / DE-CH con escape HTML automatico. DE-CH segue la convenzione
  progetto (nessun "ß", sempre "ss").
- Server Actions con Zod input + `requireRole(['AMMINISTRAZIONE','DIREZIONE'])`.
- Allegato PDF generato server-side con `@react-pdf/renderer` (riusa
  `InterventionReportPdf` e `QuotePdf` esistenti).
- Tabella `EmailLog` con stato `INVIATO` / `FALLITO`, errorMessage, messageId
  Resend, allegato, lingua, riferimento al doc originale.
- BCC automatico a `EMAIL_BCC_ADMIN` per audit interno.
- Pagina `/dashboard/email-log` (ultimi 100 invii, filtrabile per tipo/stato)
  con link al documento sorgente.
- UI: `<SendEmailForm>` riutilizzabile con selettore lingua + override
  destinatario, compaiono nelle pagine intervention/quote detail.

## Cosa NON è incluso (PR successive)

- Invio bozze fattura (rimandato a #9 della Fase 6 o seguente)
- Auto-trigger su eventi (intervento chiuso → email automatica) — Fase 6 #9
- Webhook Resend per tracking apertura/bounce — Fase 6 #10
- Reminder scadenza fatture — Fase 6 #9
- Retry automatico su transient error — Fase 6 #9
- Pannello settings/templates editabili da UI — Fase 6 #10
- SMS / WhatsApp / push — Fase 7+

## Architettura

```
[Detail intervento o preventivo]
        │
        ▼
[<SendEmailForm>]  client component, locale + override email
        │
        ▼ (form action)
[lib/actions/emails.ts]   sendInterventionReportEmail / sendQuoteEmail
        │
        ├──> renderToBuffer(InterventionReportPdf | QuotePdf)
        ├──> buildInterventionReportEmail / buildQuoteEmail (i18n)
        ├──> sendEmail (lib/email/provider)
        │       ├─ assertAllowedRecipients (SAFE_EMAIL_ONLY)
        │       ├─ Resend API (se key configurata)
        │       └─ mock (fallback)
        └──> prisma.emailLog.create (status, errorMessage, messageId)
```

## Modello dati

```
model EmailLog {
  id                String  @id @default(cuid())
  type              EmailLogType    // INTERVENTION_REPORT | QUOTE
  status            EmailLogStatus  // INVIATO | FALLITO
  referenceId       String          // ID intervento (numero) o quote (cuid)
  recipientEmail    String
  ccEmails          String?
  subject           String
  locale            String
  errorMessage      String?
  providerMessageId String?
  attachmentName    String?
  sentById          Int
  sentAt            DateTime
}
```

## Variabili d'ambiente

| Variabile | Obbligatoria | Note |
|-----------|:------------:|------|
| `RESEND_API_KEY` | ❌ | Senza key parte il fallback mock |
| `EMAIL_FROM` | obbligatoria con Resend | Es. `ASTSA <info@astsa.ch>`. Deve essere un dominio verificato su Resend. |
| `EMAIL_BCC_ADMIN` | ❌ | Es. `amministrazione@astsa.ch`. Riceve copia di ogni invio. |
| `SAFE_EMAIL_ONLY` | ❌ | CSV di indirizzi e/o domini consentiti. Pattern `@dominio.tld` matcha tutto il dominio. Esempio dev: `SAFE_EMAIL_ONLY="@astsa.local,ale@gmail.com"`. |

## Setup Resend

1. Account gratuito su [resend.com](https://resend.com) — free tier 100 email/giorno o 3k/mese.
2. Verifica il dominio `astsa.ch` (DNS records SPF + DKIM + DMARC).
3. Genera una API key e impostala in `RESEND_API_KEY` su Vercel.
4. Imposta `EMAIL_FROM="ASTSA <info@astsa.ch>"`.

## Safety guard `SAFE_EMAIL_ONLY`

In dev/staging serve a bloccare invii accidentali ai clienti reali. Funziona
così:

- Variabile **non impostata** → guardia disattivata, tutti gli invii passano.
- Variabile **impostata** → ogni indirizzo `to`/`cc`/`bcc` viene confrontato
  con la allow-list. Se qualcuno è fuori, l'invio viene bloccato e loggato
  come `FALLITO` con errorMessage esplicito.

Pattern supportati:
- `ale@astsa.local` — match esatto
- `@astsa.local` — match per dominio (qualsiasi mailbox del dominio)

Imposta `SAFE_EMAIL_ONLY="@astsa.local"` in dev e su Vercel preview, lascia
vuota la variabile in production.

## Test

| File | Cosa verifica |
|------|---------------|
| `tests/email.safety.test.ts` | Guardia attiva/disattiva, match esatto vs dominio, case-insensitive, blocco se UN solo destinatario è fuori list |
| `tests/email.templates.test.ts` | IT subject + corpo + escape HTML; DE-CH no "ß", terminologia (Einsatzbericht, Offerte) |
| `tests/email.provider.test.ts` | Fallback mock senza key, safety guard blocca/passa, ritorno SendResult |

## Note operative

- L'invio del preventivo, se va a buon fine, **promuove automaticamente**
  lo stato del Quote da `BOZZA` a `INVIATO` con `sentAt = now`. L'utente non
  deve cliccare due volte.
- Tutti gli errori di rete o di payload vengono loggati come `FALLITO` con
  `errorMessage` leggibile dalla pagina log. Niente eccezioni propagate al
  client.
- Allegato PDF max 10 MB (limite Resend). I rapporti intervento sono tipicamente
  < 500 KB anche con foto; i preventivi sotto i 100 KB.
