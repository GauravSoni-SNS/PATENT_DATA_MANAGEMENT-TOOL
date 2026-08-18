# LexPatent Docket Radar: Zero-Fail Patent Prosecution & Deadline Management System

**LexPatent Docket Radar** is a mission-critical IP docketing and statutory deadline automation platform designed specifically for patent attorneys, managing partners, and IP paralegals.

---

## 🏛️ Patent Prosecution Lifecycle Overview

In patent law, missing a statutory deadline results in **irrevocable loss of patent rights and deemed abandonment**. The system tracks every file through 8 statutory milestones:

```
[1. Intake & Search] ➔ [2. Provisional Filing] ➔ [3. Complete / PCT Filing] ➔ [4. 18-Month Publication & RFE] ➔ [5. FER / Office Action] ➔ [6. Oral Hearing] ➔ [7. Allowance & Grant] ➔ [8. Post-Grant Annuities]
```

### Key Statutory Bars & Deadlines Computed
1. **12-Month Priority Bar (Convention / PCT)**:
   - *Statute*: Section 9(1) Indian Patents Act 1970 / Paris Convention Art. 4 / 35 U.S.C. 119(e).
   - *Rule*: Complete specification or PCT application must be filed within exactly 12 months from the Provisional Priority Date. Strictly non-extendable.
2. **18-Month Publication**:
   - *Statute*: Section 11A, Rule 24 / 35 U.S.C. 122(b).
   - *Rule*: Automatic publication in the official gazette 18 months from earliest priority date.
3. **Request for Examination (RFE)**:
   - *Statute*: Section 11B, Rule 24B (48 / 31 months from priority in India).
4. **First Examination Report (FER) / Office Action Response**:
   - *Statute*: Section 21(1), Rule 24B(5) in India (6 months, extendable by 3 months on Form 4) / 37 CFR 1.134 in US (3 months extendable up to 6 months).
5. **Post-Hearing Written Submissions**:
   - *Statute*: Rule 28(7), Patent Rules 2003 (15 days strictly following oral hearing).
6. **Notice of Allowance / Grant Sealing Fee**:
   - *Statute*: 3 months to pay issue/grant fees.
7. **Post-Grant Annuities & Form 27 Working Statements**:
   - *Statute*: Annual maintenance starting Year 3 with 6-month grace period + surcharge.

---

## 🚨 Tiered Zero-Fail Escalation Matrix

To ensure that not a single statutory deadline is missed, the system activates automated alerts on a structured cadence:

| Escalation Tier | Trigger Window | Target Audience | Channels & Protocols |
|---|---|---|---|
| **Tier 1: Amber Advisory** | **T-30 Days** | Assigned Drafting Attorney & Paralegal | Weekly summary email, dashboard reminder |
| **Tier 2: Orange Warning** | **T-15 Days** | Assigned Attorney + Supervising Partner | Direct urgent email with draft action links |
| **Tier 3: Red Critical Alert** | **T-5 Days** | Lead Attorney + Partner + Client Legal Rep | High-priority email warning of statutory bar |
| **Tier 4: Daily Countdown Blitz** | **T-4 to T-0 Days** | Entire IP Team, Risk Committee, Managing Partner | Daily 8:00 AM & 4:00 PM countdown alerts |

---

## 🛡️ Dual-Verification & Government Proof Vault

A core principle of patent docket safety is that **deadlines cannot be marked "Done" on an honor system**:
1. **Upload Proof of Filing**: The attorney/paralegal must upload the official **Government Cash Book Receipt (CBR)**, **USPTO EFS Acknowledgement**, or **EPO Form 1001 Confirmation**, including official timestamp, transaction ID, and statutory fee amount.
2. **Dual Sign-Off**: A secondary attorney or managing partner must inspect the official receipt and execute a digital sign-off to permanently clear the docket alert.
3. **Stage Advancement**: Upon clearance, the system automatically advances the matter to the next prosecution stage and generates the successor statutory deadlines.

---

## 🚀 How to Run Locally

Open `index.html` in any modern web browser or start a local dev server:

```bash
# Python simple HTTP server
python -m http.server 8000

# Or with Node.js
npx serve .
```

Navigate to `http://localhost:8000` to interact with the full dashboard, simulate cron dispatches, upload official CBR receipts, perform dual-verifications, and test the statutory rules calculator.
