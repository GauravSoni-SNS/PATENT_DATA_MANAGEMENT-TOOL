# System Architecture

**Stack:** React · Node.js · PostgreSQL  
**Deployment:** TBD (decided after core development)

---

## 1. Architecture Overview

LexPatent follows a **three-tier architecture**:

```
Client (React SPA)
    ↕ REST + JWT
API Server (Node.js)
    ↕ SQL          ↕ Redis         ↕ Object Storage
PostgreSQL         BullMQ           S3 / MinIO
```

### Design Principles

1. **Server-authoritative rules** — deadline calculations run on backend; frontend displays only
2. **Proof-first writes** — deadline clearance requires receipt + verification records
3. **Append-only audit** — all state changes logged immutably
4. **Async notifications** — cron scans and email dispatch via job queue
5. **Modular monolith** — single deployable API with clear module boundaries (microservices only if scale demands)

---

## 2. Repository Structure

```
PATENT_DATA_MANAGEMENT-TOOL/
├── backend/
│   ├── prisma/              # schema.prisma, seed.ts
│   ├── scripts/             # init-db, start-db, test-api
│   ├── src/
│   │   ├── config/          # Environment config
│   │   ├── lib/             # Prisma client
│   │   ├── middleware/      # Auth, validation, errors
│   │   ├── routes/          # REST API route handlers
│   │   ├── services/        # Rules engine, deadlines, notifications
│   │   ├── app.ts           # Express app factory
│   │   └── index.ts         # Server entry point
│   └── tests/               # Vitest unit tests
├── frontend/
│   └── src/
│       ├── api/             # Axios API client
│       ├── components/      # AppLayout, shared UI
│       ├── context/         # Auth provider
│       ├── pages/           # Board, Kanban, Receipts, etc.
│       └── styles/          # monday.com theme CSS
└── docs/                    # PRD, architecture, API spec, setup
```

---

## 3. Frontend Architecture (React)

### 3.1 Tech Choices

| Concern | Choice |
|---|---|
| Build tool | Vite |
| Language | TypeScript |
| Routing | React Router v6 |
| Server state | TanStack Query (React Query) |
| Client state | Zustand (filters, UI toggles) |
| Styling | Tailwind CSS |
| Components | shadcn/ui (customized to monday.com theme) |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Drag & drop (Kanban) | @dnd-kit/core |
| HTTP | Axios with interceptors for JWT refresh |

### 3.2 Page / Route Map

| Route | Page | Description |
|---|---|---|
| `/login` | LoginPage | Auth |
| `/` | DashboardPage | Redirect to `/board` |
| `/board` | BoardPage | Main table with urgency groups |
| `/kanban` | KanbanPage | Stage pipeline |
| `/automations` | AutomationsPage | Notification log + cron trigger |
| `/receipts` | ReceiptsPage | Government proof vault |
| `/calculator` | CalculatorPage | Statutory rules calculator |
| `/matters/:id` | MatterDetailPage | Full matter drawer (or modal) |
| `/settings` | SettingsPage | User prefs, firm config (admin) |
| `/audit` | AuditPage | Audit log viewer (admin/partner) |

### 3.3 Key Frontend Components

```
AppLayout
├── LeftRail              # Navigation (from prototype)
├── RadarBanner           # Live urgency counts + date simulator (dev)
├── BoardHeader           # Title, filters, action buttons
└── MainContent
    ├── MatterTable       # Collapsible urgency groups
    ├── KanbanBoard       # Stage columns
    ├── NotificationList  # Email log with HTML preview
    ├── ReceiptVault      # Grid of uploaded receipts
    ├── CalculatorForm    # Rules input → deadline output
    └── MatterDrawer      # Side panel for matter detail
        ├── DeadlineList
        ├── ReceiptUpload
        ├── VerificationPanel
        └── ActivityTimeline
```

### 3.4 State Management Strategy

