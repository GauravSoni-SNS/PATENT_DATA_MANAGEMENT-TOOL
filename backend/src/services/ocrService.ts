import fs from 'fs';
import path from 'path';
import { createWorker, Worker } from 'tesseract.js';

/**
 * Optical character recognition for scanned receipts, via tesseract.js.
 *
 * A scanned PDF holds one image per page rather than a text layer, so the page
 * images are pulled out and read individually. This is the only way to get text
 * out of a scan: rendering it to another image format does not create letters,
 * something has to recognise them.
 *
 * The worker is heavy (roughly 150-250 MB resident once a language is loaded),
 * so it is created on first use and can be switched off entirely on small
 * instances with OCR_ENABLED=false.
 */

let workerPromise: Promise<Worker> | null = null;

export function isOcrEnabled(): boolean {
  return (process.env.OCR_ENABLED ?? 'true') !== 'false';
}

/**
 * Language data ships with the project rather than being fetched on first use:
 * a runtime download makes the first scan of every cold start hang on network
 * that may not be reachable at all.
 */
function bundledLangPath(): string | undefined {
  const candidate = path.join(process.cwd(), 'node_modules', '@tesseract.js-data', 'eng', '4.0.0');
  return fs.existsSync(candidate) ? candidate : undefined;
}

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    const language = process.env.OCR_LANGUAGE || 'eng';
    const langPath = process.env.OCR_LANG_PATH || bundledLangPath();
    workerPromise = createWorker(language, undefined, langPath ? { langPath, gzip: true } : undefined);
  }
  return workerPromise;
}

/** Frees the worker's memory; used on shutdown and after a long idle. */
export async function shutdownOcr(): Promise<void> {
  if (!workerPromise) return;
  const worker = await workerPromise;
  workerPromise = null;
  await worker.terminate();
}

export interface OcrOutcome {
  text: string;
  confidence: number;
  pages: number;
  engine: 'tesseract.js';
}

function usableText(text: string): string {
  return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/** Reads a single image file. */
export async function ocrImage(filePath: string): Promise<OcrOutcome> {
  const worker = await getWorker();
  const { data } = await worker.recognize(filePath);
  return {
    text: usableText(data.text || ''),
    confidence: Math.round(data.confidence ?? 0) / 100,
    pages: 1,
    engine: 'tesseract.js',
  };
}

/**
 * Reads a PDF that has no text layer by recognising each page's embedded
 * image. Pages are processed in order and joined, so field patterns that span
 * a page break still match.
 */
export async function ocrScannedPdf(filePath: string, maxPages = 5): Promise<OcrOutcome> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: fs.readFileSync(filePath) });

  try {
    const result = await parser.getImage();
    const pages = result?.pages ?? [];
    if (!pages.length) {
      throw new Error('No page images found in that PDF');
    }

    const worker = await getWorker();
    const texts: string[] = [];
    let confidenceTotal = 0;
    let read = 0;

    for (const page of pages.slice(0, maxPages)) {
      for (const image of page.images ?? []) {
        // pdf-parse hands back a data URL or raw bytes depending on the
        // embedded image format; tesseract accepts either.
        const embedded = image as { dataUrl?: string; data?: Uint8Array };
        const source = embedded.dataUrl ?? (embedded.data ? Buffer.from(embedded.data) : undefined);
        if (!source) continue;
        const { data } = await worker.recognize(source);
        if (data.text?.trim()) {
          texts.push(data.text);
          confidenceTotal += data.confidence ?? 0;
          read += 1;
        }
      }
    }

    if (!read) throw new Error('No readable text was found in the page images');

    return {
      text: usableText(texts.join('\n')),
      confidence: Math.round(confidenceTotal / read) / 100,
      pages: read,
      engine: 'tesseract.js',
    };
  } finally {
    await parser.destroy();
  }
}
