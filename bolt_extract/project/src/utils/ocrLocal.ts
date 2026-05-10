import { createWorker } from 'tesseract.js';

export interface OcrProgress {
  status: string;
  progress: number; // 0–1
}

export interface OcrMed {
  name: string;
  dose: string;
  frequency: string;
}

export interface OcrResult {
  meds: OcrMed[];
  rawText: string;
}

// Run Tesseract OCR on a data URL, reporting progress via callback
export async function runLocalOcr(
  imageDataUrl: string,
  onProgress: (p: OcrProgress) => void
): Promise<OcrResult> {
  const worker = await createWorker('jpn', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress({ status: 'テキスト認識中...', progress: m.progress });
      } else if (m.status === 'loading language traineddata') {
        onProgress({ status: '日本語データ読み込み中...', progress: m.progress * 0.5 });
      } else {
        onProgress({ status: m.status, progress: 0 });
      }
    },
  });

  const { data } = await worker.recognize(imageDataUrl);
  await worker.terminate();

  const rawText = data.text ?? '';
  const meds = parseMedications(rawText);
  return { meds, rawText };
}

// Heuristic parser: tries to extract drug lines from OCR output
function parseMedications(text: string): OcrMed[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  const results: OcrMed[] = [];

  // Pattern: contains dose-like tokens (mg, g, mL, 錠, 包, 分, 回)
  const dosePattern = /(\d+(?:\.\d+)?\s*(?:mg|ｍｇ|g|ｇ|mL|ｍＬ|ml|錠|包|カプセル|cap))/i;
  const freqPattern = /(1日\s*\d+回|分\d|頓服|就寝前|食前|食後|食間|朝|夕|夜)/;

  for (const line of lines) {
    const doseMatch = line.match(dosePattern);
    const freqMatch = line.match(freqPattern);

    if (doseMatch || freqMatch) {
      // Name: everything before the dose token, or first token
      const namePart = doseMatch
        ? line.slice(0, line.indexOf(doseMatch[0])).trim()
        : line.split(/\s+/)[0] ?? line;
      const name = namePart.replace(/^[\d\s・\-\.]+/, '').trim() || line.split(/\s+/)[0] || line;
      const dose = doseMatch ? doseMatch[1] : '';
      const frequency = freqMatch ? freqMatch[0] : '';

      if (name.length > 1) {
        results.push({ name, dose, frequency });
      }
    }
  }

  // Fallback: if nothing parsed, return raw lines as individual entries for manual review
  if (results.length === 0 && lines.length > 0) {
    return lines.slice(0, 10).map((l) => ({ name: l, dose: '', frequency: '' }));
  }

  return results;
}
