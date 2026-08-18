/**
 * LexPatent Notification & Escalation Service
 * Automated zero-fail tiered notification engine (-30d, -15d, -5d, Daily Countdown)
 * Generates audit logs and rich email notification previews.
 */

class NotificationService {
  constructor() {
    this.notificationLogs = [];
    this.initializeDefaultLogs();
  }

  initializeDefaultLogs() {
    this.notificationLogs = [
      {
        id: "notif-001",
        timestamp: "2026-08-18 08:00:12 IST",
        tier: "DAILY_COUNTDOWN",
        tierLabel: "T-2 DAILY COUNTDOWN (CRITICAL BLITZ)",
        matterNumber: "EP-2319082.4",
        matterTitle: "Autonomous Multi-Spectral Collision Avoidance for Urban eVTOL Aircraft",
        statutoryDueDate: "2026-08-20",
        daysRemaining: 2,
        recipients: [
          { name: "Priya Nair, LL.M.", email: "p.nair@lexpatent-ip.com", role: "Assigned Attorney" },
          { name: "Marcus Vance, Esq.", email: "m.vance@lexpatent-ip.com", role: "Managing Partner" },
          { name: "Docket Risk Committee", email: "ip-risk@lexpatent-ip.com", role: "Safety Oversight" }
        ],
        subject: "🔥 [T-2 DAYS REMAINING] EMERGENCY DOCKET ALERT: EP-2319082.4 - 12-Month Priority Bar",
        status: "DELIVERED",
        isEmergency: true
      },
      {
        id: "notif-002",
        timestamp: "2026-08-18 08:00:15 IST",
        tier: "T_5_CRITICAL",
        tierLabel: "5-DAY RED CRITICAL ALERT",
        matterNumber: "IN-2024-PAT-00412",
        matterTitle: "Solid-State Lithium-Sulfur Battery with Polymer Nanocomposite Electrolyte",
        statutoryDueDate: "2026-08-23",
        daysRemaining: 5,
        recipients: [
          { name: "David K. Chen, Ph.D.", email: "d.chen@lexpatent-ip.com", role: "Lead Patent Agent" },
          { name: "Marcus Vance, Esq.", email: "m.vance@lexpatent-ip.com", role: "Managing Partner" },
          { name: "Vikram Malhotra", email: "patents@aureliaenergy.com", role: "Client Legal Contact" }
        ],
        subject: "🚨 [5-DAY CRITICAL ALERT] Approaching Statutory Bar: IN-2024-PAT-00412 (FER Response)",
        status: "DELIVERED",
        isEmergency: true
      },
      {
        id: "notif-003",
        timestamp: "2026-08-18 08:00:18 IST",
        tier: "T_15_URGENT",
        tierLabel: "15-DAY ORANGE WARNING",
        matterNumber: "IN-2025-PAT-00941",
        matterTitle: "Quantum-Resistant Lattice Cryptography for Decentralized Blockchains",
        statutoryDueDate: "2026-09-02",
        daysRemaining: 15,
        recipients: [
          { name: "Sarah Jenkins, Esq.", email: "s.jenkins@lexpatent-ip.com", role: "Lead Attorney" },
          { name: "Marcus Vance, Esq.", email: "m.vance@lexpatent-ip.com", role: "Supervising Partner" }
        ],
        subject: "⚠️ [15-Day URGENT] Action Required: IN-2025-PAT-00941 - Complete / PCT Priority Filing",
        status: "DELIVERED",
        isEmergency: false
      },
      {
        id: "notif-004",
        timestamp: "2026-08-16 08:00:00 IST",
        tier: "T_30_ADVISORY",
        tierLabel: "30-DAY AMBER ADVISORY",
        matterNumber: "IN-2023-PAT-00108",
        matterTitle: "AI-Assisted Microfluidic Diagnostics for Rapid Pathogen Sequencing",
        statutoryDueDate: "2026-09-15",
        daysRemaining: 30,
        recipients: [
          { name: "David K. Chen, Ph.D.", email: "d.chen@lexpatent-ip.com", role: "Lead Patent Agent" }
        ],
        subject: "📋 [30-Day Reminder] Patent Deadline: IN-2023-PAT-00108 - Issue Fee Sealing Payment",
        status: "DELIVERED",
        isEmergency: false
      }
    ];
  }

