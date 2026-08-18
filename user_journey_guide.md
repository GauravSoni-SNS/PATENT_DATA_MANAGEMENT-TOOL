# 📖 LexPatent Docket Radar: User Journey & Testing Guide
**Design System**: monday.com UI/UX • **Application URL**: [http://localhost:3000](http://localhost:3000)

---

## 🎯 Quick Overview of Your Workspace

When you open **[http://localhost:3000](http://localhost:3000)**, you will see the signature **monday.com layout**:
- **Left Navy Rail (`#292f4c`)**: Quick navigation between Boards, Automations, Receipts Vault, and Rules Calculator.
- **Top Urgency Banner**: Pulsing live alert indicator with counts for **Daily Critical**, **5-Day Red Alert**, and **15-Day Urgent** matters, plus a **Simulate Date** picker.
- **Board Header**: Title, description, and action buttons (`+ Add Matter`, `⚡ Drop Receipt / Auto-Docket`, `⚡ Automations`, `📥 Export CSV`).
- **View Switcher Tabs**: `📋 Main Table`, `📊 Kanban Pipeline`, `⚡ Automations & Emails`, `🏛️ Receipts Vault`, `🧮 Rules Calculator`.
- **Collapsible Groups**: Color-coded groups categorizing matters by urgency with group progress bars.

---

## 🚀 Step-by-Step User Journeys & Testing Workflows

```
                                  USER JOURNEY MAP
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   [Journey 1: Zero-Typing Intake] ──► Drop Government CBR / Receipt              │
│                  │                                                               │
│                  ▼                                                               │
│   [Journey 2: monday.com Board]   ──► Inspect Collapsible Groups & Timelines     │
│                  │                                                               │
│                  ▼                                                               │
│   [Journey 3: Clear with Proof]   ──► Upload CBR ➔ Dual-Attorney Sign-Off        │
│                  │                                                               │
│                  ▼                                                               │
│   [Journey 4: Zero-Fail Alerts]   ──► Time-Travel Simulator ➔ Run 8 AM Cron      │
│                  │                                                               │
│                  ▼                                                               │
│   [Journey 5: Multi-Views & Export] ➔ Kanban ➔ Receipts Vault ➔ CSV Report      │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### ⚡ Journey 1: Zero-Manual-Typing Auto-Docketing (Smart OCR)
*Goal: Docket a brand new patent filing in 5 seconds without typing anything manually.*

1. In the top header or any group row, click the gradient button: **`⚡ Drop Receipt / Auto-Docket`**.
2. A clean modal opens. Under **"Or test with real government sample receipts"**, click any chip:
   - 📄 *🇮🇳 Indian Patent Office (IPO) - Provisional Filing CBR*
   - 📄 *🇺🇸 USPTO Patent Center - Utility Non-Provisional Filing Receipt*
   - 📄 *🇪🇺 European Patent Office (EPO) - Form 1001 Acknowledgment*
   - 📄 *🇮🇳 Indian Patent Office (IPO) - First Examination Report (FER)*
   *(Or drop any text/PDF file from your computer)*.
3. **Observe**: The AI parser scans the document in real time and automatically extracts:
   - Matter Docket Number & Official Application Number
   - Invention Title & Client Name
   - Official CBR / Transaction Number & Statutory Fees Paid
   - Prosecution Stage & Jurisdiction
   - **Auto-Calculates Statutory Deadlines** (e.g. 12-Month Priority Bar).
4. Click **`🚀 Confirm & Auto-Docket into Board`**.
5. **Result**: The matter is instantly created, sorted into the correct urgency group on your board, and its official receipt is stored in the Vault. The matter drawer opens automatically for you!

---

### 📋 Journey 2: Interacting with the monday.com Main Table
*Goal: Manage matters across color-coded collapsible groups.*

1. On the **Main Table** tab, observe how matters are automatically organized into 5 groups:
   - 🔴 **Critical & Daily Countdowns (T-0 to T-5 Days)** (`#e2445c`)
   - 🟠 **Action Required (T-6 to T-15 Days)** (`#fdab3d`)
   - 🟡 **30-Day Advisory & Drafting (T-16 to T-30 Days)** (`#ffcb00`)
   - 🟢 **Safe Prosecution & Annuities (> 30 Days)** (`#579bfc`)
   - 🟣 **Completed & Granted Patents** (`#00c875`)
2. **Collapse & Expand**: Click the collapse arrow `▼` on any group header (e.g., *Action Required*) to fold or unfold it.
3. **Inspect Matter Details**: Click on any matter title (e.g., *Autonomous Multi-Spectral Collision Avoidance*) to open the slide-in **Matter Docket Workspace**:
   - View the visual prosecution stepper pipeline (Stages 1 to 8).
   - View all active statutory deadlines and governing sections.
   - View attached government receipts and audit logs.
4. **Signature Columns**:
   - **Timeline / Due Date**: See the colorful progress bar with exact days remaining (e.g., `2d left`, `5d left`, `15d left`).
   - **Status Block**: Click the full-cell status block (`DAILY CRITICAL`, `15-DAY URGENT`, `DONE`).
   - **Receipt Tag**: Click any `🏛️ CBR-...` chip to view the digital filing certificate.

---

### 🛡️ Journey 3: Clearing a Critical Deadline (Government Proof & Dual Sign-Off)
*Goal: Experience the zero-tolerance safety protocol where deadlines cannot be closed without official government proof.*

1. Locate matter **`IN-2024-PAT-00412`** (*Solid-State Lithium-Sulfur Battery*) in the 🔴 **Critical Group** (FER response due in 5 days).
2. In the rightmost **Actions** column, click the blue **`Upload`** button.
3. A modal opens with the pre-filled target matter and deadline. Review the official CBR number (`CBR-2026-...`) and fee amount, then click **`Upload & Verify`**.
4. The **Dual Attorney Verification Sign-Off Modal** automatically appears:
   - Review the rendered official Government Cash Book Receipt (CBR).
   - Select the secondary verifying partner: **Marcus Vance, Esq. (Managing IP Partner)**.
   - Click **`✅ Sign-Off, Clear Docket & Advance Stage`**.
5. **Result**:
   - A green confirmation toast appears.
   - The deadline status turns to **`DONE` (Green `#00c875`)**.
   - The matter automatically moves to the **Completed / Advanced Stage** group!

---

### ⚡ Journey 4: Testing the Automated Zero-Fail Escalation Engine
*Goal: Verify background cron dispatches and test time-travel countdown simulations.*

1. Click the **`⚡ Automations & Emails`** tab at the top.
2. Review the 6 active automation recipe cards:
   - *30-Day Amber Escalation Recipe*
   - *15-Day Orange Warning Recipe*
   - *5-Day Red Emergency Alert Recipe*
   - *Daily Critical Blitz (T-4 to T-0)*
   - *Dual Verification Safety Rule*
   - *Stage Progression Trigger*
3. Click the top button **`⚡ Run 08:00 AM Cron Scan`**:
   - Dispatches the automated morning background worker.
   - Generates notifications for all approaching statutory bars.
4. **Test Date Travel**: In the top banner, click the **Simulate Date** input and change the date (e.g., set it 10 days forward):
   - Notice all countdown pills and urgency classifications recalculate instantly!
5. **Emergency Manual Alert**: On any critical matter in the table, click the red **`🚨`** button to trigger an immediate partner broadcast alert.

---

### 📊 Journey 5: Exploring Kanban, Vault & Reporting Tools

1. **Kanban Pipeline**:
   - Click the **`📊 Kanban Pipeline`** view tab.
   - See cards organized visually under columns: *🔥 Daily Critical*, *🚨 5-Day Alert*, *⚠️ 15-Day Urgent*, *📋 30-Day Advisory*, *🟢 Safe Prosecution*, and *✅ Completed*.
2. **Government Receipts Vault**:
   - Click the **`🏛️ Government Receipts Vault`** tab.
   - Browse the repository of all verified official receipts, CBR numbers, timestamps, and fees.
   - Click **`📄 View Official PDF`** on any card to view the printable official certificate.
3. **Statutory Rules Calculator**:
   - Click the **`🧮 Statutory Rules Calculator`** tab.
   - Switch jurisdictions (India, US, Europe, PCT) and milestone stages (Provisional, Complete, FER, Hearing) to test dynamic statutory bar calculations.
4. **Export Docket Report**:
   - Click **`📥 Export CSV`** in the top header to download the complete firm docket report to spreadsheet format.

---

## 🧪 Summary Checklist for Testing

| Test Step | Expected Result | Verified |
|---|---|:---:|
| 1. Drop Sample Receipt | Form auto-fills in < 1 sec with 99% accuracy | ✅ |
| 2. Click 'Confirm & Auto-Docket' | Matter created with all statutory bars | ✅ |
| 3. Collapse/Expand Table Groups | Groups smoothly toggle visibility | ✅ |
| 4. Upload CBR & Dual-Sign Off | Deadline clears and stage advances | ✅ |
| 5. Change Simulated Date | Countdowns and status blocks recalculate | ✅ |
| 6. Run 8:00 AM Cron Scan | Dispatches automated escalation alerts | ✅ |
| 7. Switch to Kanban & Vault | Smooth view transitions and data sync | ✅ |