| Data type | Where |
|---|---|
| Matters, deadlines, receipts | TanStack Query (server cache) |
| Auth user, tokens | Context + localStorage (refresh token httpOnly cookie) |
| UI filters, collapsed groups | Zustand |
| Form state | React Hook Form (local) |

### 3.5 API Client Pattern

```typescript
// frontend/src/api/matters.ts
export const mattersApi = {
  list: (filters: MatterFilters) => api.get('/matters', { params: filters }),
  get: (id: string) => api.get(`/matters/${id}`),
  create: (data: CreateMatterDto) => api.post('/matters', data),
  update: (id: string, data: UpdateMatterDto) => api.patch(`/matters/${id}`, data),
  clearDeadline: (matterId: string, deadlineId: string, payload: ClearDeadlineDto) =>
    api.post(`/matters/${matterId}/deadlines/${deadlineId}/clear`, payload),
};
```

---

## 4. Backend Architecture (Node.js)

### 4.1 Tech Choices

| Concern | Choice |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express.js (or Fastify for performance) |
| Language | TypeScript |
| ORM | Prisma |
| Validation | Zod |
| Auth | jsonwebtoken + bcrypt |
| File upload | multer → S3 SDK |
| Email | Nodemailer (dev) → AWS SES (prod) |
| Job queue | BullMQ |
| Scheduler | node-cron (triggers queue jobs) |
| Logging | pino |
| Testing | Vitest + Supertest |

### 4.2 Module Structure

Each module follows:

```
modules/matters/
├── matters.controller.ts   # HTTP handlers
├── matters.service.ts      # Business logic
├── matters.repository.ts   # Prisma queries (optional layer)
├── matters.routes.ts       # Express routes
├── matters.schema.ts       # Zod validation schemas
└── matters.types.ts        # TypeScript types
```

### 4.3 Core Services (ported from prototype)

#### Rules Engine Service
- Input: trigger event (e.g., `PROVISIONAL_FILED`), filing date, jurisdiction
- Output: array of generated deadline objects
- Rules stored in code (Phase 1) → DB config table (Phase 2+)
- Port from: `js/config/rulesEngine.js`

#### Deadline Service
- Enrich matter with nearest deadline, days remaining, urgency tier
- Port from: `js/services/deadlineService.js`

#### Notification Service
- Evaluate all matters against escalation tiers
- Generate notification records + email payloads
- Port from: `js/services/notificationService.js`

#### Receipt Service
- Upload, link to deadline, dual-verification workflow
- Port from: `js/services/receiptService.js`

#### Receipt Parser Service
- OCR/text extraction from government receipts
- Port from: `js/services/receiptParserService.js`

### 4.4 Middleware Stack

```
Request
  → cors()
  → helmet()
  → rateLimiter (auth routes)
  → requestLogger
  → authenticate (JWT verify) — except /auth/*
  → authorize (RBAC check)
  → validate (Zod schema)
  → controller
  → errorHandler
Response
```

### 4.5 RBAC Matrix

| Action | Admin | Partner | Attorney | Paralegal | Read-Only |
|---|---|---|---|---|---|
| View matters | ✅ | ✅ | ✅ (assigned + firm) | ✅ | ✅ |
| Create matter | ✅ | ✅ | ✅ | ✅ | ❌ |
| Upload receipt | ✅ | ✅ | ✅ | ✅ | ❌ |
| Dual-verify (sign-off) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Clear deadline | ✅ | ✅ | ✅ (with verify) | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ✅ | ❌ | ❌ | ❌ |
| Run cron manually | ✅ | ✅ | ❌ | ✅ | ❌ |

---

## 5. Database Architecture (PostgreSQL)

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for full schema.

### Key Design Decisions

1. **UUID primary keys** — safe for distributed IDs, no enumeration
2. **tenant_id on all firm-scoped tables** — multi-tenant ready
3. **Soft delete** on matters (`deleted_at`) — audit preservation
4. **JSONB** for flexible metadata (receipt parsed fields, rule params)
5. **Separate audit_log table** — append-only, no FK cascade delete
6. **Indexes** on: `deadlines.due_date`, `deadlines.status`, `matters.firm_id`, `notifications.created_at`

