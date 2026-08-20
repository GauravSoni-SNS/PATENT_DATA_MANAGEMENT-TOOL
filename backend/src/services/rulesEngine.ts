export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

export function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

export type Jurisdiction = 'IN' | 'US' | 'EP' | 'WO';

export interface GeneratedDeadline {
  ruleId: string;
  title: string;
  description?: string;
  statutoryDueDate: string;
  isStatutoryBar: boolean;
  isExtendable: boolean;
  maxExtensionMonths?: number;
  extensionProcedure?: string;
  extendedDueDate?: string;
  requiredReceiptType?: string;
  statutorySection?: string;
  gracePeriodDueDate?: string;
}

export const JURISDICTIONS = {
  IN: { name: 'India (IPO)', flag: '🇮🇳' },
  US: { name: 'United States (USPTO)', flag: '🇺🇸' },
  EP: { name: 'European Patent Office (EPO)', flag: '🇪🇺' },
  WO: { name: 'WIPO / PCT International', flag: '🌐' },
};

export const STAGES = {
  INTAKE: { id: 'INTAKE', label: 'Client Intake & Prior Art Search', order: 1 },
  PROVISIONAL: { id: 'PROVISIONAL', label: 'Provisional Application', order: 2 },
  COMPLETE: { id: 'COMPLETE', label: 'Complete / Non-Provisional / PCT', order: 3 },
  PUBLICATION_RFE: { id: 'PUBLICATION_RFE', label: 'Publication & Examination Request', order: 4 },
  EXAMINATION_FER: { id: 'EXAMINATION_FER', label: 'Office Action / FER Examination', order: 5 },
  HEARING: { id: 'HEARING', label: 'Oral Hearing & Submissions', order: 6 },
  ALLOWANCE_GRANT: { id: 'ALLOWANCE_GRANT', label: 'Notice of Allowance & Grant', order: 7 },
  ANNUITY_MAINTENANCE: { id: 'ANNUITY_MAINTENANCE', label: 'Post-Grant Annuities & Maintenance', order: 8 },
};

