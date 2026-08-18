/**
 * LexPatent Rules Engine - Statutory Patent Deadline Calculator
 * Computes official statutory bars, non-extendable deadlines, and extendable windows
 * across major jurisdictions: India (IPO), US (USPTO), Europe (EPO), and PCT (WIPO).
 */

const JURISDICTIONS = {
  IN: {
    name: "India (IPO)",
    flag: "🇮🇳",
    patentActRef: "Indian Patents Act 1970 & Rules 2003",
    currency: "INR (₹)"
  },
  US: {
    name: "United States (USPTO)",
    flag: "🇺🇸",
    patentActRef: "35 U.S.C. & 37 CFR",
    currency: "USD ($)"
  },
  EP: {
    name: "European Patent Office (EPO)",
    flag: "🇪🇺",
    patentActRef: "European Patent Convention (EPC)",
    currency: "EUR (€)"
  },
  WO: {
    name: "WIPO / PCT International",
    flag: "🌐",
    patentActRef: "Patent Cooperation Treaty (PCT)",
    currency: "CHF / USD"
  }
};

const STAGES = {
  INTAKE: {
    id: "INTAKE",
    label: "Client Intake & Prior Art Search",
    order: 1,
    description: "IDF review, novelty search report, patentability assessment, and engagement."
  },
  PROVISIONAL: {
    id: "PROVISIONAL",
    label: "Provisional Application",
    order: 2,
    description: "Establishes earliest priority date; triggers strict 12-month convention bar."
  },
  COMPLETE: {
    id: "COMPLETE",
    label: "Complete / Non-Provisional / PCT",
    order: 3,
    description: "Full specification with claims, drawings, abstract, and official filing receipt."
  },
  PUBLICATION_RFE: {
    id: "PUBLICATION_RFE",
    label: "Publication & Examination Request",
    order: 4,
    description: "18-month official gazette publication and statutory Request for Examination (RFE)."
  },
  EXAMINATION_FER: {
    id: "EXAMINATION_FER",
    label: "Office Action / FER Examination",
    order: 5,
    description: "First Examination Report response drafting, claim amendments, and official submission."
  },
  HEARING: {
    id: "HEARING",
    label: "Oral Hearing & Submissions",
    order: 6,
    description: "Attending official hearing and submitting post-hearing written arguments within 15 days."
  },
  ALLOWANCE_GRANT: {
    id: "ALLOWANCE_GRANT",
    label: "Notice of Allowance & Grant",
    order: 7,
    description: "Sealing/Grant fee payment, official Letters Patent issue, and patent number recording."
  },
  ANNUITY_MAINTENANCE: {
    id: "ANNUITY_MAINTENANCE",
    label: "Post-Grant Annuities & Maintenance",
    order: 8,
    description: "Annual/Periodic renewal fees and commercial working statements (Form 27 in India)."
  }
};