---

## 6. Background Jobs

### 6.1 Cron Scanner (`cronScanner`)

| Schedule | Action |
|---|---|
| Daily 08:00 (firm timezone) | Scan all active deadlines, generate escalation notifications |
| Daily 16:00 (firm timezone) | Repeat for T-4→T-0 daily countdown tier |
| Weekly Monday 08:00 | T-30 amber advisory digest |

Flow:
```
node-cron trigger
  → enqueue 'scan-deadlines' job (BullMQ)
  → worker: deadlineService.evaluateAll(matters)
  → worker: notificationService.generateAlerts()
  → enqueue 'send-email' jobs
  → emailDispatcher worker sends via SMTP/SES
  → write notification + audit records
```

### 6.2 Email Dispatcher

- Retry: 3 attempts with exponential backoff
- Dead letter queue for failed sends
- Store delivery status on notification record

---

## 7. File Storage

| Environment | Storage |
|---|---|
| Local dev | `./uploads/` directory |
| Production | S3-compatible (AWS S3 / MinIO / DigitalOcean Spaces) |

Receipt file path pattern:
```
{firm_id}/receipts/{matter_id}/{receipt_id}.{ext}
```

---

## 8. Authentication Flow

```
1. POST /auth/login { email, password }
2. Server validates → returns { accessToken (15m), refreshToken (7d, httpOnly cookie) }
3. Frontend stores accessToken in memory
4. API requests: Authorization: Bearer {accessToken}
5. On 401 → POST /auth/refresh (cookie) → new accessToken
6. On refresh fail → redirect to /login
```

---

## 9. Local Development Setup

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: lexpatent
      POSTGRES_USER: lexpatent
      POSTGRES_PASSWORD: devpassword

  redis:
    image: redis:7
    ports: ["6379:6379"]

  minio:
    image: minio/minio
    ports: ["9000:9000"]
    command: server /data
```

```bash
# Start infra
docker compose up -d

# Backend
cd backend && npm install && npx prisma migrate dev && npm run dev

# Frontend
cd frontend && npm install && npm run dev

# Worker (separate terminal)
cd backend && npm run worker
```

---

## 10. Deployment (TBD)

Deployment strategy will be decided after Phase 2 development. Options under consideration:

| Option | Pros | Cons |
|---|---|---|
| **AWS (ECS + RDS + S3)** | Scalable, managed DB | Cost, complexity |
| **Railway / Render** | Fast deploy, managed | Less control |
| **DigitalOcean App Platform** | Simple, affordable | Limited scale |
| **Self-hosted (Docker on VPS)** | Data sovereignty (India firms) | Ops burden |

Placeholder checklist for when deployment is planned:

- [ ] Choose cloud provider
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Environment secrets management
- [ ] SSL/TLS certificates
- [ ] Database backups & restore testing
- [ ] Monitoring (health checks, error tracking)
- [ ] Staging environment

---

## 11. Migration from Prototype

| Step | Action |
|---|---|
| 1 | Port `rulesEngine.js` → TypeScript service with unit tests |
| 2 | Port `deadlineService.js`, `notificationService.js`, etc. |
| 3 | Seed DB from `mockData.js` content |
| 4 | Rebuild UI components in React matching existing CSS design tokens |
| 5 | Wire React to API replacing localStorage calls |
| 6 | Archive prototype in `legacy/` folder |

---

## 12. Testing Strategy

| Layer | Tool | Coverage target |
|---|---|---|
| Rules engine unit tests | Vitest | 100% of statutory rules |
| API integration tests | Supertest | All P0 endpoints |
| Frontend component tests | Vitest + Testing Library | Critical flows |
| E2E | Playwright | Login → create matter → upload receipt → verify |

Existing `test_docket.js` logic should be migrated to `backend/tests/rulesEngine.test.ts`.
