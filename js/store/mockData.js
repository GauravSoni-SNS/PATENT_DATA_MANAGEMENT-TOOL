/**
 * LexPatent Store - Mock Data Store
 * Realistic patent prosecution matters, statutory deadlines, official receipts, and audit history.
 */

const CURRENT_SIMULATED_DATE = "2026-08-18";

const ATTORNEYS = [
  {
    id: "usr-01",
    name: "Sarah Jenkins, Esq.",
    role: "Senior Patent Attorney",
    email: "s.jenkins@lexpatent-ip.com",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    specialization: "AI, Cryptography & Computer Systems"
  },
  {
    id: "usr-02",
    name: "David K. Chen, Ph.D., Reg. Patent Agent",
    role: "Lead Patent Agent",
    email: "d.chen@lexpatent-ip.com",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80",
    specialization: "Materials Science, Solid-State Chemistry & Batteries"
  },
  {
    id: "usr-03",
    name: "Priya Nair, LL.M.",
    role: "Patent Associate & Docket Specialist",
    email: "p.nair@lexpatent-ip.com",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    specialization: "Aerospace, Robotics & Autonomous Systems"
  },
  {
    id: "usr-04",
    name: "Marcus Vance, Esq.",
    role: "Managing IP Partner",
    email: "m.vance@lexpatent-ip.com",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    specialization: "IP Litigation, Global Portfolio Prosecution"
  }
];

