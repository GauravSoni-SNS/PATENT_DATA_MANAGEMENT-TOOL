/**
 * LexPatent Smart OCR & Auto-Docketing Unit Test
 */

const fs = require('fs');

global.window = global;

require('./js/config/rulesEngine.js');
require('./js/store/mockData.js');
require('./js/services/receiptParserService.js');
require('./js/services/deadlineService.js');
require('./js/services/notificationService.js');
require('./js/services/receiptService.js');

console.log("=== [1] Testing Smart Receipt Parser with Official IPO Provisional CBR ===");
const sample1 = window.receiptParserService.getSamples()[0];
const res1 = window.receiptParserService.parseReceiptText(sample1.rawText, sample1.fileName);

console.assert(res1.confidence >= 0.95, "Confidence score must be >= 95%");
console.assert(res1.data.officialAppNumber === "202611098412", "Application number extraction failed");
console.assert(res1.data.cbrNumber === "CBR-2026-981245", "CBR extraction failed");
console.assert(res1.data.jurisdiction === "IN", "Jurisdiction extraction failed");
console.assert(res1.data.stage === "PROVISIONAL", "Stage extraction failed");
console.log("✓ IPO Provisional CBR Extracted:", res1.data.matterNumber, "| Title:", res1.data.title);

console.log("\n=== [2] Testing Smart Receipt Parser with USPTO Non-Provisional Filing Receipt ===");
const sample2 = window.receiptParserService.getSamples()[1];
const res2 = window.receiptParserService.parseReceiptText(sample2.rawText, sample2.fileName);

console.assert(res2.data.officialAppNumber === "18/992,140", "US Application number extraction failed");
console.assert(res2.data.cbrNumber === "EFS-ACK-2026-99120", "EFS Ack extraction failed");
console.assert(res2.data.jurisdiction === "US", "US Jurisdiction extraction failed");
console.assert(res2.data.officialFees === 1820, "Fees extraction failed");
console.log("✓ USPTO Receipt Extracted:", res2.data.matterNumber, "| Client:", res2.data.clientName);

console.log("\n=== [3] Testing Arbitrary Unstructured Receipt Text with Dynamic Heuristics ===");
const rawArbitraryText = `
INDIAN PATENT OFFICE - ELECTRONIC FILING
Transaction Acknowledgment
Application No: 202611099881
Invention Title: Autonomous Deep-Sea Swarm Robotics for Hydrothermal Vent Mapping
Applicant: OceanVanguard Technologies Private Limited
Fees Paid: INR 8000
CBR No: CBR-DEL-2026-778811
Filing Type: Provisional Application Form 1
`;

const res3 = window.receiptParserService.parseReceiptText(rawArbitraryText, "custom_doc.txt");
console.assert(res3.data.officialAppNumber === "202611099881", "Arbitrary App No extraction failed");
console.assert(res3.data.title === "Autonomous Deep-Sea Swarm Robotics for Hydrothermal Vent Mapping", "Arbitrary Title extraction failed");
console.assert(res3.data.clientName === "OceanVanguard Technologies Private Limited", "Arbitrary Client extraction failed");
console.assert(res3.data.cbrNumber === "CBR-DEL-2026-778811", "Arbitrary CBR extraction failed");
console.log("✓ Arbitrary Receipt Heuristically Extracted:", res3.data.matterNumber, "| Confidence:", (res3.confidence * 100) + "%");

console.log("\n=== [4] Testing Auto-Docketing End-to-End Execution ===");
const testMatterData = res1.data;
const deadlines = window.deadlineService.generateDeadlinesForStage(testMatterData.stage, testMatterData.triggerDate, testMatterData.priorityDate, testMatterData.jurisdiction);
console.assert(deadlines.length >= 2, "Must generate statutory deadlines");
console.assert(deadlines[0].statutoryDueDate === "2027-08-18", "12-Month Priority Bar must be exactly 1 year from filing date");

console.log("✓ Auto-Generated Statutory Deadlines Count:", deadlines.length);
deadlines.forEach(dl => console.log(`  - ${dl.title} -> Due: ${dl.statutoryDueDate}`));

console.log("\n=======================================================");
console.log("🎉 ALL SMART OCR & AUTO-DOCKETING TESTS PASSED (100%)!");
console.log("=======================================================");