// Date manipulation helpers
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function addYears(dateStr, years) {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

/**
 * Statutory Rules Definitions by Stage
 */
const STATUTORY_RULES = {
  // Triggered upon Provisional Filing
  PROVISIONAL_FILED: {
    stage: "PROVISIONAL",
    generateDeadlines: (filingDate, jurisdiction = "IN") => [
      {
        ruleId: "CONVENTION_12M_BAR",
        title: "12-Month Priority Bar (Complete / PCT Filing)",
        description: "Statutory deadline to file Complete Specification or PCT International Application claiming priority of the provisional application.",
        statutoryDueDate: addMonths(filingDate, 12),
        isStatutoryBar: true,
        isExtendable: false,
        extensionRules: null,
        requiredReceiptType: "COMPLETE_FILING_CBR",
        statutorySection: jurisdiction === "IN" ? "Section 9(1), Patents Act 1970" : "35 U.S.C. 119(e) / Paris Convention Art. 4"
      },
      {
        ruleId: "PCT_30_31M_NATIONAL_PHASE",
        title: "PCT National Phase Entry Window (30/31 Months)",
        description: "Statutory window to enter national phase in designated foreign patent offices based on priority date.",
        statutoryDueDate: addMonths(filingDate, 31),
        isStatutoryBar: true,
        isExtendable: false,
        extensionRules: null,
        requiredReceiptType: "PCT_NATIONAL_RECEIPT",
        statutorySection: "PCT Articles 22 & 39"
      }
    ]
  },

  // Triggered upon Complete / Non-Provisional Filing
  COMPLETE_FILED: {
    stage: "COMPLETE",
    generateDeadlines: (filingDate, priorityDate = null, jurisdiction = "IN") => {
      const baseDate = priorityDate || filingDate;
      const deadlines = [
        {
          ruleId: "PUBLICATION_18M",
          title: "18-Month Statutory Publication",
          description: "Official publication of application in Patent Office Journal / Gazette.",
          statutoryDueDate: addMonths(baseDate, 18),
          isStatutoryBar: false,
          isExtendable: false,
          statutorySection: jurisdiction === "IN" ? "Section 11A, Rule 24" : "35 U.S.C. 122(b)"
        }
      ];

      if (jurisdiction === "IN") {
        deadlines.push({
          ruleId: "RFE_DEADLINE_IN",
          title: "Request for Examination (Form 18/18A)",
          description: "Mandatory statutory deadline to file Form 18 (RFE). Failure to file results in deemed abandonment.",
          statutoryDueDate: addMonths(baseDate, 48), // Note: Rule amendment updated to 31m for new filings, configurable
          isStatutoryBar: true,
          isExtendable: false,
          requiredReceiptType: "FORM_18_RECEIPT",
          statutorySection: "Section 11B, Rule 24B"
        });
      }
      return deadlines;
    }
  },

  // Triggered when First Examination Report (FER) or Office Action is received
  FER_OA_ISSUED: {
    stage: "EXAMINATION_FER",
    generateDeadlines: (ferIssueDate, jurisdiction = "IN") => {
      const isIndia = jurisdiction === "IN";
      const isUS = jurisdiction === "US";
      
      const primaryMonths = isIndia ? 6 : (isUS ? 3 : 4);
      const statutoryDueDate = addMonths(ferIssueDate, primaryMonths);
      
      return [
        {
          ruleId: "FER_RESPONSE_DUE",
          title: isIndia ? "First Examination Report (FER) Written Response" : "Office Action (Non-Final Rejection) Response",
          description: `Statutory time period to submit written response, claim amendments, and supporting evidence.`,
          statutoryDueDate: statutoryDueDate,
          isStatutoryBar: true,
          isExtendable: true,
          maxExtensionMonths: isIndia ? 3 : 3,
          extensionProcedure: isIndia 
            ? "File Form 4 with official fee of ₹4,000 / ₹20,000 before expiry of initial 6 months."
            : "File 37 CFR 1.136(a) extension petition with extension fee at time of filing response.",
          extendedDueDate: addMonths(statutoryDueDate, 3),
          requiredReceiptType: "FER_RESPONSE_CBR",
          statutorySection: isIndia ? "Section 21(1), Rule 24B(5)" : "37 CFR 1.134 & 1.136"
        }
      ];
    }
  },

  // Triggered when an Official Hearing Notice is issued
  HEARING_SCHEDULED: {
    stage: "HEARING",
    generateDeadlines: (hearingDate, jurisdiction = "IN") => [
      {
        ruleId: "HEARING_WRITTEN_SUBMISSION",
        title: "Post-Hearing Written Submissions & Revised Claims",
        description: "Strict statutory deadline following oral hearing to submit comprehensive written arguments and finalized claims.",
        statutoryDueDate: addDays(hearingDate, 15),
        isStatutoryBar: true,
        isExtendable: false,
        requiredReceiptType: "HEARING_SUBMISSION_CBR",
        statutorySection: jurisdiction === "IN" ? "Rule 28(7), Patent Rules 2003" : "MPEP 713"
      }
    ]
  },

  // Triggered when Notice of Allowance / Intention to Grant is issued
  NOTICE_OF_ALLOWANCE: {
    stage: "ALLOWANCE_GRANT",
    generateDeadlines: (allowanceDate, jurisdiction = "IN") => [
      {
        ruleId: "GRANT_ISSUE_FEE",
        title: "Grant Fee / Issue Fee & Printing Payment",
        description: "Statutory payment required to seal Letters Patent and publish final grant.",
        statutoryDueDate: addMonths(allowanceDate, 3),
        isStatutoryBar: true,
        isExtendable: false,
        requiredReceiptType: "ISSUE_FEE_RECEIPT",
        statutorySection: jurisdiction === "US" ? "37 CFR 1.311" : "Rule 24B / Rule 28"
      }
    ]
  },

  // Post-Grant Annuities & Working Statements
  PATENT_GRANTED: {
    stage: "ANNUITY_MAINTENANCE",
    generateDeadlines: (grantDate, filingDate, jurisdiction = "IN") => {
      const deadlines = [];
      // Annuity Year 3 from filing date
      const renewalYear3 = addYears(filingDate, 3);
      deadlines.push({
        ruleId: "ANNUITY_YEAR_3",
        title: "Year 3 Patent Annuity Renewal Fee",
        description: "Official renewal fee to keep the patent in force. Surcharge applies during 6-month grace period.",
        statutoryDueDate: renewalYear3,
        isStatutoryBar: true,
        isExtendable: true,
        gracePeriodDueDate: addMonths(renewalYear3, 6),
        requiredReceiptType: "ANNUITY_RECEIPT",
        statutorySection: jurisdiction === "IN" ? "Section 142, Rule 80" : "35 U.S.C. 41(b)"
      });

      if (jurisdiction === "IN") {
        deadlines.push({
          ruleId: "FORM_27_WORKING_STATEMENT",
          title: "Form 27 Statement of Commercial Working",
          description: "Periodic mandatory declaration regarding commercial working of patented invention in India.",
          statutoryDueDate: `${new Date().getFullYear()}-09-30`,
          isStatutoryBar: true,
          isExtendable: false,
          requiredReceiptType: "FORM_27_RECEIPT",
          statutorySection: "Section 146(2), Rule 131"
        });
      }
      return deadlines;
    }
  }
};

window.JURISDICTIONS = JURISDICTIONS;
window.STAGES = STAGES;
window.STATUTORY_RULES = STATUTORY_RULES;
window.DateHelpers = { addDays, addMonths, addYears };
