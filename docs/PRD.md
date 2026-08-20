# Product Requirements Document (PRD)

**Product:** LexPatent Docket Radar  
**Version:** 1.0  
**Status:** Draft  
**Date:** August 2026  
**Stack:** React · Node.js · PostgreSQL  

---

## 1. Executive Summary

LexPatent Docket Radar is a **zero-fail patent prosecution and statutory deadline management platform** for IP law firms. It automates jurisdiction-specific deadline calculation, tiered escalation alerts, government proof-of-filing verification, and dual-attorney sign-off workflows — reducing the risk of missed statutory bars that cause irrevocable loss of patent rights.

This PRD defines the full production system to be built on **React (frontend)**, **Node.js (backend)**, and **PostgreSQL (database)**, evolving from the current browser-only prototype.

---

## 2. Problem Statement

Patent prosecution involves dozens of **non-extendable statutory deadlines** across multiple jurisdictions. Law firms currently rely on:

- Spreadsheets and manual calendars (error-prone)
- Legacy docketing software with poor UX and high cost
- Honor-system deadline clearance (no proof-of-filing enforcement)

**Consequences of failure:** deemed abandonment, loss of priority rights, malpractice exposure, client trust damage.

**Gap:** Mid-size firms (especially in India) need affordable, modern, proof-first docketing with strong IPO rules support — without enterprise pricing ($25K+/year).

---

## 3. Product Vision

> *"No patent deadline is ever missed — every clearance requires government proof and dual verification."*

### 3.1 Goals

| # | Goal | Measure |
|---|---|---|
| G1 | Zero missed statutory bars | 0 lapsed statutory deadlines in production |
| G2 | Proof-first clearance | 100% of cleared deadlines have uploaded receipt + dual sign-off |
| G3 | Accurate rules engine | Deadline calculations match official statutes for IN/US/EP/PCT |
| G4 | Timely escalation | Alerts dispatched at T-30, T-15, T-5, and daily T-4→T-0 |
| G5 | Firm-wide visibility | All users see shared, real-time docket state |

### 3.2 Non-Goals (Initial Release)

- Trademark docketing (Phase 5+)
- Full billing/invoicing integration (Phase 4)
- Mobile native apps (Phase 4 — responsive web first)
- 300+ jurisdiction rules (Phase 1: IN/US/EP/PCT only)

---

## 4. Target Users & Personas

| Persona | Role | Primary needs |
|---|---|---|
| **Sarah — Senior Patent Attorney** | Lead drafting attorney | See my matters' urgency, upload FER responses, clear deadlines with proof |
| **Priya — Docket Specialist / Paralegal** | Docketing team | Auto-docket from receipts, run daily cron reports, manage board |
| **Marcus — Managing IP Partner** | Supervising partner | Dual-verify critical clearances, escalation dashboard, firm-wide risk view |
| **Client Legal Rep** | External (read-only alerts) | Receive T-5 critical alerts for their matters |
| **System Admin** | IT / firm admin | User management, firm settings, audit logs |

---

## 5. Current State vs Target State

| Capability | Prototype (today) | Production (target) |
|---|---|---|
| Data storage | Browser localStorage | PostgreSQL, multi-user |
| Auth | None | JWT + RBAC |
| Rules engine | Client-side JS | Server-side service + DB rule configs |
| Alerts | Simulated HTML previews | Real email (SMTP/SES) + in-app notifications |
| Receipt upload | Mock OCR samples | File storage (S3/local) + OCR pipeline |
| Cron jobs | Manual button click | node-cron / BullMQ scheduled workers |
| Audit trail | Hardcoded logs | Immutable DB audit log |
| API | None | REST API (OpenAPI documented) |

---

## 6. Functional Requirements

### 6.1 Matter Management

| ID | Requirement | Priority |
|---|---|---|
| FR-M01 | Create, read, update, archive patent matters | P0 |
| FR-M02 | Assign lead attorney, supervising partner, client | P0 |
| FR-M03 | Track matter through 8 prosecution stages | P0 |
| FR-M04 | Support jurisdictions: IN, US, EP, WO (PCT) | P0 |
| FR-M05 | Store bibliographic data (app number, priority date, title, abstract) | P0 |
| FR-M06 | Link matters in patent families (parent/child) | P2 |
| FR-M07 | Full-text search across matters | P1 |
| FR-M08 | Bulk import/export (CSV) | P1 |

