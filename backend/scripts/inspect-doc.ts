/** Prints the raw text and the extracted fields for one document. */
import { extractReceiptText } from '../src/services/receiptTextService';
import { extractDocument } from '../src/services/documentExtractor';

async function main() {
  const file = process.argv[2];
  const read = await extractReceiptText(file, file);
  console.log('--- SOURCE:', read.source, read.ocrConfidence ? `(confidence ${read.ocrConfidence})` : '');
  console.log('--- RAW TEXT ---');
  console.log(read.text.slice(0, 2500));
  console.log('--- EXTRACTED ---');
  const parsed = extractDocument(read.text);
  console.log(JSON.stringify({ ...parsed, fieldSources: undefined }, null, 1));
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