  /**
   * Scans all active matters and evaluates if notifications need to be triggered
   */
  evaluateAllMatters(matters) {
    const notificationsGenerated = [];
    const simulatedDate = window.deadlineService.getSimulatedDate();

    matters.forEach(rawMatter => {
      const matter = window.deadlineService.enrichMatter(rawMatter);
      if (!matter.nearestDeadline) return;

      const days = matter.daysRemaining;
      const deadline = matter.nearestDeadline;
      const attorney = window.ATTORNEYS.find(a => a.id === matter.leadAttorneyId) || window.ATTORNEYS[0];
      const partner = window.ATTORNEYS.find(a => a.id === matter.supervisingPartnerId) || window.ATTORNEYS[3];

      let tier = null;
      let tierLabel = "";
      let isEmergency = false;
      let recipients = [];

      if (days <= 0) {
        tier = "OVERDUE";
        tierLabel = "CRITICAL: STATUTORY DEADLINE LAPSED";
        isEmergency = true;
        recipients = [
          { name: attorney.name, email: attorney.email, role: "Lead Attorney" },
          { name: partner.name, email: partner.email, role: "Supervising Partner" },
          { name: "Malpractice Risk Committee", email: "risk@lexpatent-ip.com", role: "General Counsel" }
        ];
      } else if (days <= 4) {
        tier = "DAILY_COUNTDOWN";
        tierLabel = `T-${days} DAILY COUNTDOWN (CRITICAL BLITZ)`;
        isEmergency = true;
        recipients = [
          { name: attorney.name, email: attorney.email, role: "Lead Attorney" },
          { name: partner.name, email: partner.email, role: "Supervising Partner" },
          { name: "Docket Risk Committee", email: "ip-risk@lexpatent-ip.com", role: "Safety Oversight" }
        ];
      } else if (days <= 5) {
        tier = "T_5_CRITICAL";
        tierLabel = "5-DAY RED CRITICAL ALERT";
        isEmergency = true;
        recipients = [
          { name: attorney.name, email: attorney.email, role: "Lead Attorney" },
          { name: partner.name, email: partner.email, role: "Supervising Partner" },
          { name: matter.client.contactPerson, email: matter.client.contactEmail, role: "Client Legal Contact" }
        ];
      } else if (days <= 15) {
        tier = "T_15_URGENT";
        tierLabel = "15-DAY ORANGE WARNING";
        isEmergency = false;
        recipients = [
          { name: attorney.name, email: attorney.email, role: "Lead Attorney" },
          { name: partner.name, email: partner.email, role: "Supervising Partner" }
        ];
      } else if (days <= 30) {
        tier = "T_30_ADVISORY";
        tierLabel = "30-DAY AMBER ADVISORY";
        isEmergency = false;
        recipients = [
          { name: attorney.name, email: attorney.email, role: "Lead Attorney" }
        ];
      }

      if (tier) {
        const notif = {
          id: "notif-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
          timestamp: `${simulatedDate} 08:00:00 IST`,
          tier: tier,
          tierLabel: tierLabel,
          matterNumber: matter.matterNumber,
          matterTitle: matter.title,
          deadlineTitle: deadline.title,
          statutoryDueDate: deadline.statutoryDueDate,
          statutorySection: deadline.statutorySection,
          daysRemaining: days,
          recipients: recipients,
          subject: this.generateEmailSubject(tier, days, matter.matterNumber, deadline.title),
          status: "DELIVERED",
          isEmergency: isEmergency,
          matterData: matter,
          deadlineData: deadline
        };
        notificationsGenerated.push(notif);
      }
    });

    return notificationsGenerated;
  }

  generateEmailSubject(tier, days, matterNumber, deadlineTitle) {
    if (tier === "DAILY_COUNTDOWN") {
      return `🔥 [T-${days} DAYS REMAINING] EMERGENCY DOCKET ALERT: ${matterNumber} - ${deadlineTitle}`;
    }
    if (tier === "T_5_CRITICAL") {
      return `🚨 [5-DAY CRITICAL ALERT] Approaching Statutory Bar: ${matterNumber} - ${deadlineTitle}`;
    }
    if (tier === "T_15_URGENT") {
      return `⚠️ [15-Day URGENT] Action Required: ${matterNumber} - ${deadlineTitle}`;
    }
    if (tier === "T_30_ADVISORY") {
      return `📋 [30-Day Reminder] Patent Deadline: ${matterNumber} - ${deadlineTitle}`;
    }
    return `⚠️ [Docket Alert] ${matterNumber} - ${deadlineTitle}`;
  }

