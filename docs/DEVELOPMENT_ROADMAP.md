# Development Roadmap

End-to-end build plan for LexPatent Docket Radar production system.  
**Stack:** React · Node.js · PostgreSQL  
**Deployment:** Decided after Phase 2

---

## Timeline Overview

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Deployment
(2 wks)     (6 wks)     (4 wks)     (4 wks)     (4 wks)     (TBD)
 Scaffold    Core MVP    Alerts &    OCR &       Scale &
             Matters     Proof       Polish      Integrate
```

**Total estimated duration:** 20 weeks to production-ready MVP

---

## Phase 0: Foundation (Weeks 1–2)

**Goal:** Project scaffold, database, auth, CI pipeline.

### Week 1 — Repository & Infrastructure

| Task | Owner | Deliverable |
|---|---|---|
| Initialize monorepo structure (`frontend/`, `backend/`, `shared/`) | Backend | Folder structure |
| Set up `docker-compose.yml` (Postgres, Redis, MinIO) | Backend | Local dev infra |
| Initialize Prisma schema with all P0 tables | Backend | `schema.prisma` + initial migration |
| Seed database from prototype mock data | Backend | `prisma/seed.ts` |
| Set up Express/Fastify with TypeScript | Backend | `backend/src/app.ts` |
| Configure ESLint, Prettier, Husky pre-commit | Both | Linting pipeline |
| Initialize React + Vite + TypeScript | Frontend | `frontend/` scaffold |
| Configure Tailwind + shadcn/ui with monday.com theme tokens | Frontend | Design system base |

### Week 2 — Authentication & CI

| Task | Owner | Deliverable |
|---|---|---|
| Implement auth module (login, refresh, logout, me) | Backend | `/auth/*` endpoints |
| JWT middleware + RBAC authorize middleware | Backend | Auth guards |
| Create User CRUD (admin only) | Backend | `/users/*` endpoints |
| Login page + auth context + protected routes | Frontend | Auth flow working |
| GitHub Actions: lint + test on PR | Both | CI pipeline |
| Port `test_docket.js` rules tests to Vitest | Backend | `rulesEngine.test.ts` passing |

**Phase 0 Exit Criteria:**
- [ ] `docker compose up` starts Postgres + Redis
- [ ] Login works end-to-end (frontend → API → DB)
- [ ] Seed data visible after login
- [ ] CI passes on main branch

---

## Phase 1: Core MVP (Weeks 3–8)

**Goal:** Matters, deadlines, rules engine, board UI — the heart of the docket.

### Week 3 — Rules Engine & Deadline Service

| Task | Owner | Deliverable |
|---|---|---|
| Port `rulesEngine.js` to TypeScript service | Backend | `services/rulesEngine/` |
| Port `deadlineService.js` to TypeScript | Backend | `services/deadlineService.ts` |
| Unit tests for all 9 statutory rules (IN/US/EP) | Backend | 100% rule coverage |
| POST `/rules/calculate` endpoint | Backend | Calculator API |
| Client CRUD endpoints | Backend | `/clients/*` |

### Week 4 — Matter CRUD

| Task | Owner | Deliverable |
|---|---|---|
| Matter create with auto-deadline generation | Backend | POST `/matters` |
| Matter list with filters + enrichment | Backend | GET `/matters` |
| Matter detail with deadlines | Backend | GET `/matters/:id` |
| Matter update + soft delete | Backend | PATCH, DELETE |
| Audit log service (append-only) | Backend | Audit on all writes |

### Week 5 — Board UI (Table View)

| Task | Owner | Deliverable |
|---|---|---|
| App layout (left rail, radar banner, header) | Frontend | `AppLayout` component |
| Matter table with collapsible urgency groups | Frontend | `BoardPage` |
| Urgency badges, timeline pills, status blocks | Frontend | Match prototype design |
| Filter toolbar (search, urgency, jurisdiction, attorney) | Frontend | Working filters |
| TanStack Query integration for matters API | Frontend | Data fetching layer |

### Week 6 — Matter Detail & Kanban

| Task | Owner | Deliverable |
|---|---|---|
| Matter detail drawer (deadlines, activity) | Frontend | `MatterDrawer` |
| Create matter form/modal | Frontend | New matter flow |
| Kanban pipeline view by stage | Frontend | `KanbanPage` |
| Radar banner with live urgency counts | Frontend | GET `/notifications/radar` |
| Stage advance UI | Frontend | Trigger stage change |

### Week 7 — Dashboard & Export

| Task | Owner | Deliverable |
|---|---|---|
| GET `/dashboard/summary` endpoint | Backend | Dashboard metrics |
| CSV export endpoint | Backend | GET `/matters/export` |
| Export button in board header | Frontend | Download CSV |
| Loading states, error handling, empty states | Frontend | UX polish |
| Responsive layout (tablet+) | Frontend | Basic responsive |

### Week 8 — Phase 1 Hardening

| Task | Owner | Deliverable |
|---|---|---|
| API integration tests (Supertest) | Backend | All P0 endpoints tested |
| Frontend component tests for board | Frontend | Critical path coverage |
| Bug fixes and UX refinements | Both | Stable demo |
| Internal demo with seed data | Both | Stakeholder review |

**Phase 1 Exit Criteria:**
- [ ] Create matter → deadlines auto-generated correctly
- [ ] Board shows urgency groups with accurate counts
- [ ] Kanban view works with drag (optional) or click to advance
- [ ] CSV export downloads filtered matters
- [ ] All rules engine tests pass

---

## Phase 2: Alerts & Proof (Weeks 9–12)

**Goal:** Notification escalation, receipt upload, dual verification — the zero-fail differentiators.

### Week 9 — Notification Service

| Task | Owner | Deliverable |
|---|---|---|
| Port `notificationService.js` to TypeScript | Backend | Escalation logic |
| BullMQ setup + Redis connection | Backend | Job queue infra |
| Cron scanner worker (08:00 & 16:00) | Backend | `workers/cronScanner.ts` |
| POST `/notifications/scan` manual trigger | Backend | Dev/testing endpoint |
| Notification list API | Backend | GET `/notifications` |
| Email HTML template generation | Backend | Email previews |

### Week 10 — Email Delivery

| Task | Owner | Deliverable |
|---|---|---|
| Email dispatcher worker | Backend | `workers/emailDispatcher.ts` |
| Nodemailer integration (dev SMTP) | Backend | Emails actually send in dev |
| Notification + audit records on send | Backend | Delivery tracking |
| Automations page (notification log) | Frontend | `AutomationsPage` |
| Email HTML preview component | Frontend | Render notification body |
| "Run Cron Scan" button | Frontend | Manual trigger |

### Week 11 — Receipt Vault & Upload

| Task | Owner | Deliverable |
|---|---|---|
| File upload service (multer → local/S3) | Backend | POST `/receipts/upload` |
| Port `receiptService.js` to TypeScript | Backend | Receipt CRUD + linking |
| Receipt vault API + list endpoint | Backend | GET `/receipts` |
| Receipt upload UI in matter drawer | Frontend | Upload form |
| Receipts vault page | Frontend | `ReceiptsPage` |
| File preview (PDF/image) | Frontend | Receipt viewer |

### Week 12 — Dual Verification & Clearance

| Task | Owner | Deliverable |
|---|---|---|
| Verification workflow (create, approve, reject) | Backend | `/verifications/*` |
| Deadline clearance with proof enforcement | Backend | POST `.../clear` |
| Stage auto-advance on verified clearance | Backend | Business logic |
| Pending verifications dashboard (Partner) | Frontend | Verification queue |
| Dual sign-off UI | Frontend | Approve/reject buttons |
| Clear deadline flow (upload → verify → clear) | Frontend | End-to-end workflow |

**Phase 2 Exit Criteria:**
- [ ] Cron scan generates correct tier notifications
- [ ] Emails send in dev environment
- [ ] Upload receipt → partner verifies → deadline clears
- [ ] Cannot clear deadline without approved verification
- [ ] Stage advances and new deadlines generated on clearance
- [ ] Full audit trail for all actions

---

## Phase 3: OCR & Polish (Weeks 13–16)

**Goal:** Auto-docketing from receipts, rules calculator, production polish.

### Week 13 — Receipt Parser (OCR)

| Task | Owner | Deliverable |
|---|---|---|
| Port `receiptParserService.js` to TypeScript | Backend | Regex extraction |
| POST `/receipts/auto-docket` (parse preview) | Backend | Auto-docket API |
| POST `/receipts/auto-docket/confirm` | Backend | Confirm & create |
| Auto-docket modal with sample chips | Frontend | Drop receipt UI |
| Parsed field preview + edit before confirm | Frontend | Confirmation step |

### Week 14 — Rules Calculator

| Task | Owner | Deliverable |
|---|---|---|
| Calculator page UI | Frontend | `CalculatorPage` |
| Jurisdiction + trigger event selectors | Frontend | Interactive form |
| Display computed deadlines with statute refs | Frontend | Results table |
| Date simulator (dev tool) | Frontend | Override "today" for testing |

### Week 15 — UX Polish & Performance

| Task | Owner | Deliverable |
|---|---|---|
| Loading skeletons, optimistic updates | Frontend | Perceived performance |
| Toast notifications for actions | Frontend | User feedback |
| Keyboard shortcuts (search, navigate) | Frontend | Power user features |
| API response caching strategy | Frontend | TanStack Query tuning |
| Database query optimization + indexes | Backend | < 300ms p95 |
| Error boundary + fallback UI | Frontend | Graceful failures |

### Week 16 — Testing & Documentation

| Task | Owner | Deliverable |
|---|---|---|
| E2E tests with Playwright (5 critical flows) | Both | Automated E2E |
| API documentation (OpenAPI/Swagger) | Backend | `/api/docs` |
| Update user journey guide for production | Both | `docs/USER_GUIDE.md` |
| Security review (auth, RBAC, file upload) | Backend | Security checklist |
| Performance testing (100 matters, 50 users) | Backend | Load test report |

**Phase 3 Exit Criteria:**
- [ ] Drop receipt → auto-create matter in < 30 seconds
- [ ] Rules calculator matches rules engine output
- [ ] E2E tests pass for all critical flows
- [ ] Performance targets met

---

## Phase 4: Scale & Integrate (Weeks 17–20)

**Goal:** Multi-tenant, client portal, external integrations.

### Week 17 — Multi-Tenant

| Task | Deliverable |
|---|---|
| Firm registration + onboarding flow | Self-service firm setup |
| Tenant isolation enforcement | All queries scoped by firm_id |
| Firm settings page (timezone, alert config) | Admin settings UI |
| Per-firm cron scheduling | Timezone-aware scans |

### Week 18 — Client Portal (Read-Only)

| Task | Deliverable |
|---|---|
| Client user role + limited access | Client login |
| Client dashboard (their matters only) | Client-facing view |
| Client notification preferences | Opt-in/out for T-5 alerts |

### Week 19 — Integrations (Foundation)

| Task | Deliverable |
|---|---|
| Calendar export (iCal feed for deadlines) | `/matters/ical` |
| Webhook framework (outbound events) | Webhook config UI |
| USPTO Patent Center polling (research/spike) | Integration design doc |
| Outlook/Gmail calendar sync (research) | Integration design doc |

### Week 20 — Pre-Production

| Task | Deliverable |
|---|---|
| Choose deployment platform | Deployment decision doc |
| Staging environment setup | Staging URL |
| Database backup/restore procedure | Ops runbook |
| Monitoring + error tracking (Sentry) | Alerting setup |
| Pilot firm onboarding plan | Go-live checklist |

**Phase 4 Exit Criteria:**
- [ ] Two firms can operate independently on same deployment
- [ ] Client portal accessible for external users
- [ ] Staging environment running
- [ ] Deployment plan documented

---

## Deployment (Post Phase 2 — Decision Point)

Deployment will be planned after Phase 2 when core functionality is proven. Evaluation criteria:

| Criterion | Weight |
|---|---|
| Data residency (India compliance) | High |
| Cost at 10-firm scale | High |
| Ops complexity | Medium |
| Auto-scaling | Medium |
| Managed PostgreSQL | High |

**Candidate platforms:**

1. **AWS** — ECS Fargate + RDS PostgreSQL + S3 + SES (enterprise-grade)
2. **Railway** — Fast deploy, managed Postgres (startup-friendly)
3. **DigitalOcean** — App Platform + Managed DB (cost-effective)
4. **Self-hosted VPS** — Docker Compose on Indian VPS (data sovereignty)

**Deployment deliverables (when decided):**

- [ ] Production infrastructure as code (Terraform/Pulumi)
- [ ] CI/CD: GitHub Actions → staging → production
- [ ] SSL certificates (Let's Encrypt / ACM)
- [ ] Environment secrets (AWS Secrets Manager / Vault)
- [ ] Database backup automation
- [ ] Health check monitoring + uptime alerts
- [ ] CDN for frontend static assets

---

## Team Structure (Suggested)

| Role | Count | Phases |
|---|---|---|
| Full-stack lead | 1 | All |
| Frontend developer | 1 | 1–4 |
| Backend developer | 1 | 0–4 |
| UI/UX designer | 0.5 | 1, 3 |
| IP domain advisor (part-time) | 0.25 | 1, 2 (rules validation) |
| DevOps (part-time) | 0.25 | 0, 4, deployment |

**Minimum viable team:** 2 full-stack developers

---

## Risk Register

| Risk | Phase | Mitigation |
|---|---|---|
| Rules engine inaccuracy | 1 | IP advisor review; exhaustive unit tests |
| Scope creep | All | Strict phase gates; defer P3 features |
| Email deliverability | 2 | Use established provider (SES); SPF/DKIM setup |
| OCR accuracy | 3 | Start with regex; add AI later |
| Solo developer burnout | All | Phase 1+2 is shippable MVP; defer Phase 4 |

---

## Definition of Done (MVP = Phase 1 + 2)

The MVP is ready for pilot firm deployment when:

1. ✅ Users can log in with role-based access
2. ✅ Matters created with auto-generated statutory deadlines
3. ✅ Board shows urgency-grouped matters with live radar
4. ✅ Cron generates tiered escalation notifications
5. ✅ Emails delivered to attorneys/partners
6. ✅ Receipts uploaded and stored
7. ✅ Dual verification required before deadline clearance
8. ✅ Stage advancement generates successor deadlines
9. ✅ Immutable audit log for all actions
10. ✅ CSV export of docket data

---

## Milestone Summary

| Milestone | Week | Demo-able |
|---|---|---|
| M0: Auth working | 2 | Login → empty dashboard |
| M1: Board with matters | 6 | Full table view with urgency groups |
| M2: Zero-fail workflow | 12 | Upload → verify → clear → alert |
| M3: Auto-docket | 14 | Drop receipt → matter created |
| M4: Pilot ready | 20 | Multi-tenant staging deployment |

---

*Next action: Begin Phase 0 — initialize repository structure and docker-compose.*