export const STATUTORY_RULES = {
  PROVISIONAL_FILED: {
    stage: 'PROVISIONAL',
    generateDeadlines: (filingDate: string, jurisdiction: Jurisdiction = 'IN'): GeneratedDeadline[] => [
      {
        ruleId: 'CONVENTION_12M_BAR',
        title: '12-Month Priority Bar (Complete / PCT Filing)',
        description: 'Statutory deadline to file Complete Specification or PCT International Application claiming priority.',
        statutoryDueDate: addMonths(filingDate, 12),
        isStatutoryBar: true,
        isExtendable: false,
        requiredReceiptType: 'COMPLETE_FILING_CBR',
        statutorySection: jurisdiction === 'IN' ? 'Section 9(1), Patents Act 1970' : '35 U.S.C. 119(e) / Paris Convention Art. 4',
      },
      {
        ruleId: 'PCT_30_31M_NATIONAL_PHASE',
        title: 'PCT National Phase Entry Window (30/31 Months)',
        description: 'Statutory window to enter national phase in designated foreign patent offices.',
        statutoryDueDate: addMonths(filingDate, 31),
        isStatutoryBar: true,
        isExtendable: false,
        requiredReceiptType: 'PCT_RECEIPT',
        statutorySection: 'PCT Articles 22 & 39',
      },
    ],
  },
  COMPLETE_FILED: {
    stage: 'COMPLETE',
    generateDeadlines: (filingDate: string, priorityDate: string | null = null, jurisdiction: Jurisdiction = 'IN'): GeneratedDeadline[] => {
      const baseDate = priorityDate || filingDate;
      const deadlines: GeneratedDeadline[] = [
        {
          ruleId: 'PUBLICATION_18M',
          title: '18-Month Statutory Publication',
          description: 'Official publication of application in Patent Office Journal / Gazette.',
          statutoryDueDate: addMonths(baseDate, 18),
          isStatutoryBar: false,
          isExtendable: false,
          statutorySection: jurisdiction === 'IN' ? 'Section 11A, Rule 24' : '35 U.S.C. 122(b)',
        },
      ];
      if (jurisdiction === 'IN') {
        deadlines.push({
          ruleId: 'RFE_DEADLINE_IN',
          title: 'Request for Examination (Form 18/18A)',
          description: 'Mandatory statutory deadline to file Form 18 (RFE).',
          statutoryDueDate: addMonths(baseDate, 48),
          isStatutoryBar: true,
          isExtendable: false,
          requiredReceiptType: 'FORM_18_RECEIPT',
          statutorySection: 'Section 11B, Rule 24B',
        });
      }
      return deadlines;
    },
  },
  FER_OA_ISSUED: {
    stage: 'EXAMINATION_FER',
    generateDeadlines: (ferIssueDate: string, jurisdiction: Jurisdiction = 'IN'): GeneratedDeadline[] => {
      const isIndia = jurisdiction === 'IN';
      const isUS = jurisdiction === 'US';
      const primaryMonths = isIndia ? 6 : isUS ? 3 : 4;
      const statutoryDueDate = addMonths(ferIssueDate, primaryMonths);
      return [
        {
          ruleId: 'FER_RESPONSE_DUE',
          title: isIndia ? 'First Examination Report (FER) Written Response' : 'Office Action (Non-Final Rejection) Response',
          description: 'Statutory time period to submit written response, claim amendments, and supporting evidence.',
          statutoryDueDate,
          isStatutoryBar: true,
          isExtendable: true,
          maxExtensionMonths: 3,
          extensionProcedure: isIndia
            ? 'File Form 4 with official fee before expiry of initial 6 months.'
            : 'File 37 CFR 1.136(a) extension petition with extension fee.',
          extendedDueDate: addMonths(statutoryDueDate, 3),
          requiredReceiptType: 'FER_RESPONSE_CBR',
          statutorySection: isIndia ? 'Section 21(1), Rule 24B(5)' : '37 CFR 1.134 & 1.136',
        },
      ];
    },
  },
  HEARING_SCHEDULED: {
    stage: 'HEARING',
    generateDeadlines: (hearingDate: string, jurisdiction: Jurisdiction = 'IN'): GeneratedDeadline[] => [
      {
        ruleId: 'HEARING_WRITTEN_SUBMISSION',
        title: 'Post-Hearing Written Submissions & Revised Claims',
        description: 'Strict statutory deadline following oral hearing.',
        statutoryDueDate: addDays(hearingDate, 15),
        isStatutoryBar: true,
        isExtendable: false,
        requiredReceiptType: 'HEARING_SUBMISSION_CBR',
        statutorySection: jurisdiction === 'IN' ? 'Rule 28(7), Patent Rules 2003' : 'MPEP 713',
      },
    ],
  },
  NOTICE_OF_ALLOWANCE: {
    stage: 'ALLOWANCE_GRANT',
    generateDeadlines: (allowanceDate: string, jurisdiction: Jurisdiction = 'IN'): GeneratedDeadline[] => [
      {
        ruleId: 'GRANT_ISSUE_FEE',
        title: 'Grant Fee / Issue Fee & Printing Payment',
        description: 'Statutory payment required to seal Letters Patent.',
        statutoryDueDate: addMonths(allowanceDate, 3),
        isStatutoryBar: true,
        isExtendable: false,
        requiredReceiptType: 'ISSUE_FEE_RECEIPT',
        statutorySection: jurisdiction === 'US' ? '37 CFR 1.311' : 'Rule 24B / Rule 28',
      },
    ],
  },
  PATENT_GRANTED: {
    stage: 'ANNUITY_MAINTENANCE',
    generateDeadlines: (grantDate: string, filingDate: string, jurisdiction: Jurisdiction = 'IN'): GeneratedDeadline[] => {
      const renewalYear3 = addYears(filingDate, 3);
      const deadlines: GeneratedDeadline[] = [
        {
          ruleId: 'ANNUITY_YEAR_3',
          title: 'Year 3 Patent Annuity Renewal Fee',
          description: 'Official renewal fee to keep the patent in force.',
          statutoryDueDate: renewalYear3,
          isStatutoryBar: true,
          isExtendable: true,
          gracePeriodDueDate: addMonths(renewalYear3, 6),
          requiredReceiptType: 'ANNUITY_RECEIPT',
          statutorySection: jurisdiction === 'IN' ? 'Section 142, Rule 80' : '35 U.S.C. 41(b)',
        },
      ];
      if (jurisdiction === 'IN') {
        deadlines.push({
          ruleId: 'FORM_27_WORKING_STATEMENT',
          title: 'Form 27 Statement of Commercial Working',
          description: 'Periodic mandatory declaration regarding commercial working.',
          statutoryDueDate: `${new Date().getFullYear()}-09-30`,
          isStatutoryBar: true,
          isExtendable: false,
          requiredReceiptType: 'FORM_27_RECEIPT',
          statutorySection: 'Section 146(2), Rule 131',
        });
      }
      return deadlines;
    },
  },
};