  /**
   * Generates rich HTML preview of the email notification
   */
  generateEmailHtml(notif) {
    const isEmergency = notif.isEmergency;
    const headerBg = isEmergency ? "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)" : "linear-gradient(135deg, #1e293b 0%, #334155 100%)";
    const headerColor = "#ffffff";
    const badgeColor = notif.tier === "DAILY_COUNTDOWN" ? "#ef4444" : (notif.tier === "T_5_CRITICAL" ? "#f87171" : "#f59e0b");

    const recipientsHtml = notif.recipients.map(r => `
      <div style="font-size: 13px; color: #475569; margin-bottom: 2px;">
        <strong>${r.role}:</strong> ${r.name} &lt;<code>${r.email}</code>&gt;
      </div>
    `).join("");

    return `
      <div style="font-family: 'Segoe UI', Inter, -apple-system, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
        <!-- Email Header -->
        <div style="background: ${headerBg}; padding: 24px 28px; color: ${headerColor};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">⚖️</span>
              <span style="font-weight: 700; font-size: 16px; letter-spacing: 0.5px; text-transform: uppercase;">LexPatent Automated Docket Radar</span>
            </div>
            <span style="background: ${badgeColor}; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px;">
              ${notif.tierLabel}
            </span>
          </div>
          <h2 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: #ffffff;">${notif.subject}</h2>
          <div style="font-size: 13px; opacity: 0.85;">Dispatched automatically by Docketing Safety Scheduler at ${notif.timestamp}</div>
        </div>

        <!-- Recipients Header -->
        <div style="background: #f8fafc; padding: 14px 28px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Escalation Recipients:</div>
          ${recipientsHtml}
        </div>

        <!-- Email Body Content -->
        <div style="padding: 28px; color: #1e293b;">
          ${isEmergency ? `
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
              <div style="font-weight: 700; color: #991b1b; font-size: 14px; margin-bottom: 4px;">⚠️ HIGH RISK: STATUTORY BAR EXPIRATION IMMINENT</div>
              <div style="font-size: 13px; color: #7f1d1d; line-height: 1.5;">
                This matter has entered the zero-tolerance escalation window. Failure to submit required filings with the Patent Office before the statutory deadline will result in <strong>irrevocable loss of patent priority and abandonment</strong> under the Patents Act.
              </div>
            </div>
          ` : `
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 6px; margin-bottom: 20px;">
              <div style="font-weight: 700; color: #92400e; font-size: 13px; margin-bottom: 2px;">📋 UPCOMING DOCKET ACTION REQUIRED</div>
              <div style="font-size: 13px; color: #78350f; line-height: 1.4;">
                Please ensure client instructions are finalized and drafts prepared for timely filing.
              </div>
            </div>
          `}

          <!-- Matter Summary Card -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600; width: 35%;">Matter Number:</td>
                <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${notif.matterNumber}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Invention Title:</td>
                <td style="padding: 10px 0; font-weight: 600; color: #0f172a;">${notif.matterTitle}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Statutory Deadline:</td>
                <td style="padding: 10px 0; font-weight: 800; color: #dc2626; font-size: 15px;">${notif.statutoryDueDate} (${notif.daysRemaining} days remaining)</td>
              </tr>
              ${notif.statutorySection ? `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Governing Statute:</td>
                <td style="padding: 10px 0; color: #334155; font-style: italic;">${notif.statutorySection}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>

          <!-- Required Actions -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
            <div style="font-weight: 700; font-size: 13px; color: #334155; margin-bottom: 10px; text-transform: uppercase;">Required Safe-Clearance Protocol:</div>
            <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
              <li>File necessary forms/specifications through the official government e-filing portal.</li>
              <li>Upload official <strong>CBR (Cash Book Receipt) / Electronic Filing Acknowledgment PDF</strong> into the LexPatent Vault.</li>
              <li>Enter official confirmation number and fee voucher amount.</li>
              <li>Obtain secondary attorney dual-verification sign-off to permanently clear the docket alert.</li>
            </ol>
          </div>

          <!-- Action Buttons -->
          <div style="text-align: center; margin-top: 24px;">
            <a href="#" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
              Open Matter in Docket Radar & Upload Receipt
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 16px 28px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          LexPatent Zero-Fail Docket Safety Engine • Automated Escalation Tier 1-4 • Confidential Legal Communication
        </div>
      </div>
    `;
  }

  /**
   * Triggers a manual emergency alert for an urgent matter
   */
  triggerEmergencyEscalation(matter, deadline) {
    const days = window.deadlineService.calculateDaysRemaining(deadline.statutoryDueDate);
    const attorney = window.ATTORNEYS.find(a => a.id === matter.leadAttorneyId) || window.ATTORNEYS[0];
    const partner = window.ATTORNEYS.find(a => a.id === matter.supervisingPartnerId) || window.ATTORNEYS[3];

    const notif = {
      id: "notif-manual-" + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      tier: "MANUAL_EMERGENCY",
      tierLabel: "MANUAL PARTNER EMERGENCY ESCALATION",
      matterNumber: matter.matterNumber,
      matterTitle: matter.title,
      deadlineTitle: deadline.title,
      statutoryDueDate: deadline.statutoryDueDate,
      statutorySection: deadline.statutorySection,
      daysRemaining: days,
      recipients: [
        { name: attorney.name, email: attorney.email, role: "Lead Attorney" },
        { name: partner.name, email: partner.email, role: "Managing Partner" },
        { name: matter.client.contactPerson, email: matter.client.contactEmail, role: "Client General Counsel" }
      ],
      subject: `🚨 [MANUAL EMERGENCY ESCALATION] Urgent Attention Required: ${matter.matterNumber} - ${deadline.title}`,
      status: "DELIVERED",
      isEmergency: true,
      matterData: matter,
      deadlineData: deadline
    };

    this.notificationLogs.unshift(notif);
    matter.history.push({
      date: window.deadlineService.getSimulatedDate(),
      event: `Manual Emergency Escalation broadcasted to all partners & client legal counsel.`,
      user: "Managing Partner"
    });

    return notif;
  }

  getLogs() {
    return this.notificationLogs;
  }
}

window.notificationService = new NotificationService();
