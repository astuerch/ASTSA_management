import type { OcrDocumentKind, OcrResult } from './types';
import { isMindeeConfigured, mindeeExtract } from './mindee';
import { mockExtract } from './mock';

/**
 * Single entry-point per l'OCR documenti in entrata.
 * - Se MINDEE_API_KEY è presente usa Mindee.
 * - Altrimenti restituisce dati mock per dev/CI.
 *
 * Switch futuri (es. provider Azure) si fanno qui senza toccare le actions.
 */
export async function extractDocument(
  buffer: Buffer,
  filename: string,
  kind: OcrDocumentKind,
): Promise<OcrResult> {
  if (!isMindeeConfigured()) {
    return mockExtract(kind);
  }

  try {
    return await mindeeExtract(buffer, filename, kind);
  } catch (err) {
    // Non vogliamo che un fallimento OCR blocchi l'upload: salviamo il file
    // e marchiamo il documento come DA_VALIDARE con dati vuoti.
    console.error('[ocr] Mindee fallita, fallback mock:', err);
    return mockExtract(kind);
  }
}

export type { OcrDocumentKind, OcrResult };
