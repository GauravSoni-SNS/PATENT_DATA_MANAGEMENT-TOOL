import { describe, it, expect } from 'vitest';
import { extractDocument, parseDate, selectProfile } from '../src/services/documentExtractor';

const IPO_CBR = `GOVERNMENT OF INDIA
THE PATENT OFFICE
CBR Number: CBR-2026-981245
Application Number: 202611098412
Applicant / Client: Solaria Quantum Innovations Ltd.
Contact Email: patents@solariaquantum.com
Invention Title: Quantum Dot Photovoltaic Cells with Perovskite Tandem Heterojunction
Statutory Fees Paid: INR 8000.00
Date & Time of Transaction: 08/09/2026 11:24:32 IST`;

const USPTO_ACK = `UNITED STATES PATENT AND TRADEMARK OFFICE
Patent Center Acknowledgement Receipt
Application Number: 18/992,140
Applicant: NeuroVanguard Systems LLC
Title of Invention: Adaptive Neural Interface for Prosthetic Limb Control
Filing Date: 08/09/2026
EFS ID: EFS-2026-881902
Fees Paid: USD 1820.00`;

const IPO_HEARING = `GOVERNMENT OF INDIA
THE PATENT OFFICE
Notice of Hearing under Section 14
Application Number: 202211000087
Applicant: BioNova Diagnostic Systems
Invention Title: Rapid Multiplex Assay Cartridge
Date of Filing: 15/03/2026`;

describe('profile identification', () => {
  it('tells the Indian Patent Office from the USPTO', () => {
    expect(selectProfile(IPO_CBR).profile?.id).toBe('IN_IPO_CBR');
    expect(selectProfile(USPTO_ACK).profile?.id).toBe('US_USPTO_ACK');
  });

  it('returns no profile for an unrelated document', () => {
    expect(selectProfile('Invoice for office stationery, total 4200').profile).toBeNull();
  });
});

describe('date handling', () => {
  it('reads the same digits differently per authority', () => {
    // 08/09/2026 is 8 September in India and 9 August at the USPTO.
    expect(parseDate('08/09/2026', 'DMY')).toBe('2026-09-08');
    expect(parseDate('08/09/2026', 'MDY')).toBe('2026-08-09');
  });

  it('applies the authority order end to end', () => {
    expect(extractDocument(IPO_CBR).triggerDate).toBe('2026-09-08');
    expect(extractDocument(USPTO_ACK).triggerDate).toBe('2026-08-09');
  });

  it('rejects impossible dates rather than inventing one', () => {
    expect(parseDate('31/02/2026', 'DMY')).toBeUndefined();
    expect(parseDate('45/13/2026', 'DMY')).toBeUndefined();
    expect(parseDate('not a date', 'DMY')).toBeUndefined();
  });
});

describe('field extraction', () => {
  it('reads an Indian CBR', () => {
    const r = extractDocument(IPO_CBR);
    expect(r.jurisdiction).toBe('IN');
    expect(r.officialAppNumber).toBe('202611098412');
    expect(r.cbrNumber).toBe('CBR-2026-981245');
    expect(r.title).toBe('Quantum Dot Photovoltaic Cells with Perovskite Tandem Heterojunction');
    expect(r.clientName).toBe('Solaria Quantum Innovations Ltd.');
    expect(r.clientEmail).toBe('patents@solariaquantum.com');
    expect(r.officialFees).toBe(8000);
    expect(r.currency).toBe('INR');
    expect(r.matterNumber).toBe('IN-202611098412');
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it('reads a USPTO acknowledgement', () => {
    const r = extractDocument(USPTO_ACK);
    expect(r.jurisdiction).toBe('US');
    expect(r.officialAppNumber).toBe('18/992,140');
    expect(r.cbrNumber).toBe('EFS-2026-881902');
    expect(r.clientName).toBe('NeuroVanguard Systems LLC');
    expect(r.currency).toBe('USD');
    expect(r.matterNumber).toBe('US-18992140');
  });

  it('detects the prosecution stage from the document, not the authority', () => {
    expect(extractDocument(IPO_HEARING).stage).toBe('HEARING');
    expect(extractDocument(IPO_HEARING).jurisdiction).toBe('IN');
  });

  it('reports what it could not find instead of guessing', () => {
    const r = extractDocument(`GOVERNMENT OF INDIA
THE PATENT OFFICE
Application Number: 202611098412`);
    expect(r.missing).toContain('title');
    expect(r.missing).toContain('clientName');
    expect(r.title).toBeUndefined();
  });

  it('gives an unrecognised document zero confidence', () => {
    const r = extractDocument('Lunch receipt, Cafe Bombay, total 480');
    expect(r.profileId).toBeNull();
    expect(r.confidence).toBe(0);
  });
});
