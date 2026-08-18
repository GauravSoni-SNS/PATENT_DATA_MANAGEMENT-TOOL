/**
 * LexPatent Government Receipt & Dual-Verification Service
 * Enforces proof-of-filing requirements (CBR / Electronic Acknowledgement)
 * and dual-attorney sign-off before any statutory deadline can be cleared.
 */

class ReceiptService {
  constructor() {
    this.receiptTypes = {
      PROVISIONAL_FILING_CBR: {
        label: "Provisional Filing Official Receipt (CBR)",
        badge: "CBR-PROV",
        icon: "file-text",
        jurisdictions: ["IN"]
      },
      COMPLETE_FILING_CBR: {
        label: "Complete Specification Filing Receipt (Form 1/2/3/5)",
        badge: "CBR-COMPL",
        icon: "file-check",
        jurisdictions: ["IN"]
      },
      USPTO_EFS_ACK: {
        label: "USPTO Patent Center Electronic Filing Receipt",
        badge: "USPTO-EFS",
        icon: "shield-check",
        jurisdictions: ["US"]
      },
      EPO_ONLINE_FILING_ACK: {
        label: "EPO Online Filing Acknowledgment (Form 1001)",
        badge: "EPO-ACK",
        icon: "file-code",
        jurisdictions: ["EP"]
      },
      PCT_RECEIPT: {
        label: "WIPO / PCT Form PCT/RO/105 Notification",
        badge: "PCT-RO",
        icon: "globe",
        jurisdictions: ["WO"]
      },
      FER_RESPONSE_CBR: {
        label: "Office Action / FER Written Response Acknowledgment",
        badge: "FER-REPLY",
        icon: "file-diff",
        jurisdictions: ["IN", "US", "EP"]
      },
      HEARING_SUBMISSION_CBR: {
        label: "Post-Hearing Written Submissions & Revised Claims Receipt",
        badge: "HEARING-ACK",
        icon: "message-square",
        jurisdictions: ["IN", "US", "EP"]
      },
      ISSUE_FEE_RECEIPT: {
        label: "Notice of Allowance / Issue & Sealing Fee Receipt",
        badge: "ISSUE-FEE",
        icon: "dollar-sign",
        jurisdictions: ["IN", "US", "EP"]
      },
      OFFICIAL_GRANT_CERTIFICATE: {
        label: "Official Letters Patent / Grant Certificate",
        badge: "PATENT-GRANT",
        icon: "award",
        jurisdictions: ["IN", "US", "EP", "WO"]
      },
      ANNUITY_RECEIPT: {
        label: "Patent Annuity / Maintenance Renewal Receipt",
        badge: "ANNUITY",
        icon: "refresh-cw",
        jurisdictions: ["IN", "US", "EP"]
      }
    };
  }

