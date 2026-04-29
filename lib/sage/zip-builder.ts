import JSZip from 'jszip';

const README_TEMPLATE = `ASTSA - Export Infoniqa ONE Start
Batch: {batchNumber}
Data generazione: {date}
Numero registrazioni: {count}
Importo totale: {total} CHF

ISTRUZIONI IMPORT:
1. Estrai il file ZIP in una cartella locale.
2. Apri Infoniqa ONE Start -> Contabilità -> Importazione -> Registrazioni.
3. Seleziona "registrazioni.csv".
4. Al primo import: configura il mapping colonne come da "mapping-info.txt".
   (Infoniqa memorizza il mapping per gli import successivi.)
5. Verifica anteprima registrazioni e conferma import.
6. Per ogni registrazione importata, allega il PDF corrispondente
   dalla cartella "pdf/" (campo "PdfAllegato" indica il file).
7. Una volta completato l'import, torna nell'app ASTSA ->
   /dashboard/sage/exports -> batch {batchNumber} -> "Conferma import avvenuto".
   Questo aggiorna lo stato delle bozze a "REGISTRATO_SAGE".

In caso di errori contattare l'amministratore tecnico ASTSA.
`;

const MAPPING_INFO = `MAPPING COLONNE CSV -> INFONIQA ONE START
========================================

Colonna CSV          -> Campo Infoniqa
Data                 -> Data registrazione
NumeroDocumento      -> Numero documento
ContoDare            -> Conto Dare
ContoAvere           -> Conto Avere
ImportoLordo         -> Importo (incl. IVA)
CodiceIVA            -> Codice IVA
Testo                -> Testo della registrazione
CentroCosto          -> Centro di costo
NumeroCliente        -> Conto cliente / partner
PdfAllegato          -> (allegare manualmente file dalla cartella pdf/)
Valuta               -> Valuta
Imponibile           -> (campo di controllo)
ImportoIVA           -> (campo di controllo)
RigheDettaglio       -> (informativo, puo essere ignorato)

Encoding file: UTF-8 con BOM
Separatore campi: ;
Separatore decimale: .
Formato data: DD.MM.YYYY
`;

export interface ZipInvoice {
  number: string;
  pdfBuffer: Buffer;
}

export interface BuildZipOptions {
  batchNumber: string;
  csvContent: string;
  invoices: ZipInvoice[];
  totalAmountCents: number;
}

export async function buildExportZip(options: BuildZipOptions): Promise<Buffer> {
  const { batchNumber, csvContent, invoices, totalAmountCents } = options;
  const zip = new JSZip();

  zip.file('registrazioni.csv', csvContent);

  const pdfFolder = zip.folder('pdf')!;
  for (const inv of invoices) {
    pdfFolder.file(`${inv.number}.pdf`, inv.pdfBuffer);
  }

  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const totalStr = (totalAmountCents / 100).toFixed(2);

  const readme = README_TEMPLATE
    .replace(/\{batchNumber\}/g, batchNumber)
    .replace('{date}', dateStr)
    .replace('{count}', String(invoices.length))
    .replace('{total}', totalStr);

  zip.file('README.txt', readme);
  zip.file('mapping-info.txt', MAPPING_INFO);

  return zip.generateAsync({ type: 'nodebuffer' });
}
