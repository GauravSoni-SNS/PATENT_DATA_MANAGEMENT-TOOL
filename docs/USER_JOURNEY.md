# LexPatent Docket Radar: User Journey & Testing Guide

**Application URL:** [http://localhost:5173](http://localhost:5173)  
**API:** [http://localhost:4000/api/v1](http://localhost:4000/api/v1)

---

## Quick Overview

When you open the app, you will see the monday.com-style layout:

- **Left Navy Rail** — Boards, Automations, Receipts Vault, Rules Calculator
- **Top Urgency Banner** — Daily Critical, 5-Day Red Alert, 15-Day Urgent counts + date simulator
- **View Tabs** — Main Table, Kanban Pipeline, Automations & Emails, Receipts Vault, Rules Calculator
- **Collapsible Groups** — Matters grouped by urgency tier

**Demo login:** `s.jenkins@lexpatent-ip.com` / `password123`

---

## User Journeys

### Journey 1: Auto-Docket from Receipt

1. Go to **Receipts Vault** → **Drop Receipt / Auto-Docket**
2. Click a sample chip (IPO CBR, USPTO EFS, EPO Form 1001)
3. Review parsed fields and proposed deadlines
4. Click **Confirm & Auto-Docket**

### Journey 2: Main Table Board

1. Open **Main Table** — matters grouped by urgency
2. Use search and urgency filters
3. Click **Export CSV** to download docket report

### Journey 3: Dual Verification & Clearance

1. Upload a receipt linked to a deadline (Partner role: `m.vance@lexpatent-ip.com`)
2. Approve verification in pending queue
3. Clear deadline — stage advances automatically

### Journey 4: Escalation Engine

1. Open **Automations & Emails**
2. Click **Run 08:00 AM Cron Scan**
3. Change **Simulate Date** in the top banner to test countdown tiers

### Journey 5: Kanban, Vault & Calculator

1. **Kanban Pipeline** — stage columns with matter cards
2. **Receipts Vault** — all uploaded government receipts
3. **Rules Calculator** — compute statutory deadlines by jurisdiction

---

## Test Checklist

| Step | Expected Result |
|---|---|
| Login | Redirect to board with 6 seed matters |
| List matters | Urgency groups populated correctly |
| Cron scan | Notifications generated for T-30/15/5/daily tiers |
| Rules calculator | 12-month bar computed correctly |
| Auto-docket sample | New matter created with deadlines |
| Export CSV | File downloads with matter data |

See [SETUP.md](./SETUP.md) for installation and [API_SPECIFICATION.md](./API_SPECIFICATION.md) for API details.