### 6.2 Statutory Rules Engine

| ID | Requirement | Priority |
|---|---|---|
| FR-R01 | Auto-generate deadlines on stage trigger events | P0 |
| FR-R02 | Support rules: 12M bar, 18M publication, RFE, FER/OA response, hearing submission, issue fee, annuities | P0 |
| FR-R03 | Jurisdiction-specific calculation (IN vs US vs EP) | P0 |
| FR-R04 | Extension calculation (e.g., FER +3 months Form 4) | P0 |
| FR-R05 | Mark statutory bars as non-extendable | P0 |
| FR-R06 | Admin-configurable rule parameters (e.g., RFE 31 vs 48 months) | P1 |
| FR-R07 | Holiday/weekend adjustment per jurisdiction | P2 |
| FR-R08 | Internal buffer deadlines (firm-set, ahead of statutory) | P1 |

**Rules to implement (Phase 1)** — ported from existing `rulesEngine.js`:

- `CONVENTION_12M_BAR` — 12-month priority bar
- `PCT_30_31M_NATIONAL_PHASE` — PCT national phase window
- `PUBLICATION_18M` — 18-month publication
- `RFE_DEADLINE_IN` — Request for Examination (India)
- `FER_RESPONSE_DUE` — FER / Office Action response
- `HEARING_WRITTEN_SUBMISSION` — 15-day post-hearing
- `GRANT_ISSUE_FEE` — Issue/grant fee payment
- `ANNUITY_YEAR_3` — Year 3 renewal
- `FORM_27_WORKING_STATEMENT` — India Form 27

### 6.3 Deadline Tracking & Urgency

| ID | Requirement | Priority |
|---|---|---|
| FR-D01 | Compute days remaining per deadline | P0 |
| FR-D02 | Classify urgency tiers: SAFE, T-30, T-15, T-5, DAILY_CRITICAL, OVERDUE | P0 |
| FR-D03 | Dashboard radar with live counts per tier | P0 |
| FR-D04 | Filter board by urgency, jurisdiction, attorney | P0 |
| FR-D05 | Deadline status: PENDING, CLEARED, OVERDUE, EXTENDED | P0 |
| FR-D06 | Record extension filings and extended due dates | P1 |

### 6.4 Zero-Fail Escalation & Alerts

| ID | Requirement | Priority |
|---|---|---|
| FR-A01 | Tier 1 (T-30): Amber advisory to lead attorney + paralegal | P0 |
| FR-A02 | Tier 2 (T-15): Orange warning to attorney + partner | P0 |
| FR-A03 | Tier 3 (T-5): Red critical to attorney + partner + client | P0 |
| FR-A04 | Tier 4 (T-4→T-0): Daily 08:00 & 16:00 countdown blitz | P0 |
| FR-A05 | In-app notification center | P0 |
| FR-A06 | Email delivery with HTML templates | P0 |
| FR-A07 | Notification audit log (sent, delivered, opened) | P1 |
| FR-A08 | User-configurable notification preferences | P2 |
| FR-A09 | Calendar sync (Outlook/Google) | P3 |

### 6.5 Government Proof Vault & Dual Verification

| ID | Requirement | Priority |
|---|---|---|
| FR-P01 | Upload filing receipts (PDF, image, text) | P0 |
| FR-P02 | Receipt types: CBR, USPTO EFS, EPO Form 1001, PCT, FER, hearing, issue fee, annuity | P0 |
| FR-P03 | Parse receipt metadata (app number, CBR number, fees, date) | P1 |
| FR-P04 | Link receipt to specific deadline | P0 |
| FR-P05 | Require dual-attorney sign-off before clearing deadline | P0 |
| FR-P06 | Prevent clearance without valid receipt | P0 |
| FR-P07 | Auto-advance matter stage on verified clearance | P0 |
| FR-P08 | Generate successor deadlines on stage advance | P0 |
| FR-P09 | Receipt vault browse/search view | P1 |

### 6.6 Auto-Docketing (OCR Intake)

