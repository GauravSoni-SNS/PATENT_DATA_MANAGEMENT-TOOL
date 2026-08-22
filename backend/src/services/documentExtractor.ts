import {
  DOCUMENT_PROFILES,
  COMMON_FIELDS,
  STAGE_SIGNALS,
  DocumentProfile,
  FieldRule,
  DateOrder,
} from '../knowledge/documentProfiles';

export interface ExtractedField {
  value: string | number;
  /** The pattern that produced it, for showing why a value was chosen. */
  matchedOn: string;
}

export interface ExtractionResult {
  profileId: string | null;
  profileLabel: string;
  jurisdiction?: string;
  stage?: string;
  matterNumber?: string;
  officialAppNumber?: string;
  cbrNumber?: string;
  title?: string;
  clientName?: string;
  clientEmail?: string;
  officialFees?: number;
  currency?: string;
  triggerDate?: string;
  priorityDate?: string;
  hearingTime?: string;
  hearingMode?: string;
  classes?: string;
  applicationDate?: string;
  /** 0-1, from how strongly the document matched and how much was found. */
  confidence: number;
  /** Fields the profile looks for but could not find, for review prompts. */
  missing: string[];
  fieldSources: Record<string, string>;
}

/** Identifies the issuing authority by counting the signals present. */
export function scoreProfile(text: string, profile: DocumentProfile): number {
  let score = 0;
  profile.signals.forEach((signal, index) => {
    if (signal.test(text)) {
      // Earlier signals are the stronger identifiers.
      score += profile.signals.length - index;
    }
  });
  return score;
}

export function selectProfile(text: string): { profile: DocumentProfile | null; score: number } {
  let best: DocumentProfile | null = null;
  let bestScore = 0;
  for (const profile of DOCUMENT_PROFILES) {
    const score = scoreProfile(text, profile);
    if (score > bestScore) {
      best = profile;
      bestScore = score;
    }
  }
  return { profile: best, score: bestScore };
}

/**
 * Numeric dates are ambiguous across authorities: 08/09/2026 is 8 September in
 * India and 9 August at the USPTO. The profile says which order to read, so a
 * date is never guessed.
 */
export function parseDate(raw: string, order: DateOrder): string | undefined {
  const parts = raw.trim().split(/[\/\-.]/).map((p) => p.trim());
  if (parts.length !== 3) return undefined;

  let year: string;
  let month: string;
  let day: string;

  if (order === 'YMD' || parts[0].length === 4) {
    [year, month, day] = parts;
  } else if (order === 'MDY') {
    [month, day, year] = parts;
  } else {
    [day, month, year] = parts;
  }

  if (year.length === 2) year = String(2000 + Number(year));

  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return undefined;

  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  // Reject impossible calendar dates such as 31 February.
  const check = new Date(iso);
  if (Number.isNaN(check.getTime()) || check.getUTCDate() !== d) return undefined;
  return iso;
}

function applyRule(text: string, rule: FieldRule, order: DateOrder): ExtractedField | undefined {
  for (const pattern of rule.patterns) {
    const match = text.match(pattern);
    const captured = match?.[1]?.trim();
    if (!captured) continue;

    if (rule.kind === 'number') {
      const value = parseFloat(captured.replace(/,/g, ''));
      if (Number.isNaN(value)) continue;
      return { value, matchedOn: pattern.source };
    }

    if (rule.kind === 'date') {
      const iso = parseDate(captured, order);
      if (!iso) continue;
      return { value: iso, matchedOn: pattern.source };
    }

    // Trim separator noise from line-wrapped forms, but never a full stop:
    // company suffixes end in one ("Innovations Ltd.").
    // Forms wrap mid-value, so a captured time can arrive with a newline
    // inside it ("10:00 AM TO" / "01:30 PM"). Collapse runs of whitespace.
    const cleaned = captured
      .replace(/\s+/g, ' ')
      .replace(/[\s,;:-]+$/, '');
    return { value: cleaned, matchedOn: pattern.source };
  }
  return undefined;
}

function detectStage(text: string): string | undefined {
  for (const entry of STAGE_SIGNALS) {
    if (entry.patterns.some((p) => p.test(text))) return entry.stage;
  }
  return undefined;
}

/**
 * A bare currency symbol is not evidence: PDFs of Devanagari forms carry
 * stray $ and similar from mangled glyphs. Only a symbol next to an amount,
 * or an explicit currency code, counts.
 */
function detectCurrency(text: string, fallback?: string): string | undefined {
  if (/\bINR\b|₹\s*\d|\bRs\.?\s*\d/i.test(text)) return 'INR';
  if (/\bUSD\b|\$\s*\d/.test(text)) return 'USD';
  if (/\bEUR\b|€\s*\d/.test(text)) return 'EUR';
  return fallback;
}

/**
 * Reads a receipt using the knowledge base: identify the document, then apply
 * that document's field rules. Returns what it found, what it could not find,
 * and how confident the match is, so a low-confidence read can be reviewed
 * rather than silently docketed.
 */
export function extractDocument(rawText: string): ExtractionResult {
  const text = rawText.replace(/\r\n/g, '\n');
  const { profile, score } = selectProfile(text);

  const result: ExtractionResult = {
    profileId: profile?.id ?? null,
    profileLabel: profile?.label ?? 'Unrecognised document',
    confidence: 0,
    missing: [],
    fieldSources: {},
  };

  const order: DateOrder = profile?.dateOrder ?? 'DMY';
  const rules = [...(profile?.fields ?? []), ...COMMON_FIELDS];

  const seen = new Set<string>();
  let found = 0;
  for (const rule of rules) {
    if (seen.has(rule.field)) continue;
    const hit = applyRule(text, rule, order);
    if (hit) {
      seen.add(rule.field);
      found += 1;
      (result as unknown as Record<string, unknown>)[rule.field] = hit.value;
      result.fieldSources[rule.field] = hit.matchedOn;
    } else if (profile?.fields.some((f) => f.field === rule.field)) {
      result.missing.push(rule.field);
    }
  }

  if (profile) {
    result.jurisdiction = profile.jurisdiction;
    result.stage = detectStage(text) ?? profile.stage;
  } else {
    result.stage = detectStage(text);
  }
  result.currency = detectCurrency(text, profile?.defaultCurrency);

  if (result.triggerDate && !result.priorityDate) result.priorityDate = result.triggerDate;

  if (result.officialAppNumber && result.jurisdiction) {
    result.matterNumber = `${result.jurisdiction}-${result.officialAppNumber.replace(/[\/,\s]/g, '')}`;
  }

  // Confidence blends how well the authority was identified with how much of
  // its expected field set was actually located.
  const expected = profile ? profile.fields.length : 1;
  const identity = profile ? Math.min(1, score / ((profile.signals.length * (profile.signals.length + 1)) / 2)) : 0;
  const coverage = Math.min(1, found / (expected + 1));
  result.confidence = profile ? Number((identity * 0.5 + coverage * 0.5).toFixed(2)) : 0;

  return result;
}

/** The document types the knowledge base understands, for the UI. */
export function listProfiles() {
  return DOCUMENT_PROFILES.map((p) => ({
    id: p.id,
    label: p.label,
    jurisdiction: p.jurisdiction,
    stage: p.stage ?? null,
    fields: p.fields.map((f) => f.field),
    dateOrder: p.dateOrder,
  }));
}
