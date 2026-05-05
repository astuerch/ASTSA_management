# Phase 6 PR #9.5 — Outlook handoff per email cliente

Refinement della Fase 6 dopo discussione con la committente. La regola
operativa diventa:

- **Email a clienti** → mai inviate dall'app. L'app prepara la bozza e la
  apre in **Outlook desktop** dell'amministrazione, che controlla, modifica
  se serve, e invia dal proprio account aziendale.
- **Email interne (alert admin, retry queue)** → continuano a passare da
  Resend come da PR #8 / PR #9.

Questa scelta:

- Lascia il pieno controllo all'amministrazione su cosa arriva al cliente.
- Mantiene il mittente uniforme dell'ufficio (Outlook) — niente `astsa.ch`
  da configurare su Resend.
- Riduce la superficie di rischio GDPR: il PDF non viene caricato su
  Cloudinary, non passa da Resend, vive solo in RAM tra server e browser.
- Allineata col workflow originale dei documenti di progetto, che parlano
  solo di "preparare/archiviare documenti", non di mandarli automaticamente.

## Vincolo tecnico: `mailto:` non supporta allegati

Lo standard RFC 6068 non permette `attachment=...` nei link `mailto:`.
Quindi il flusso è in due step orchestrati dal client:

1. Click "Prepara email per Outlook"
2. Il backend genera il PDF + costruisce la mailto URL
3. Il client riceve `{ mailtoUrl, pdfBase64 }`:
   - Apre `window.location.href = mailtoUrl` → Outlook si apre con
     destinatario, oggetto, corpo precompilati
   - Forza il download del PDF nei Download del Mac via blob+anchor
4. L'admin trascina il PDF dai Download nella mail Outlook aperta, controlla,
   invia

UX: 2 click + 1 drag-and-drop. Funziona su Outlook desktop, Outlook web,
Apple Mail, Gmail web (ovunque).

## Architettura

```
[detail intervento/preventivo/fattura]
        │
        ▼
[<OutlookHandoffButton>]   client component
        │
        ▼ POST /api/emails/outlook-handoff
[lib/email/outlook-handoff.ts]
        ├─> render PDF (renderToBuffer)
        ├─> build subject + body via templates i18n IT/DE-CH
        ├─> buildMailtoUrl (URL encode subject/body/cc/bcc)
        └─> EmailLog.create { status: PREPARATO, providerMessageId: 'outlook-handoff' }
        │
        ▼ JSON response
{ mailtoUrl, filename, pdfBase64, logId }
        │
        ▼ client
window.location.href = mailtoUrl   →  apre Outlook
URL.createObjectURL(blob) + a.click() →  scarica PDF
```

## Modello dati

Aggiunto valore `PREPARATO` a `EmailLogStatus` (oltre `INVIATO` / `FALLITO`).

Distinguibile nel log:
- `INVIATO` (verde) — partito davvero da Resend (alert interni)
- `PREPARATO` (sky-blue) — handoff a Outlook avvenuto, l'invio finale è
  responsabilità dell'admin (non sappiamo se ha cliccato "send")
- `FALLITO` (rosso) — Resend ha riportato errore

## Template riusati

Sono gli stessi della PR #8: `buildInterventionReportEmail`,
`buildQuoteEmail`, `buildInvoiceReminder`. Cambiano solo il transport
(da Resend API a mailto: URL).

## Cosa NON è incluso

- **Pulsante "marca come inviato a cliente"** — non lo aggiungiamo perché lo
  stato della comunicazione cliente vive in Outlook (sent items aziendale),
  duplicarlo qui creerebbe confusione. Il log mostra solo "PREPARATO".
- **Resend per email cliente** — le action `sendInterventionReportEmail`,
  `sendQuoteEmail`, `sendInvoiceReminderEmail` restano nel codice ma non
  sono più collegate a bottoni UI. Si possono rimuovere in futuro o
  riattivare se cambia decisione strategica.
- **Tracking apertura/lettura** — tecnicamente impossibile con Outlook
  handoff (la mail parte dal client dell'admin, non da Resend).

## Test

`tests/email.outlook-handoff.test.ts` (6 casi):
- Subject + body URL-encoded correttamente
- Caratteri speciali (`&`, `:`, `%`, `?`) escapati
- Accentate italiane (`è`, `é`) percent-encoded UTF-8
- CC e BCC opzionali
- TO senza encoding (RFC 6068)
- Liste vuote ignorate

## Configurazione Resend (post-handoff)

Con questa modifica, **Resend serve solo per gli alert interni** della Fase 6
PR #9. Non occorre verificare il dominio `astsa.ch`. Setup minimo:

```bash
RESEND_API_KEY=re_xxxxx
EMAIL_FROM="ASTSA Alerts <onboarding@resend.dev>"
EMAIL_TO_ADMIN=amministrazione@astsa.ch
```

`onboarding@resend.dev` funziona out-of-the-box per inviare alle email
verificate sull'account Resend (il proprietario dell'account).

Quando in futuro vorrete usare un mittente di brand `notifiche@astsa.ch`
per gli alert, allora servirà la verifica DNS — ma per ora non è necessaria.