| ID | Requirement | Priority |
|---|---|---|
| FR-O01 | Drop-zone receipt upload for new matter creation | P1 |
| FR-O02 | Extract: matter number, app number, title, client, jurisdiction, stage, dates | P1 |
| FR-O03 | Auto-calculate statutory deadlines from extracted trigger date | P1 |
| FR-O04 | Confirm & create matter in one click | P1 |
| FR-O05 | Support sample templates for demo/testing | P2 |

### 6.7 Board & Views

| ID | Requirement | Priority |
|---|---|---|
| FR-V01 | Main table view with collapsible urgency groups | P0 |
| FR-V02 | Kanban pipeline view by prosecution stage | P0 |
| FR-V03 | Matter detail drawer/modal | P0 |
| FR-V04 | Automations & email log view | P0 |
| FR-V05 | Receipts vault view | P0 |
| FR-V06 | Statutory rules calculator (standalone tool) | P1 |
| FR-V07 | CSV export of filtered matters | P1 |

### 6.8 User & Access Management

| ID | Requirement | Priority |
|---|---|---|
| FR-U01 | Email/password authentication | P0 |
| FR-U02 | Roles: Admin, Partner, Attorney, Paralegal, Read-Only | P0 |
| FR-U03 | Firm (tenant) isolation — multi-tenant SaaS | P1 |
| FR-U04 | SSO (SAML/OAuth) | P3 |

### 6.9 Audit & Compliance

| ID | Requirement | Priority |
|---|---|---|
| FR-X01 | Immutable audit log for all matter/deadline/receipt changes | P0 |
| FR-X02 | Record actor, timestamp, action, before/after state | P0 |
| FR-X03 | Audit log export for malpractice defense | P1 |

---

## 7. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-01 | API response time (p95) | < 300ms |
| NFR-02 | Dashboard load time | < 2s |
| NFR-03 | Concurrent users per firm | 50+ |
| NFR-04 | Matters per firm | 10,000+ |
| NFR-05 | Uptime | 99.9% |
| NFR-06 | Data encryption at rest | AES-256 |
| NFR-07 | Data encryption in transit | TLS 1.3 |
| NFR-08 | Backup frequency | Daily automated |
| NFR-09 | RPO / RTO | 24h / 4h |
| NFR-10 | Accessibility | WCAG 2.1 AA (Phase 2) |

---

## 8. User Stories (Epics)

### Epic 1: Matter Lifecycle
```
As a docket specialist,
I want to create a matter with jurisdiction and priority date,
So that statutory deadlines are automatically generated.
```

### Epic 2: Escalation Alerts
```
As a managing partner,
I want daily critical alerts for T-4→T-0 deadlines,
So that the firm never misses a statutory bar.
```

### Epic 3: Proof-First Clearance
```
As a senior attorney,
I want to upload a government CBR and get partner sign-off,
So that the deadline is defensibly cleared with audit proof.
```

### Epic 4: Auto-Docket from Receipt
```
As a paralegal,
I want to drop a filing receipt and auto-create a matter,
So that I can docket in seconds without manual typing.
```

### Epic 5: Firm Dashboard
```
As a managing partner,
I want a live urgency radar across all matters,
So that I can see firm-wide risk at a glance.
```

---

## 9. Technical Stack

| Component | Technology | Rationale |
|---|---|---|
| Frontend | React 18, TypeScript, Vite | Component model, ecosystem, team familiarity |
| UI Library | Tailwind CSS + shadcn/ui | Match monday.com aesthetic from prototype |
| State / Data | TanStack Query + Zustand | Server state caching + local UI state |
| Backend | Node.js, Express/Fastify, TypeScript | Same language as prototype logic port |
| Database | PostgreSQL 16 | Relational integrity for audit/compliance |
| ORM | Prisma | Type-safe migrations, good DX |
| Auth | JWT + refresh tokens, bcrypt | Standard for B2B SaaS |
| File Storage | Local (dev) → S3-compatible (prod) | Receipt PDFs |
| Email | Nodemailer → AWS SES / SendGrid | Escalation alerts |
| Job Queue | BullMQ + Redis | Cron scans, email dispatch |
| Validation | Zod | Shared schemas front/back |

---

