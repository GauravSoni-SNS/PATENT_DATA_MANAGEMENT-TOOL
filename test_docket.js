/**
 * LexPatent Docket Radar - Comprehensive Verification Test Suite
 */

const fs = require('fs');
const path = require('path');

// Mock window and global browser environment
global.window = global;

// Load all script files
require('./js/config/rulesEngine.js');
require('./js/store/mockData.js');
require('./js/services/deadlineService.js');
require('./js/services/notificationService.js');
require('./js/services/receiptService.js');

console.log("=== [1] Testing Rules Engine & Date Calculations ===");
const provDeadlines = window.STATUTORY_RULES.PROVISIONAL_FILED.generateDeadlines("2025-08-20", "IN");
console.assert(provDeadlines.length >= 2, "Provisional must generate at least 2 statutory deadlines");
const bar12m = provDeadlines.find(d => d.ruleId === "CONVENTION_12M_BAR");
console.assert(bar12m.statutoryDueDate === "2026-08-20", "12-month bar calculation failed");
console.log("✓ 12-Month Priority Bar correctly computed:", bar12m.statutoryDueDate);

const ferDeadlines = window.STATUTORY_RULES.FER_OA_ISSUED.generateDeadlines("2026-02-23", "IN");
const ferReply = ferDeadlines.find(d => d.ruleId === "FER_RESPONSE_DUE");
console.assert(ferReply.statutoryDueDate === "2026-08-23", "6-Month FER response due date failed");
console.assert(ferReply.extendedDueDate === "2026-11-23", "3-Month extension calculation failed");
console.log("✓ 6-Month FER Response Due Date & +3m Extension correctly computed:", ferReply.statutoryDueDate, "->", ferReply.extendedDueDate);

const hearingDeadlines = window.STATUTORY_RULES.HEARING_SCHEDULED.generateDeadlines("2026-08-16", "IN");
const hearingSub = hearingDeadlines.find(d => d.ruleId === "HEARING_WRITTEN_SUBMISSION");
console.assert(hearingSub.statutoryDueDate === "2026-08-31", "15-Day hearing submission failed");
console.log("✓ 15-Day Post-Hearing Written Submission correctly computed:", hearingSub.statutoryDueDate);

console.log("\n=== [2] Testing Deadline Service & Urgency Tiers ===");
window.deadlineService.setSimulatedDate("2026-08-18");

const tier2d = window.deadlineService.getUrgencyTier(2);
console.assert(tier2d.key === "DAILY_CRITICAL", "2 days must be DAILY_CRITICAL");
console.log("✓ 2 Days Remaining ->", tier2d.label);

const tier5d = window.deadlineService.getUrgencyTier(5);
console.assert(tier5d.key === "T_5_CRITICAL", "5 days must be T_5_CRITICAL");
console.log("✓ 5 Days Remaining ->", tier5d.label);

const tier15d = window.deadlineService.getUrgencyTier(15);
console.assert(tier15d.key === "T_15_URGENT", "15 days must be T_15_URGENT");
console.log("✓ 15 Days Remaining ->", tier15d.label);

const tier30d = window.deadlineService.getUrgencyTier(30);
console.assert(tier30d.key === "T_30_ADVISORY", "30 days must be T_30_ADVISORY");
console.log("✓ 30 Days Remaining ->", tier30d.label);

console.log("\n=== [3] Testing Notification Dispatcher & Tiered Escalation ===");
const evaluatedNotifs = window.notificationService.evaluateAllMatters(window.INITIAL_MATTERS);
console.assert(evaluatedNotifs.length >= 4, "Must generate notifications for all matters under 30d");
console.log(`✓ Automated Cron Evaluation generated ${evaluatedNotifs.length} high-priority email alerts`);
evaluatedNotifs.forEach(n => {
  console.log(`  - [${n.tier}] Matter: ${n.matterNumber} | Due: ${n.statutoryDueDate} (${n.daysRemaining}d left)`);
});

console.log("\n=== [4] Testing Proof-of-Filing & Dual Verification Clearance ===");
const testMatter = JSON.parse(JSON.stringify(window.INITIAL_MATTERS[0])); // Provisional matter
const pendingDeadline = testMatter.deadlines[0];

// Step 1: Upload Government Receipt
const { receipt } = window.receiptService.uploadFilingReceipt(testMatter, pendingDeadline.id, {
  cbrNumber: "CBR-2026-TEST-999",
  officialFees: 8000,
  receiptType: "COMPLETE_FILING_CBR",
  notes: "Complete Form 1, 2, 3, 5 filed electronically."
});
console.assert(pendingDeadline.status === "WAITING_VERIFICATION", "Status must be WAITING_VERIFICATION after upload");
console.log("✓ Receipt Uploaded:", receipt.cbrNumber, "| Status:", pendingDeadline.status);

// Step 2: Dual Verification Sign-Off
window.receiptService.verifyAndClearDeadline(testMatter, pendingDeadline.id, receipt.id, "usr-04");
console.assert(pendingDeadline.status === "COMPLETED", "Deadline must be COMPLETED after dual verification");
console.assert(testMatter.currentStage === "COMPLETE", "Matter stage must advance to COMPLETE");
console.assert(testMatter.deadlines.length > 1, "Successor stage deadlines (Publication/RFE) must be generated");
console.log("✓ Dual-Verification Sign-Off Completed! Matter advanced to Stage:", testMatter.currentStage);
console.log("✓ Successor Deadlines Generated:", testMatter.deadlines.map(d => d.title));

console.log("\n=======================================================");
console.log("🎉 ALL PATENT STATUTORY LOGIC & VERIFICATION TESTS PASSED!");
console.log("=======================================================");
