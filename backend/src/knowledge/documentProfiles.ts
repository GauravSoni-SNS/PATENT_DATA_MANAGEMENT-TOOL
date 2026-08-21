/**
 * Knowledge base of patent-office documents.
 *
 * Each profile describes one kind of document from one authority: how to
 * recognise it, where its fields sit, and what the document implies about the
 * matter (jurisdiction, prosecution stage, which date starts the clock).
 *
 * Extraction reads this; it holds no rules of its own. Supporting a new form
 * means adding a profile here, not editing the parser.
 */

export type FieldName =
  | 'officialAppNumber'
  | 'cbrNumber'
  | 'title'
  | 'clientName'
  | 'clientEmail'
  | 'officialFees'
  | 'currency'
  | 'triggerDate'
  | 'priorityDate';

export type DateOrder = 'DMY' | 'MDY' | 'YMD';

export interface FieldRule {
  field: FieldName;
  /** Tried in order; the first with a capture group that matches wins. */
  patterns: RegExp[];
  /** Defaults to 'text'. */
  kind?: 'text' | 'number' | 'date';
}

export interface DocumentProfile {
  id: string;
  label: string;
  jurisdiction: 'IN' | 'US' | 'EP' | 'WO';
  /** Prosecution stage this document evidences, when it is unambiguous. */
  stage?: string;
  /** Phrases identifying the issuing authority and form. Weighted by order. */
  signals: RegExp[];
  /** How this authority writes numeric dates. */
  dateOrder: DateOrder;
  defaultCurrency?: string;
  fields: FieldRule[];
}

/** Field rules shared by most forms, applied after a profile's own rules. */
export const COMMON_FIELDS: FieldRule[] = [
  {
    field: 'clientEmail',
    patterns: [/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i],
  },
  {
    field: 'officialFees',
    patterns: [
      /(?:statutory\s+)?fees?\s*(?:paid|amount)?\s*[:\-]?\s*(?:INR|USD|EUR|Rs\.?|₹|\$|€)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /total\s*(?:fee|amount)\s*[:\-]?\s*(?:INR|USD|EUR|Rs\.?|₹|\$|€)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    ],
    kind: 'number',
  },
];