export type TriggerEvent = keyof typeof STATUTORY_RULES;

export function calculateDeadlines(
  triggerEvent: TriggerEvent,
  triggerDate: string,
  jurisdiction: Jurisdiction = 'IN',
  priorityDate?: string
): GeneratedDeadline[] {
  switch (triggerEvent) {
    case 'PROVISIONAL_FILED':
      return STATUTORY_RULES.PROVISIONAL_FILED.generateDeadlines(triggerDate, jurisdiction);
    case 'COMPLETE_FILED':
      return STATUTORY_RULES.COMPLETE_FILED.generateDeadlines(triggerDate, priorityDate || null, jurisdiction);
    case 'FER_OA_ISSUED':
      return STATUTORY_RULES.FER_OA_ISSUED.generateDeadlines(triggerDate, jurisdiction);
    case 'HEARING_SCHEDULED':
      return STATUTORY_RULES.HEARING_SCHEDULED.generateDeadlines(triggerDate, jurisdiction);
    case 'NOTICE_OF_ALLOWANCE':
      return STATUTORY_RULES.NOTICE_OF_ALLOWANCE.generateDeadlines(triggerDate, jurisdiction);
    case 'PATENT_GRANTED':
      return STATUTORY_RULES.PATENT_GRANTED.generateDeadlines(triggerDate, priorityDate || triggerDate, jurisdiction);
    default:
      return [];
  }
}

export function generateDeadlinesForStage(
  stageId: string,
  triggerDate: string,
  priorityDate: string | null = null,
  jurisdiction: Jurisdiction = 'IN'
): GeneratedDeadline[] {
  switch (stageId) {
    case 'PROVISIONAL':
      return STATUTORY_RULES.PROVISIONAL_FILED.generateDeadlines(triggerDate, jurisdiction);
    case 'COMPLETE':
      return STATUTORY_RULES.COMPLETE_FILED.generateDeadlines(triggerDate, priorityDate, jurisdiction);
    case 'EXAMINATION_FER':
      return STATUTORY_RULES.FER_OA_ISSUED.generateDeadlines(triggerDate, jurisdiction);
    case 'HEARING':
      return STATUTORY_RULES.HEARING_SCHEDULED.generateDeadlines(triggerDate, jurisdiction);
    case 'ALLOWANCE_GRANT':
      return STATUTORY_RULES.NOTICE_OF_ALLOWANCE.generateDeadlines(triggerDate, jurisdiction);
    case 'ANNUITY_MAINTENANCE':
      return STATUTORY_RULES.PATENT_GRANTED.generateDeadlines(triggerDate, priorityDate || triggerDate, jurisdiction);
    default:
      return [];
  }
}

export function getTriggerEventForStage(stageId: string): TriggerEvent | null {
  const map: Record<string, TriggerEvent> = {
    PROVISIONAL: 'PROVISIONAL_FILED',
    COMPLETE: 'COMPLETE_FILED',
    EXAMINATION_FER: 'FER_OA_ISSUED',
    HEARING: 'HEARING_SCHEDULED',
    ALLOWANCE_GRANT: 'NOTICE_OF_ALLOWANCE',
    ANNUITY_MAINTENANCE: 'PATENT_GRANTED',
  };
  return map[stageId] || null;
}