const INITIAL_MATTERS = [
  {
    id: "mat-101",
    matterNumber: "IN-2025-PAT-00941",
    title: "Quantum-Resistant Lattice Cryptography for Decentralized Blockchains",
    jurisdiction: "IN",
    client: {
      name: "Synapse Quantum Labs Inc.",
      code: "SYN-Q",
      contactEmail: "ip-legal@synapsequantum.io",
      contactPerson: "Dr. Elena Rostova"
    },
    applicationType: "Provisional Application",
    officialAppNumber: "202511048291",
    priorityDate: "2025-09-02",
    filingDate: "2025-09-02",
    currentStage: "PROVISIONAL",
    leadAttorneyId: "usr-01",
    supervisingPartnerId: "usr-04",
    status: "ACTION_REQUIRED",
    abstract: "A high-performance post-quantum cryptographic accelerator implementing Module-LWE lattice key exchange for micro-transaction verification across distributed ledgers.",
    deadlines: [
      {
        id: "ddl-101-1",
        ruleId: "CONVENTION_12M_BAR",
        title: "12-Month Priority Bar (Complete / PCT Filing)",
        description: "Statutory deadline to file Complete Specification or PCT International Application claiming priority. Missing this date results in irrevocable loss of priority rights.",
        statutoryDueDate: "2026-09-02",
        isStatutoryBar: true,
        isExtendable: false,
        status: "PENDING",
        requiredReceiptType: "COMPLETE_FILING_CBR",
        statutorySection: "Section 9(1), Patents Act 1970",
        notes: "Draft complete specification is 85% ready. Client review meeting held on Aug 12."
      }
    ],
    receipts: [
      {
        id: "rcpt-101-prov",
        receiptType: "PROVISIONAL_FILING_CBR",
        receiptTitle: "Provisional Filing CBR & Official Acknowledgment",
        cbrNumber: "CBR-2025-992140",
        officialTimestamp: "2025-09-02 11:42:15 IST",
        officialFees: 8000,
        currency: "INR",
        documentUrl: "receipt_provisional_202511048291.pdf",
        uploadedBy: "usr-03",
        verifiedBy: "usr-01",
        verifiedAt: "2025-09-02 14:00:00"
      }
    ],
    history: [
      { date: "2025-09-02", event: "Provisional application filed. CBR generated.", user: "Priya Nair" },
      { date: "2026-07-20", event: "Automated 45-day advisory alert dispatched.", user: "System" },
      { date: "2026-08-03", event: "30-Day Amber Escalation email sent to lead attorney.", user: "System" },
      { date: "2026-08-18", event: "15-Day Orange Warning sent to lead attorney and partner.", user: "System" }
    ]
  },
  {
    id: "mat-102",
    matterNumber: "IN-2024-PAT-00412",
    title: "Solid-State Lithium-Sulfur Battery with Polymer Nanocomposite Electrolyte",
    jurisdiction: "IN",
    client: {
      name: "Aurelia Energy Technologies",
      code: "AUR-EN",
      contactEmail: "patents@aureliaenergy.com",
      contactPerson: "Vikram Malhotra"
    },
    applicationType: "Ordinary Complete Application",
    officialAppNumber: "202411032194",
    priorityDate: "2024-02-23",
    filingDate: "2024-02-23",
    currentStage: "EXAMINATION_FER",
    leadAttorneyId: "usr-02",
    supervisingPartnerId: "usr-04",
    status: "CRITICAL_ACTION",
    abstract: "Solid-state electrolyte formulation comprising a cross-linked polyethylene oxide matrix doped with fluorinated lithium salt and functionalized halloysite nanotubes.",
    deadlines: [
      {
        id: "ddl-102-1",
        ruleId: "FER_RESPONSE_DUE",
        title: "First Examination Report (FER) Written Response",
        description: "Statutory response to Examiner objections regarding inventive step (Section 2(1)(ja)) and Section 3(d) efficacy. Due within 6 months of FER issue.",
        statutoryDueDate: "2026-08-23",
        isStatutoryBar: true,
        isExtendable: true,
        maxExtensionMonths: 3,
        extendedDueDate: "2026-11-23",
        status: "PENDING",
        requiredReceiptType: "FER_RESPONSE_CBR",
        statutorySection: "Section 21(1), Rule 24B(5)",
        notes: "Amended claims 1-14 finalized. Comparative experimental data attached. Ready for e-filing."
      }
    ],
    receipts: [
      {
        id: "rcpt-102-filing",
        receiptType: "COMPLETE_FILING_CBR",
        receiptTitle: "Complete Filing Official Receipt (Form 1, 2, 3, 5)",
        cbrNumber: "CBR-2024-331092",
        officialTimestamp: "2024-02-23 16:15:30 IST",
        officialFees: 24000,
        currency: "INR",
        documentUrl: "receipt_complete_202411032194.pdf",
        uploadedBy: "usr-03",
        verifiedBy: "usr-02",
        verifiedAt: "2024-02-24 09:30:00"
      },
      {
        id: "rcpt-102-fer",
        receiptType: "FER_OFFICE_ACTION_PDF",
        receiptTitle: "Official First Examination Report Issued by IPO",
        cbrNumber: "FER-IPO-DEL-2026-089",
        officialTimestamp: "2026-02-23 10:00:00 IST",
        officialFees: 0,
        currency: "INR",
        documentUrl: "fer_report_202411032194.pdf",
        uploadedBy: "usr-03",
        verifiedBy: "usr-02",
        verifiedAt: "2026-02-24 11:00:00"
      }
    ],
    history: [
      { date: "2024-02-23", event: "Complete application filed with IPO.", user: "Priya Nair" },
      { date: "2026-02-23", event: "FER received from Patent Office Delhi.", user: "System" },
      { date: "2026-07-23", event: "30-Day Amber Reminder sent to David Chen.", user: "System" },
      { date: "2026-08-08", event: "15-Day Orange Warning escalated to partner Marcus Vance.", user: "System" },
      { date: "2026-08-18", event: "5-DAY CRITICAL RED ALERT triggered across firm.", user: "System" }
    ]
  },
  {
    id: "mat-103",
    matterNumber: "EP-2319082.4",
    title: "Autonomous Multi-Spectral Collision Avoidance for Urban eVTOL Aircraft",
    jurisdiction: "EP",
    client: {
      name: "SkyVector Aerospace AG",
      code: "SKY-VEC",
      contactEmail: "legal-docket@skyvector.aero",
      contactPerson: "Dr. Johannes Weiss"
    },
    applicationType: "European Patent Application",
    officialAppNumber: "EP25701892.1",
    priorityDate: "2025-08-20",
    filingDate: "2025-08-20",
    currentStage: "PROVISIONAL",
    leadAttorneyId: "usr-03",
    supervisingPartnerId: "usr-04",
    status: "DAILY_COUNTDOWN",
    abstract: "Computer vision and LiDAR sensor fusion pipeline executing obstacle trajectories prediction in GPS-denied urban canyons for electric vertical takeoff craft.",
    deadlines: [
      {
        id: "ddl-103-1",
        ruleId: "CONVENTION_12M_BAR",
        title: "12-Month Priority Bar (EPO Complete / PCT Filing)",
        description: "CRITICAL STATUTORY BAR: 12 months to file complete EP specification claiming priority under Art. 87 EPC. Only 2 days remaining.",
        statutoryDueDate: "2026-08-20",
        isStatutoryBar: true,
        isExtendable: false,
        status: "PENDING",
        requiredReceiptType: "EPO_ONLINE_FILING_ACK",
        statutorySection: "Art. 87 EPC / Paris Convention",
        notes: "URGENT: Final EPO Form 1001 and claims translated into German/English. Filing fee payment ready on epoline account."
      }
    ],
    receipts: [
      {
        id: "rcpt-103-prov",
        receiptType: "PRIORITY_DOC_RECEIPT",
        receiptTitle: "EP Priority Document Official Acknowledgment",
        cbrNumber: "EPO-ACK-2025-88192",
        officialTimestamp: "2025-08-20 15:20:00 CET",
        officialFees: 1450,
        currency: "EUR",
        documentUrl: "ep_priority_ack_25701892.pdf",
        uploadedBy: "usr-03",
        verifiedBy: "usr-04",
        verifiedAt: "2025-08-21 09:00:00"
      }
    ],
    history: [
      { date: "2025-08-20", event: "Priority application filed at Munich.", user: "Priya Nair" },
      { date: "2026-07-20", event: "30-Day Reminder email sent.", user: "System" },
      { date: "2026-08-05", event: "15-Day Urgent Escalation sent.", user: "System" },
      { date: "2026-08-15", event: "5-Day Red Alert sent.", user: "System" },
      { date: "2026-08-18", event: "DAILY T-2 EMERGENCY COUNTDOWN ACTIVE.", user: "System" }
    ]
  },
  {
    id: "mat-104",
    matterNumber: "US-18/902,414",
    title: "Targeted Lipid Nanoparticle Delivery for mRNA Cancer Therapeutics",
    jurisdiction: "US",
    client: {
      name: "GeneVanguard Therapeutics LLC",
      code: "GENE-V",
      contactEmail: "ip@genevanguard.com",
      contactPerson: "Dr. Arthur Campbell"
    },
    applicationType: "US Non-Provisional (Utility)",
    officialAppNumber: "18/902,414",
    priorityDate: "2024-03-10",
    filingDate: "2024-03-10",
    currentStage: "HEARING",
    leadAttorneyId: "usr-01",
    supervisingPartnerId: "usr-04",
    status: "ACTION_REQUIRED",
    abstract: "Ionizable cationic lipids with heterocyclic headgroups configured for selective mRNA delivery into tumor-infiltrating lymphocytes with minimal hepatic accumulation.",
    deadlines: [
      {
        id: "ddl-104-1",
        ruleId: "HEARING_WRITTEN_SUBMISSION",
        title: "Post-Examiner Interview Written Summary & 1.111 Response",
        description: "Official summary of examiner interview held on Aug 16, 2026, accompanied by claim amendments to overcome 35 U.S.C. 103 rejection.",
        statutoryDueDate: "2026-08-31",
        isStatutoryBar: true,
        isExtendable: false,
        status: "PENDING",
        requiredReceiptType: "USPTO_EFS_ACK",
        statutorySection: "37 CFR 1.133(b) & MPEP 713.04",
        notes: "Examiner indicated Claim 7 allowable if combined with Claim 1. Drafting amendment."
      }
    ],
    receipts: [
      {
        id: "rcpt-104-efs",
        receiptType: "USPTO_EFS_ACK",
        receiptTitle: "USPTO Patent Center Electronic Filing Receipt",
        cbrNumber: "EFS-ACK-2024-99812",
        officialTimestamp: "2024-03-10 17:45:10 EST",
        officialFees: 1820,
        currency: "USD",
        documentUrl: "uspto_ack_18902414.pdf",
        uploadedBy: "usr-01",
        verifiedBy: "usr-04",
        verifiedAt: "2024-03-11 10:00:00"
      }
    ],
    history: [
      { date: "2024-03-10", event: "US Non-provisional utility filed via Patent Center.", user: "Sarah Jenkins" },
      { date: "2026-08-16", event: "Telephonic Examiner Interview conducted.", user: "Sarah Jenkins" },
      { date: "2026-08-17", event: "Post-interview 15-day statutory clock logged in docket.", user: "Priya Nair" }
    ]
  },
  {
    id: "mat-105",
    matterNumber: "IN-2023-PAT-00108",
    title: "AI-Assisted Microfluidic Diagnostics for Rapid Pathogen Sequencing",
    jurisdiction: "IN",
    client: {
      name: "BioNova Diagnostic Systems",
      code: "BIONOVA",
      contactEmail: "legal@bionovadiag.in",
      contactPerson: "Sunita Deshmukh"
    },
    applicationType: "PCT National Phase in India",
    officialAppNumber: "202317029811",
    priorityDate: "2022-04-14",
    filingDate: "2023-10-14",
    currentStage: "ALLOWANCE_GRANT",
    leadAttorneyId: "usr-02",
    supervisingPartnerId: "usr-04",
    status: "UPCOMING",
    abstract: "Micro-channel droplet generator coupled with real-time deep learning optical sensor for point-of-care viral load quantification.",
    deadlines: [
      {
        id: "ddl-105-1",
        ruleId: "GRANT_ISSUE_FEE",
        title: "Intention to Grant / Final Sealing Fee Payment",
        description: "Official statutory payment to seal patent and issue Letters Patent Certificate.",
        statutoryDueDate: "2026-09-15",
        isStatutoryBar: true,
        isExtendable: false,
        status: "PENDING",
        requiredReceiptType: "ISSUE_FEE_RECEIPT",
        statutorySection: "Rule 24B & Section 43",
        notes: "Intention to Grant order received on June 15, 2026. Client invoice approved."
      }
    ],
    receipts: [
      {
        id: "rcpt-105-grant-notice",
        receiptType: "INTENTION_TO_GRANT_ORDER",
        receiptTitle: "Controller Order for Grant of Patent",
        cbrNumber: "IPO-DEL-GRANT-2026-442",
        officialTimestamp: "2026-06-15 14:30:00 IST",
        officialFees: 0,
        currency: "INR",
        documentUrl: "grant_order_202317029811.pdf",
        uploadedBy: "usr-03",
        verifiedBy: "usr-02",
        verifiedAt: "2026-06-16 11:20:00"
      }
    ],
    history: [
      { date: "2023-10-14", event: "National Phase entered in India.", user: "David Chen" },
      { date: "2026-06-15", event: "Intention to Grant order received from IPO.", user: "System" },
      { date: "2026-08-16", event: "30-Day reminder email sent for sealing fee.", user: "System" }
    ]
  },
  {
    id: "mat-106",
    matterNumber: "IN-2022-PAT-00087",
    title: "High-Throughput Photonic Interconnects for Neural Accelerators",
    jurisdiction: "IN",
    client: {
      name: "OptiCore Photonics Corp.",
      code: "OPTICORE",
      contactEmail: "legal@opticore.com",
      contactPerson: "Dr. Arvind Rao"
    },
    applicationType: "Ordinary Complete Application",
    officialAppNumber: "202211019842",
    priorityDate: "2022-01-15",
    filingDate: "2022-01-15",
    currentStage: "ANNUITY_MAINTENANCE",
    leadAttorneyId: "usr-01",
    supervisingPartnerId: "usr-04",
    status: "COMPLETED",
    abstract: "Silicon photonic interconnect network with integrated ring resonator modulators for ultra-low latency tensor computing clusters.",
    deadlines: [
      {
        id: "ddl-106-1",
        ruleId: "ANNUITY_YEAR_5",
        title: "Year 5 Patent Renewal Annuity Fee",
        description: "Official renewal fee to maintain granted Patent IN 489201 in force.",
        statutoryDueDate: "2027-01-15",
        isStatutoryBar: true,
        isExtendable: true,
        gracePeriodDueDate: "2027-07-15",
        status: "PENDING",
        requiredReceiptType: "ANNUITY_RECEIPT",
        statutorySection: "Section 142, Patents Act 1970",
        notes: "Safe: Due in Jan 2027. Routine monitoring active."
      }
    ],
    receipts: [
      {
        id: "rcpt-106-grant-cert",
        receiptType: "OFFICIAL_GRANT_CERTIFICATE",
        receiptTitle: "Official Patent Certificate (Patent No. IN 489201)",
        cbrNumber: "CERT-IN-489201",
        officialTimestamp: "2025-11-12 10:00:00 IST",
        officialFees: 12000,
        currency: "INR",
        documentUrl: "patent_certificate_in489201.pdf",
        uploadedBy: "usr-03",
        verifiedBy: "usr-04",
        verifiedAt: "2025-11-13 16:45:00"
      }
    ],
    history: [
      { date: "2022-01-15", event: "Application filed.", user: "Sarah Jenkins" },
      { date: "2025-11-12", event: "Patent Granted! Patent No. IN 489201.", user: "Controller of Patents" },
      { date: "2025-11-13", event: "Grant certificate uploaded and dual-verified.", user: "Marcus Vance" }
    ]
  }
];

window.CURRENT_SIMULATED_DATE = CURRENT_SIMULATED_DATE;
window.ATTORNEYS = ATTORNEYS;
window.INITIAL_MATTERS = INITIAL_MATTERS;