## 10. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend (Vite)                     │
│  Board │ Kanban │ Receipts │ Automations │ Calculator │ Auth    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / REST API
┌────────────────────────────▼────────────────────────────────────┐
│                     Node.js API Server                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Auth     │ │ Matters  │ │ Rules    │ │ Notifications    │  │
│  │ Module   │ │ Module   │ │ Engine   │ │ Service          │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │ Receipts │ │ Audit    │ │ Cron     │                        │
│  │ Module   │ │ Logger   │ │ Worker   │                        │
│  └──────────┘ └──────────┘ └──────────┘                        │
└──────┬──────────────┬──────────────┬───────────────────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐
│ PostgreSQL  │ │ Redis     │ │ S3 / Local│
│ (primary)   │ │ (queues)  │ │ (files)   │
└─────────────┘ └───────────┘ └───────────┘
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed design.

---

## 11. Data Model Summary

Core entities: `Firm`, `User`, `Client`, `Matter`, `Deadline`, `Receipt`, `Verification`, `Notification`, `AuditLog`, `StatutoryRule`.

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for full schema.

---

## 12. API Summary

REST API under `/api/v1/` with JWT auth.

Key resource groups: `/auth`, `/matters`, `/deadlines`, `/receipts`, `/notifications`, `/rules`, `/users`, `/audit`.

See [API_SPECIFICATION.md](./API_SPECIFICATION.md) for full endpoint list.

---

## 13. Security Requirements

- Password hashing: bcrypt (cost factor 12)
- JWT access token (15 min) + refresh token (7 days)
- RBAC enforced on every endpoint
- Firm-level data isolation (row-level security or tenant_id filter)
- File upload: virus scan, type validation, size limit (10MB)
- Rate limiting on auth endpoints
- CORS restricted to frontend origin
- Audit log append-only (no UPDATE/DELETE)

---

## 14. Development Phases

| Phase | Duration | Deliverables |
|---|---|---|
| **Phase 0** | 2 weeks | Project scaffold, DB, auth, CI |
| **Phase 1** | 6 weeks | Matters, deadlines, rules engine, board UI |
| **Phase 2** | 4 weeks | Receipts, dual-verify, notifications, cron |
| **Phase 3** | 4 weeks | OCR auto-docket, calculator, export, polish |
| **Phase 4** | 4 weeks | Multi-tenant, client portal, integrations |
| **Deployment** | TBD | Cloud infra decision after Phase 2 |

See [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) for sprint breakdown.

---

## 15. Success Metrics (KPIs)

| Metric | Target (6 months post-launch) |
|---|---|
| Deadline clearance with proof | 100% |
| Missed statutory bars | 0 |
| Avg. time to docket new matter | < 2 minutes |
| Daily active users (pilot firm) | 80%+ of licensed seats |
| Alert delivery success rate | 99.5% |
| User satisfaction (NPS) | > 40 |

---

## 16. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Incorrect statutory rule | Critical — missed deadline | Legal review of rules; unit tests per rule; admin override |
| Email delivery failure | High — missed alert | Retry queue, fallback in-app alerts, delivery status tracking |
| Data breach | Critical | Encryption, RBAC, audit logs, penetration testing |
| Scope creep | Medium | Strict phase gates; MVP = Phase 1+2 |
| PTO rule changes | Medium | Versioned rule configs; admin update workflow |

---

## 17. Open Questions

1. Single-tenant (per firm install) vs multi-tenant SaaS for MVP?
2. OCR: build regex parser first or integrate Azure Document Intelligence?
3. India IPO API availability for auto-sync (Phase 3)?
4. Billing model: per-user vs per-matter vs flat firm fee?

---

## 18. Appendix: Prototype Feature Mapping

| Prototype file | Production module |
|---|---|
| `js/config/rulesEngine.js` | `backend/src/services/rulesEngine/` |
| `js/services/deadlineService.js` | `backend/src/services/deadlineService.ts` |
| `js/services/notificationService.js` | `backend/src/services/notificationService.ts` + worker |
| `js/services/receiptService.js` | `backend/src/services/receiptService.ts` |
| `js/services/receiptParserService.js` | `backend/src/services/receiptParserService.ts` |
| `js/store/mockData.js` | PostgreSQL seed data |
| `js/app.js` | `frontend/src/` React components |
| `css/main.css`, `css/components.css` | Tailwind + component library |

---

*Document owner: Product / Engineering*  
*Next review: After Phase 0 completion*
