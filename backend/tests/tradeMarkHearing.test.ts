import { describe, it, expect } from 'vitest';
import { extractDocument } from '../src/services/documentExtractor';

/**
 * Text taken from a real Trade Marks Registry hearing notice, including the
 * mangled Devanagari that pdf-parse produces for the bilingual form. The stray
 * "$" characters in it once caused a false currency reading.
 */
const TM_HEARING = `Dated: 19-08-2026
सेवा म/To,
GAURAV SONI, ADVOCATE
SONI & SONI - 2ND FLOOR SANGH MITRA,OPP. KESHAV BAGH
आवेदन सं या/Application No: 6043666
वग म/ in Class/Classes: 16
आवेदन तथ/Application Date: 29/07/2023
उपयोग क तथ/Used Since: 01-07-2023
आवेदक का नाम/Name of Applicant: G POLYPLAST INDUSTRIES
कृपया यान द िक उपयु यापार च! आवेदन सं या को यापार च! र"ज$ट&ी के नािमत सुनवाई अधकारी
Take notice that the Trade Mark Application number mentioned above has been fixed for hearing on 21-09-2026 at 10:00 AM TO
01:30 PM as scheduled by the designated Hearing Officer of the Trade Marks Registry through Video Conferencing for the reply to
examination report (MIS-R) is found un-satisfactory.
In case you fail to appear at the above said date and time through Video Conferencing the application would be treated as
abandoned for lack of prosecution under rule 33(7) of the Trade Marks Rules, 2017.
For Registrar of Trade Marks`;

describe('Trade Marks Registry hearing notice', () => {
  const result = extractDocument(TM_HEARING);

  it('recognises the document', () => {
    expect(result.profileId).toBe('IN_TM_HEARING');
    expect(result.stage).toBe('HEARING');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('takes the hearing date, not the date at the top of the letter', () => {
    // The letter is dated 19-08-2026; the hearing is 21-09-2026. Alerting on
    // the letter date would warn a month early and stay silent for the hearing.
    expect(result.triggerDate).toBe('2026-09-21');
  });

  it('keeps the hearing time on one line', () => {
    expect(result.hearingTime).toBe('10:00 AM TO 01:30 PM');
  });

  it('reads the applicant, application number and class', () => {
    expect(result.officialAppNumber).toBe('6043666');
    expect(result.clientName).toBe('G POLYPLAST INDUSTRIES');
    expect(result.classes).toBe('16');
    expect(result.applicationDate).toBe('2023-07-29');
    expect(result.matterNumber).toBe('IN-6043666');
  });

  it('does not invent a currency from stray symbols in the mangled text', () => {
    expect(result.currency).toBeUndefined();
  });
});
