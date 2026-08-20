export interface ParsedReceiptData {
  matterNumber?: string;
  officialAppNumber?: string;
  title?: string;
  clientName?: string;
  clientEmail?: string;
  jurisdiction?: string;
  stage?: string;
  triggerDate?: string;
  priorityDate?: string;
  cbrNumber?: string;
  officialFees?: number;
  currency?: string;
  receiptTitle?: string;
  abstract?: string;
}

export const SAMPLE_RECEIPTS = [
  {
    id: 'SAMPLE_IPO_PROVISIONAL',
    label: '🇮🇳 Indian Patent Office (IPO) - Provisional Filing CBR',
    jurisdiction: 'IN',
    stage: 'PROVISIONAL',
    fileName: 'IPO_CBR_Provisional_202611098412.pdf',
    rawText: `GOVERNMENT OF INDIA\nTHE PATENT OFFICE\nCBR Number: CBR-2026-981245\nApplication Number: 202611098412\nApplicant / Client: Solaria Quantum Innovations Ltd.\nContact Email: patents@solariaquantum.com\nInvention Title: Quantum Dot Photovoltaic Cells with Perovskite Tandem Heterojunction\nStatutory Fees Paid: INR 8000.00\nDate & Time of Transaction: 18/08/2026 11:24:32 IST`,
    extractedData: {
      matterNumber: 'IN-2026-PAT-00984',
      officialAppNumber: '202611098412',
      title: 'Quantum Dot Photovoltaic Cells with Perovskite Tandem Heterojunction',
      clientName: 'Solaria Quantum Innovations Ltd.',
      clientEmail: 'patents@solariaquantum.com',
      jurisdiction: 'IN',
      stage: 'PROVISIONAL',
      triggerDate: '2026-08-18',
      priorityDate: '2026-08-18',
      cbrNumber: 'CBR-2026-981245',
      officialFees: 8000,
      currency: 'INR',
    },
  },
  {
    id: 'SAMPLE_USPTO_NONPROV',
    label: '🇺🇸 USPTO Patent Center - Utility Non-Provisional Filing Receipt',
    jurisdiction: 'US',
    stage: 'COMPLETE',
    fileName: 'USPTO_PatentCenter_Ack_18992140.pdf',
    rawText: `UNITED STATES PATENT AND TRADEMARK OFFICE\nApplication Number: 18/992,140\nApplicant: NeuroVanguard Systems LLC\nApplicant Contact Email: ip-docket@neurovanguard.com\nTitle of Invention: Adaptive Neural Interface for Prosthetic Limb Control\nFiling Date: 08/18/2026\nEFS ID: EFS-2026-881902\nFees Paid: USD 1820.00`,
    extractedData: {
      matterNumber: 'US-18/992,140',
      officialAppNumber: '18/992,140',
      title: 'Adaptive Neural Interface for Prosthetic Limb Control',
      clientName: 'NeuroVanguard Systems LLC',
      clientEmail: 'ip-docket@neurovanguard.com',
      jurisdiction: 'US',
      stage: 'COMPLETE',
      triggerDate: '2026-08-18',
      priorityDate: '2026-08-18',
      cbrNumber: 'EFS-2026-881902',
      officialFees: 1820,
      currency: 'USD',
    },
  },
];

export function parseReceiptText(rawText: string): ParsedReceiptData {
  const extracted: ParsedReceiptData = {};

  const appMatch = rawText.match(/Application Number:\s*([^\n\r]+)/i);
  if (appMatch) extracted.officialAppNumber = appMatch[1].trim();

  const cbrMatch = rawText.match(/(?:CBR Number|EFS ID|Transaction ID):\s*([^\n\r]+)/i);
  if (cbrMatch) extracted.cbrNumber = cbrMatch[1].trim();

  const titleMatch = rawText.match(/(?:Invention Title|Title of Invention):\s*([^\n\r]+)/i);
  if (titleMatch) extracted.title = titleMatch[1].trim();

  const clientMatch = rawText.match(/(?:Applicant(?: \/ Client)?|Applicant):\s*([^\n\r]+)/i);
  if (clientMatch) extracted.clientName = clientMatch[1].trim();

  const emailMatch = rawText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  if (emailMatch) extracted.clientEmail = emailMatch[1].trim();

  const feesMatch = rawText.match(/(?:Statutory )?Fees Paid:\s*(?:INR|USD|EUR)?\s*([\d,.]+)/i);
  if (feesMatch) extracted.officialFees = parseFloat(feesMatch[1].replace(/,/g, ''));

  if (/INR/i.test(rawText)) extracted.currency = 'INR';
  else if (/USD/i.test(rawText)) extracted.currency = 'USD';
  else if (/EUR/i.test(rawText)) extracted.currency = 'EUR';

  const dateMatch = rawText.match(/(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    const d = dateMatch[1];
    if (d.includes('/')) {
      const [day, month, year] = d.split('/');
      extracted.triggerDate = `${year}-${month}-${day}`;
    } else {
      extracted.triggerDate = d;
    }
    extracted.priorityDate = extracted.triggerDate;
  }

  if (/INDIA|IPO|PATENT OFFICE/i.test(rawText)) extracted.jurisdiction = 'IN';
  else if (/USPTO|UNITED STATES/i.test(rawText)) extracted.jurisdiction = 'US';
  else if (/EPO|EUROPEAN/i.test(rawText)) extracted.jurisdiction = 'EP';

  if (/Provisional/i.test(rawText)) extracted.stage = 'PROVISIONAL';
  else if (/Non-Provisional|Complete/i.test(rawText)) extracted.stage = 'COMPLETE';

  if (extracted.officialAppNumber && extracted.jurisdiction) {
    extracted.matterNumber = `${extracted.jurisdiction}-${extracted.officialAppNumber.replace(/\//g, '')}`;
  }

  return extracted;
}

export function getSampleById(id: string) {
  return SAMPLE_RECEIPTS.find((s) => s.id === id);
}

export function listSamples() {
  return SAMPLE_RECEIPTS.map(({ id, label, jurisdiction, stage, fileName }) => ({
    id, label, jurisdiction, stage, fileName,
  }));
}