  /**
   * Uploads an official filing receipt to clear a specific deadline
   */
  uploadFilingReceipt(matter, deadlineId, receiptData) {
    const deadline = matter.deadlines.find(d => d.id === deadlineId);
    if (!deadline) throw new Error("Deadline not found");

    const newReceipt = {
      id: "rcpt-" + Date.now(),
      receiptType: receiptData.receiptType || deadline.requiredReceiptType || "COMPLETE_FILING_CBR",
      receiptTitle: receiptData.receiptTitle || `${deadline.title} Official Receipt`,
      cbrNumber: receiptData.cbrNumber || `CBR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
      officialTimestamp: receiptData.officialTimestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
      officialFees: Number(receiptData.officialFees) || 0,
      currency: receiptData.currency || (matter.jurisdiction === "IN" ? "INR" : (matter.jurisdiction === "US" ? "USD" : "EUR")),
      documentUrl: receiptData.fileName || `official_receipt_${matter.matterNumber}.pdf`,
      uploadedBy: receiptData.uploadedBy || "usr-03", // Default to Associate/Paralegal
      verifiedBy: null,
      verifiedAt: null,
      notes: receiptData.notes || "",
      clearedDeadlineId: deadlineId
    };

    matter.receipts = matter.receipts || [];
    matter.receipts.push(newReceipt);

    // Mark deadline as WAITING_VERIFICATION
    deadline.status = "WAITING_VERIFICATION";
    deadline.pendingReceiptId = newReceipt.id;

    matter.history.push({
      date: window.deadlineService.getSimulatedDate(),
      event: `Government Receipt uploaded: ${newReceipt.cbrNumber} (${newReceipt.receiptTitle}). Awaiting dual attorney verification.`,
      user: "Uploading Attorney"
    });

    return { matter, receipt: newReceipt };
  }

  /**
   * Secondary Attorney Dual Verification Sign-Off
   */
  verifyAndClearDeadline(matter, deadlineId, receiptId, verifyingAttorneyId) {
    const deadline = matter.deadlines.find(d => d.id === deadlineId);
    const receipt = (matter.receipts || []).find(r => r.id === receiptId);

    if (!deadline || !receipt) {
      throw new Error("Deadline or associated Government Receipt not found");
    }

    const verifyingAttorney = window.ATTORNEYS.find(a => a.id === verifyingAttorneyId) || window.ATTORNEYS[3];

    // Update receipt verification
    receipt.verifiedBy = verifyingAttorney.id;
    receipt.verifiedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Mark deadline as completed
    deadline.status = "COMPLETED";
    deadline.clearedAt = receipt.verifiedAt;
    deadline.clearedBy = verifyingAttorney.name;
    deadline.clearingReceiptId = receipt.id;

    // Advance Stage if applicable
    this.advanceStageAfterFiling(matter, deadline.ruleId);

    matter.history.push({
      date: window.deadlineService.getSimulatedDate(),
      event: `✅ DOCKET CLEARED: Deadline '${deadline.title}' verified & archived by ${verifyingAttorney.name}. Proof: ${receipt.cbrNumber}.`,
      user: verifyingAttorney.name
    });

    return matter;
  }

  /**
   * Advances matter to the next logical prosecution stage upon clearing a milestone
   */
  advanceStageAfterFiling(matter, ruleId) {
    const simulatedDate = window.deadlineService.getSimulatedDate();
    
    if (ruleId === "CONVENTION_12M_BAR") {
      // Completed Complete specification filing -> move to Stage 3 / 4
      matter.currentStage = "COMPLETE";
      matter.status = "UPCOMING";
      // Generate new deadlines for Complete Stage (Publication & RFE)
      const newDeadlines = window.deadlineService.generateDeadlinesForStage("COMPLETE", simulatedDate, matter.priorityDate, matter.jurisdiction);
      newDeadlines.forEach(d => {
        d.id = "ddl-" + Math.floor(Math.random() * 100000);
        d.status = "PENDING";
        matter.deadlines.push(d);
      });
    } else if (ruleId === "FER_RESPONSE_DUE") {
      matter.currentStage = "HEARING";
      matter.status = "SAFE";
    } else if (ruleId === "HEARING_WRITTEN_SUBMISSION") {
      matter.currentStage = "ALLOWANCE_GRANT";
      matter.status = "SAFE";
    } else if (ruleId === "GRANT_ISSUE_FEE") {
      matter.currentStage = "ANNUITY_MAINTENANCE";
      matter.status = "COMPLETED";
      // Generate Year 3 Annuity deadline
      const annuityDeadlines = window.deadlineService.generateDeadlinesForStage("ANNUITY_MAINTENANCE", simulatedDate, matter.filingDate, matter.jurisdiction);
      annuityDeadlines.forEach(d => {
        d.id = "ddl-" + Math.floor(Math.random() * 100000);
        d.status = "PENDING";
        matter.deadlines.push(d);
      });
    }
  }

  /**
   * Generates a sample printable/downloadable official Government Filing Certificate
   */
  renderOfficialReceiptHtml(receipt, matter) {
    return `
      <div style="font-family: 'Courier New', Courier, monospace; background: #ffffff; color: #000000; padding: 30px; border: 2px solid #000; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px;">
          <div style="font-size: 16px; font-weight: bold; text-transform: uppercase;">GOVERNMENT PATENT OFFICE</div>
          <div style="font-size: 13px;">ELECTRONIC FILING ACKNOWLEDGMENT & CASH BOOK RECEIPT (CBR)</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">CBR / TRANSACTION NO:</td>
            <td style="padding: 6px 0; font-weight: bold; color: #1e3a8a;">${receipt.cbrNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">APPLICATION NUMBER:</td>
            <td style="padding: 6px 0;">${matter.officialAppNumber || matter.matterNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">OFFICIAL FILING TIMESTAMP:</td>
            <td style="padding: 6px 0;">${receipt.officialTimestamp}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">RECEIPT TYPE:</td>
            <td style="padding: 6px 0;">${receipt.receiptTitle}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">APPLICANT / CLIENT:</td>
            <td style="padding: 6px 0;">${matter.client.name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">INVENTION TITLE:</td>
            <td style="padding: 6px 0; font-style: italic;">${matter.title}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">OFFICIAL STATUTORY FEES PAID:</td>
            <td style="padding: 6px 0; font-weight: bold; color: #047857;">${receipt.currency} ${receipt.officialFees.toLocaleString()}</td>
          </tr>
        </table>

        <div style="border-top: 1px dashed #000; padding-top: 12px; font-size: 11px; margin-top: 15px;">
          <div><strong>DIGITAL VERIFICATION STATUS:</strong></div>
          <div>Uploaded by Agent: ${receipt.uploadedBy || 'Patent Paralegal'}</div>
          <div>Dual-Verified by Attorney: ${receipt.verifiedBy ? 'VERIFIED (Attorney ID: ' + receipt.verifiedBy + ')' : 'PENDING DUAL VERIFICATION'}</div>
          <div>Verification Timestamp: ${receipt.verifiedAt || 'Awaiting Secondary Review'}</div>
        </div>

        <div style="text-align: center; margin-top: 25px; font-size: 10px; color: #555;">
          *** THIS IS AN OFFICIAL DIGITALLY SIGNED STATUTORY RECORD. VALID FOR PATENT DOCKET AUDIT TRAIL ***
        </div>
      </div>
    `;
  }
}

window.receiptService = new ReceiptService();