export const DOCUMENT_PROFILES: DocumentProfile[] = [
  {
    id: 'IN_IPO_CBR',
    label: 'India (IPO) — Controller Batch Receipt / e-filing acknowledgement',
    jurisdiction: 'IN',
    signals: [/government\s+of\s+india/i, /the\s+patent\s+office/i, /CBR\s*(?:No\.?|Number)/i, /form\s*[-\s]?(1|2|3|5)\b/i],
    dateOrder: 'DMY',
    defaultCurrency: 'INR',
    fields: [
      {
        field: 'officialAppNumber',
        patterns: [
          /application\s*(?:no\.?|number)\s*[:\-]?\s*([0-9]{6,}[A-Z\/\-]*)/i,
          /app(?:lication)?\s*ref(?:erence)?\s*[:\-]?\s*([0-9A-Z\/\-]{6,})/i,
        ],
      },
      {
        field: 'cbrNumber',
        patterns: [/CBR\s*(?:No\.?|Number)\s*[:\-]?\s*([A-Z0-9\-\/]+)/i, /receipt\s*(?:no\.?|number)\s*[:\-]?\s*([A-Z0-9\-\/]+)/i],
      },
      {
        field: 'title',
        patterns: [
          /(?:invention\s*title|title\s*of\s*(?:the\s*)?invention)\s*[:\-]?\s*([^\n\r]{4,200})/i,
          /title\s*[:\-]\s*([^\n\r]{4,200})/i,
        ],
      },
      {
        field: 'clientName',
        patterns: [
          /applicant(?:\s*\/\s*client)?(?:\s*name)?\s*[:\-]\s*([^\n\r]{2,120})/i,
          /name\s*of\s*(?:the\s*)?applicant\s*[:\-]?\s*([^\n\r]{2,120})/i,
        ],
      },
      {
        field: 'triggerDate',
        patterns: [
          /(?:date\s*(?:&|and)?\s*time\s*of\s*(?:transaction|filing)|filing\s*date|date\s*of\s*filing)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
          /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/,
        ],
        kind: 'date',
      },
    ],
  },
  {
    id: 'US_USPTO_ACK',
    label: 'USPTO — Patent Center filing receipt / acknowledgement',
    jurisdiction: 'US',
    signals: [/united\s+states\s+patent\s+and\s+trademark/i, /USPTO/i, /patent\s+center/i, /EFS\s*ID/i],
    dateOrder: 'MDY',
    defaultCurrency: 'USD',
    fields: [
      {
        field: 'officialAppNumber',
        patterns: [
          /application\s*(?:no\.?|number)\s*[:\-]?\s*(\d{2}\/\d{3},?\d{3})/i,
          /application\s*(?:no\.?|number)\s*[:\-]?\s*([0-9\/,\-]{6,})/i,
        ],
      },
      {
        field: 'cbrNumber',
        patterns: [/EFS\s*ID\s*[:\-]?\s*([A-Z0-9\-]+)/i, /confirmation\s*(?:no\.?|number)\s*[:\-]?\s*([A-Z0-9\-]+)/i],
      },
      {
        field: 'title',
        patterns: [/title\s*of\s*invention\s*[:\-]?\s*([^\n\r]{4,200})/i, /title\s*[:\-]\s*([^\n\r]{4,200})/i],
      },
      {
        field: 'clientName',
        patterns: [
          /(?:first\s+named\s+)?applicant\s*(?:name)?\s*[:\-]\s*([^\n\r]{2,120})/i,
          /assignee\s*[:\-]\s*([^\n\r]{2,120})/i,
        ],
      },
      {
        field: 'triggerDate',
        patterns: [
          /(?:filing|receipt)\s*date\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
          /(\d{1,2}\/\d{1,2}\/\d{4})/,
        ],
        kind: 'date',
      },
    ],
  },
  {
    id: 'EP_EPO_RECEIPT',
    label: 'EPO — filing receipt / communication',
    jurisdiction: 'EP',
    signals: [/european\s+patent\s+office/i, /\bEPO\b/i, /europäisches\s+patentamt/i],
    dateOrder: 'DMY',
    defaultCurrency: 'EUR',
    fields: [
      {
        field: 'officialAppNumber',
        patterns: [/application\s*(?:no\.?|number)\s*[:\-]?\s*(\d{7,8}\.?\d?)/i, /\b(EP\s?\d{7,8}(?:\.\d)?)\b/i],
      },
      {
        field: 'title',
        patterns: [/title\s*(?:of\s*invention)?\s*[:\-]\s*([^\n\r]{4,200})/i],
      },
      {
        field: 'clientName',
        patterns: [/applicant\s*(?:name)?\s*[:\-]\s*([^\n\r]{2,120})/i],
      },
      {
        field: 'triggerDate',
        patterns: [
          /(?:date\s*of\s*(?:filing|receipt)|filing\s*date)\s*[:\-]?\s*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})/i,
          /(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})/,
        ],
        kind: 'date',
      },
    ],
  },
  {
    id: 'WO_PCT_RECEIPT',
    label: 'WIPO / PCT — international application receipt',
    jurisdiction: 'WO',
    stage: 'COMPLETE',
    signals: [/\bPCT\b/i, /world\s+intellectual\s+property/i, /international\s+application/i, /\bWIPO\b/i],
    dateOrder: 'DMY',
    fields: [
      {
        field: 'officialAppNumber',
        patterns: [/\b(PCT\/[A-Z]{2}\d{4}\/\d{4,6})\b/i, /international\s*application\s*(?:no\.?|number)\s*[:\-]?\s*([A-Z0-9\/]+)/i],
      },
      {
        field: 'title',
        patterns: [/title\s*[:\-]\s*([^\n\r]{4,200})/i],
      },
      {
        field: 'clientName',
        patterns: [/applicant\s*[:\-]\s*([^\n\r]{2,120})/i],
      },
      {
        field: 'triggerDate',
        patterns: [/international\s*filing\s*date\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/i],
        kind: 'date',
      },
    ],
  },
];

/**
 * Phrases that identify the prosecution stage a document evidences. Ordered:
 * the first match wins, so the more specific entries come first.
 */
export const STAGE_SIGNALS: Array<{ stage: string; patterns: RegExp[] }> = [
  { stage: 'EXAMINATION_FER', patterns: [/first\s+examination\s+report/i, /\bFER\b/i, /office\s+action/i, /non-?final\s+rejection/i] },
  { stage: 'HEARING', patterns: [/hearing\s+notice/i, /notice\s+of\s+hearing/i, /oral\s+proceedings/i, /\bhearing\s+(?:is\s+)?(?:scheduled|fixed)/i] },
  { stage: 'ALLOWANCE_GRANT', patterns: [/notice\s+of\s+allowance/i, /intention\s+to\s+grant/i, /grant\s+(?:fee|certificate)/i] },
  { stage: 'ANNUITY_MAINTENANCE', patterns: [/renewal\s+fee/i, /annuity/i, /maintenance\s+fee/i, /form\s*27/i] },
  { stage: 'PUBLICATION_RFE', patterns: [/request\s+for\s+examination/i, /form\s*18/i, /publication\s+under\s+section\s+11a/i] },
  { stage: 'PROVISIONAL', patterns: [/provisional\s+(?:specification|application)/i, /form\s*2\b.*provisional/i] },
  { stage: 'COMPLETE', patterns: [/complete\s+specification/i, /non-?provisional/i, /utility\s+application/i] },
];
