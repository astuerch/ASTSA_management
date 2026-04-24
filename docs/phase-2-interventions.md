# Fase 2 – App Dipendenti e Gestione Interventi

## Panoramica

La Fase 2 implementa il flusso completo di gestione degli interventi:
- App mobile-first per i dipendenti sul campo (`/work/*`)
- Vista amministrativa degli interventi (`/dashboard/interventions`)
- Upload foto su Cloudinary con fallback mock
- Geolocalizzazione opzionale
- Firma cliente digitale

---

## Flusso Start → Stop → Validate

```
[Dipendente] → /work → [Nessun intervento aperto]
                ↓
          /work/start
          • seleziona stabile
          • sceglie WorkType
          • (opz.) consenti geolocalizzazione
          • (opz.) colleghi presenti
          • Preme INIZIA
                ↓
        [startIntervention()] → status = IN_CORSO
                ↓
    /work (home) — mostra card con timer live
          ↓ foto (/work/photo)
          ↓ materiali (/work/materials)
          ↓ anomalie (/work/stop)
                ↓
          /work/stop
          • note finali
          • anomalie
          • firma cliente (canvas)
          • Preme TERMINA
                ↓
        [stopIntervention()] → status = COMPLETATO, durationMinutes calcolato
                ↓
    [Admin] → /dashboard/interventions
          • filtra per stato, tipo, stabile
          • apre dettaglio
          • Preme VALIDA
                ↓
        [validateIntervention()]
          • isExtra → status = PRONTO_FATTURA
          • !isExtra → status = VALIDATO
```

---

## WorkType — Significato Business

| WorkType | Descrizione |
|---|---|
| `ORDINARIO` | Intervento da contratto di custodia regolare |
| `EXTRA` | Lavoro extra fatturabile (es. sgombero, tinteggio) |
| `TRASFERTA` | Trasferta fuori zona, con maggiorazione |
| `REGIA` | Lavoro a ore (regia), fatturato a consuntivo |
| `FORFAIT` | Lavoro a prezzo fisso concordato |
| `STRAORDINARIO` | Ore straordinarie con maggiorazione |
| `PICCHETTO` | Intervento di guardia / reperibilità |
| `EMERGENZA` | Intervento urgente fuori orario |

---

## InterventionStatus — Ciclo di vita

| Status | Descrizione |
|---|---|
| `IN_CORSO` | Start fatto, stop non ancora eseguito |
| `COMPLETATO` | Stop fatto, in attesa di validazione ufficio |
| `VALIDATO` | Validato dall'ufficio (interventi ordinari) |
| `PRONTO_FATTURA` | Validato + extra → pronto per esportazione Sage |

---

## Permessi per Ruolo

### DIPENDENTE
- Accede solo a `/work/*` e `/dashboard/interventions?mine=true`
- Vede solo i propri interventi
- Non vede costi materiali / prezzi
- Può: avviare, fermare (se lead), aggiungere foto e materiali

### CAPOSQUADRA
- Come DIPENDENTE + vede gli interventi dei colleghi in cui è coinvolto
- Può: terminare interventi come lead

### AMMINISTRAZIONE
- Vede tutti gli interventi
- Può: validare interventi, correggere ore (con audit log)
- Vede costi materiali

### DIREZIONE
- Come AMMINISTRAZIONE + vede sempre costi e margini

---

## Geolocalizzazione

- **Opzionale** con permesso esplicito browser
- Checkbox "Consenti geolocalizzazione" nella schermata start
- Se negato o non disponibile, l'intervento procede normalmente
- Coordinate salvate: `startLat`, `startLng`, `startAccuracy`, `endLat`, `endLng`
- Nel dettaglio admin: link OpenStreetMap (no API key richiesta)

---

## Firma Cliente

- Canvas HTML5 implementato in `components/work/signature-canvas.tsx`
- Disegno touch-friendly (supporta sia mouse che touch)
- Bottone "Pulisci" per ricominciare
- Campo nome firmatario opzionale
- La firma viene salvata come data URL PNG nel campo `clientSignatureUrl`
- In produzione: caricata su Cloudinary come PNG

---

## Upload Foto (Cloudinary)

### Configurazione
```env
CLOUDINARY_CLOUD_NAME=tuo-cloud-name
CLOUDINARY_API_KEY=tua-api-key
CLOUDINARY_API_SECRET=tua-api-secret
```

### Folder Cloudinary
- Foto: `astsa/interventions/{interventionId}`
- Firma: `astsa/interventions/{interventionId}` (stessa cartella)

### Fallback Dev
Se le variabili Cloudinary **non** sono configurate:
- `uploadImage()` → restituisce `https://placehold.co/800x600?text=mock-photo`
- `uploadSignature()` → restituisce URL mock
- L'app funziona completamente senza Cloudinary in dev

### Route Upload
- `POST /api/upload` → riceve `FormData` con `file` e `folder`, restituisce `{url, publicId}`
- `POST /api/intervention/add-photo` → riceve JSON con `{interventionId, url, publicId, kind}`

---

## Audit Log (correzione ore)

Quando un admin usa "Correggi ore":
1. Si crea un record `InterventionAuditLog` per ogni campo modificato
2. Ogni record contiene: `changedField`, `oldValue`, `newValue`, `changedAt`, `userId`
3. Il log è visibile nel dettaglio intervento (solo admin)

---

## Offline Mode

**NON implementato** in questa fase. Rimandato alla Fase 6.
L'app richiede connessione per tutte le operazioni.

---

## File principali

| File | Descrizione |
|---|---|
| `lib/actions/interventions.ts` | Server Actions: start, stop, addPhoto, addMaterial, validate, updateHours |
| `lib/time.ts` | Helpers: calculateDurationMinutes, formatDuration |
| `lib/cloudinary.ts` | Upload su Cloudinary con mock fallback |
| `app/work/layout.tsx` | Layout mobile-first per dipendenti |
| `app/work/page.tsx` | Home: intervento in corso o bottone Inizia |
| `app/work/start/page.tsx` | Schermata avvio intervento |
| `app/work/stop/page.tsx` | Schermata terminazione con firma |
| `app/work/photo/page.tsx` | Upload foto |
| `app/work/materials/page.tsx` | Aggiunta materiali |
| `app/dashboard/interventions/page.tsx` | Lista admin con filtri |
| `app/dashboard/interventions/[id]/page.tsx` | Dettaglio con validazione e audit log |
| `components/work/intervention-timer.tsx` | Timer live lato client |
| `components/work/signature-canvas.tsx` | Canvas firma cliente |
| `components/work/photo-client.tsx` | Upload foto client-side |
