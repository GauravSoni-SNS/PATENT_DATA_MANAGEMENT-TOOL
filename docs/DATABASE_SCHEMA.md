# Database Schema — PostgreSQL

**ORM:** Prisma  
**Database:** PostgreSQL 16+

---

## 1. Entity Relationship Diagram

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│   Firm   │──1:N──│   User   │       │  Client  │
└────┬─────┘       └────┬─────┘       └────┬─────┘
     │                  │                   │
     │                  │                   │
     └────────┬─────────┴─────────┬─────────┘
              │                   │
         ┌────▼─────┐        ┌────▼─────┐
         │  Matter  │──1:N───│ Deadline │
         └────┬─────┘        └────┬─────┘
              │                   │
         ┌────▼─────┐        ┌────▼─────┐
         │ Receipt  │──1:1───│Verification│
         └──────────┘        └──────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Notification │    │  AuditLog    │    │ StatutoryRule│
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 2. Enums

```sql
CREATE TYPE user_role AS ENUM ('ADMIN', 'PARTNER', 'ATTORNEY', 'PARALEGAL', 'READ_ONLY');

CREATE TYPE matter_status AS ENUM ('ACTIVE', 'GRANTED', 'ABANDONED', 'ARCHIVED');

CREATE TYPE prosecution_stage AS ENUM (
  'INTAKE', 'PROVISIONAL', 'COMPLETE', 'PUBLICATION_RFE',
  'EXAMINATION_FER', 'HEARING', 'ALLOWANCE_GRANT', 'ANNUITY_MAINTENANCE'
);

CREATE TYPE jurisdiction_code AS ENUM ('IN', 'US', 'EP', 'WO');

CREATE TYPE deadline_status AS ENUM ('PENDING', 'CLEARED', 'OVERDUE', 'EXTENDED');

CREATE TYPE urgency_tier AS ENUM (
  'SAFE_UPCOMING', 'T_30_ADVISORY', 'T_15_URGENT',
  'T_5_CRITICAL', 'DAILY_CRITICAL', 'OVERDUE'
);

CREATE TYPE receipt_type AS ENUM (
  'PROVISIONAL_FILING_CBR', 'COMPLETE_FILING_CBR', 'USPTO_EFS_ACK',
  'EPO_ONLINE_FILING_ACK', 'PCT_RECEIPT', 'FER_RESPONSE_CBR',
  'HEARING_SUBMISSION_CBR', 'ISSUE_FEE_RECEIPT', 'OFFICIAL_GRANT_CERTIFICATE',
  'ANNUITY_RECEIPT', 'FORM_18_RECEIPT', 'FORM_27_RECEIPT'
);

CREATE TYPE verification_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TYPE notification_tier AS ENUM (
  'T_30_ADVISORY', 'T_15_URGENT', 'T_5_CRITICAL', 'DAILY_COUNTDOWN'
);

CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');
```

---

## 3. Table Definitions

### 3.1 firms

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| name | VARCHAR(255) | NOT NULL | Law firm name |
| slug | VARCHAR(100) | UNIQUE, NOT NULL | URL-safe identifier |
| timezone | VARCHAR(50) | DEFAULT 'Asia/Kolkata' | For cron scheduling |
| settings | JSONB | DEFAULT '{}' | Firm-level config |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

### 3.2 users

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| firm_id | UUID | FK → firms.id, NOT NULL | |
| email | VARCHAR(255) | UNIQUE, NOT NULL | |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt |
| first_name | VARCHAR(100) | NOT NULL | |
| last_name | VARCHAR(100) | NOT NULL | |
| role | user_role | NOT NULL | |
| specialization | VARCHAR(255) | | |
| avatar_url | TEXT | | |
| is_active | BOOLEAN | DEFAULT TRUE | |
| last_login_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(firm_id)`, `(email)`, `(firm_id, role)`

### 3.3 clients

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| firm_id | UUID | FK → firms.id, NOT NULL | |
| name | VARCHAR(255) | NOT NULL | |
| code | VARCHAR(20) | | Short code e.g. "SYN-Q" |
| contact_person | VARCHAR(255) | | |
| contact_email | VARCHAR(255) | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(firm_id)`, `(firm_id, code)`

### 3.4 matters

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| firm_id | UUID | FK → firms.id, NOT NULL | |
| client_id | UUID | FK → clients.id | |
| matter_number | VARCHAR(50) | NOT NULL | e.g. IN-2025-PAT-00941 |
| title | TEXT | NOT NULL | Invention title |
| jurisdiction | jurisdiction_code | NOT NULL | |
| application_type | VARCHAR(100) | | Provisional, Complete, PCT |
| official_app_number | VARCHAR(50) | | |
| priority_date | DATE | | |
| filing_date | DATE | | |
| current_stage | prosecution_stage | NOT NULL | |
| status | matter_status | DEFAULT 'ACTIVE' | |
| lead_attorney_id | UUID | FK → users.id | |
| supervising_partner_id | UUID | FK → users.id | |
| abstract | TEXT | | |
| parent_matter_id | UUID | FK → matters.id | Patent family link |
| metadata | JSONB | DEFAULT '{}' | Flexible extra fields |
| deleted_at | TIMESTAMPTZ | | Soft delete |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(firm_id)`, `(firm_id, status)`, `(firm_id, current_stage)`, `(lead_attorney_id)`, `(matter_number)`, `(priority_date)`

**Unique:** `(firm_id, matter_number)`

### 3.5 deadlines

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| matter_id | UUID | FK → matters.id, NOT NULL, ON DELETE CASCADE | |
| rule_id | VARCHAR(50) | NOT NULL | e.g. CONVENTION_12M_BAR |
| title | VARCHAR(255) | NOT NULL | |
| description | TEXT | | |
| statutory_due_date | DATE | NOT NULL | |
| extended_due_date | DATE | | After extension filed |
| is_statutory_bar | BOOLEAN | DEFAULT FALSE | |
| is_extendable | BOOLEAN | DEFAULT FALSE | |
| max_extension_months | INT | | |
| extension_procedure | TEXT | | |
| statutory_section | VARCHAR(255) | | e.g. Section 9(1) |
| required_receipt_type | receipt_type | | |
| status | deadline_status | DEFAULT 'PENDING' | |
| urgency_tier | urgency_tier | | Computed, cached |
| days_remaining | INT | | Computed, cached |
| cleared_at | TIMESTAMPTZ | | |
| cleared_by_id | UUID | FK → users.id | |
| notes | TEXT | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(matter_id)`, `(statutory_due_date)`, `(status)`, `(statutory_due_date, status)` — critical for cron scans

### 3.6 receipts

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| matter_id | UUID | FK → matters.id, NOT NULL | |
| deadline_id | UUID | FK → deadlines.id | Linked deadline |
| receipt_type | receipt_type | NOT NULL | |
| file_name | VARCHAR(255) | NOT NULL | Original filename |
| file_path | TEXT | NOT NULL | S3/local path |
| file_size | INT | | Bytes |
| mime_type | VARCHAR(100) | | |
| cbr_number | VARCHAR(100) | | Extracted CBR/transaction ID |
| official_fees | DECIMAL(12,2) | | |
| currency | VARCHAR(3) | | INR, USD, EUR |
| transaction_date | TIMESTAMPTZ | | From receipt |
| parsed_data | JSONB | DEFAULT '{}' | Full OCR extraction |
| uploaded_by_id | UUID | FK → users.id, NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(matter_id)`, `(deadline_id)`, `(cbr_number)`

### 3.7 verifications

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| receipt_id | UUID | FK → receipts.id, NOT NULL | |
| deadline_id | UUID | FK → deadlines.id, NOT NULL | |
| status | verification_status | DEFAULT 'PENDING' | |
| verified_by_id | UUID | FK → users.id | Partner who signed off |
| verified_at | TIMESTAMPTZ | | |
| rejection_reason | TEXT | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(deadline_id)`, `(status)`

### 3.8 notifications

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| firm_id | UUID | FK → firms.id, NOT NULL | |
| matter_id | UUID | FK → matters.id | |
| deadline_id | UUID | FK → deadlines.id | |
| tier | notification_tier | NOT NULL | |
| tier_label | VARCHAR(100) | | Human-readable |
| subject | TEXT | NOT NULL | Email subject |
| body_html | TEXT | | Rendered email HTML |
| recipients | JSONB | NOT NULL | [{name, email, role}] |
| days_remaining | INT | | At time of send |
| status | notification_status | DEFAULT 'PENDING' | |
| sent_at | TIMESTAMPTZ | | |
| is_emergency | BOOLEAN | DEFAULT FALSE | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(firm_id, created_at DESC)`, `(matter_id)`, `(status)`, `(tier, created_at)`

### 3.9 audit_logs

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| firm_id | UUID | FK → firms.id, NOT NULL | |
| user_id | UUID | FK → users.id | Actor (null for system) |
| entity_type | VARCHAR(50) | NOT NULL | matter, deadline, receipt, etc. |
| entity_id | UUID | NOT NULL | |
| action | VARCHAR(50) | NOT NULL | CREATE, UPDATE, CLEAR, VERIFY, etc. |
| before_state | JSONB | | Snapshot before change |
| after_state | JSONB | | Snapshot after change |
| ip_address | INET | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | **Append-only — no UPDATE/DELETE** |

**Indexes:** `(firm_id, created_at DESC)`, `(entity_type, entity_id)`, `(user_id)`

### 3.10 statutory_rules (Phase 2 — configurable rules)

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| rule_id | VARCHAR(50) | UNIQUE, NOT NULL | e.g. CONVENTION_12M_BAR |
| trigger_event | VARCHAR(50) | NOT NULL | e.g. PROVISIONAL_FILED |
| stage | prosecution_stage | | |
| title | VARCHAR(255) | NOT NULL | |
| description | TEXT | | |
| jurisdictions | jurisdiction_code[] | | Applicable jurisdictions |
| calculation_type | VARCHAR(20) | NOT NULL | ADD_MONTHS, ADD_DAYS, ADD_YEARS |
| calculation_value | INT | NOT NULL | e.g. 12 for 12 months |
| is_statutory_bar | BOOLEAN | DEFAULT FALSE | |
| is_extendable | BOOLEAN | DEFAULT FALSE | |
| max_extension_months | INT | | |
| required_receipt_type | receipt_type | | |
| statutory_section | JSONB | | Per-jurisdiction statute refs |
| version | INT | DEFAULT 1 | Rule version for audit |
| effective_from | DATE | | |
| is_active | BOOLEAN | DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

### 3.11 refresh_tokens

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | |
| token_hash | VARCHAR(255) | NOT NULL | Hashed refresh token |
| expires_at | TIMESTAMPTZ | NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(user_id)`, `(token_hash)`

---

## 4. Prisma Schema (Reference)

```prisma
// backend/prisma/schema.prisma (abbreviated)

model Firm {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  timezone  String   @default("Asia/Kolkata")
  settings  Json     @default("{}")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  users         User[]
  clients       Client[]
  matters       Matter[]
  notifications Notification[]
  auditLogs     AuditLog[]

  @@map("firms")
}

model Matter {
  id                   String            @id @default(uuid())
  firmId               String            @map("firm_id")
  clientId             String?           @map("client_id")
  matterNumber         String            @map("matter_number")
  title                String
  jurisdiction         JurisdictionCode
  currentStage         ProsecutionStage  @map("current_stage")
  status               MatterStatus      @default(ACTIVE)
  leadAttorneyId       String?           @map("lead_attorney_id")
  supervisingPartnerId String?           @map("supervising_partner_id")
  priorityDate         DateTime?         @map("priority_date") @db.Date
  filingDate           DateTime?         @map("filing_date") @db.Date
  officialAppNumber    String?           @map("official_app_number")
  abstract             String?
  parentMatterId       String?           @map("parent_matter_id")
  deletedAt            DateTime?         @map("deleted_at")
  createdAt            DateTime          @default(now()) @map("created_at")
  updatedAt            DateTime          @updatedAt @map("updated_at")

  firm       Firm       @relation(fields: [firmId], references: [id])
  client     Client?    @relation(fields: [clientId], references: [id])
  deadlines  Deadline[]
  receipts   Receipt[]

  @@unique([firmId, matterNumber])
  @@index([firmId, status])
  @@map("matters")
}

model Deadline {
  id               String          @id @default(uuid())
  matterId         String          @map("matter_id")
  ruleId           String          @map("rule_id")
  title            String
  statutoryDueDate DateTime        @map("statutory_due_date") @db.Date
  status           DeadlineStatus  @default(PENDING)
  isStatutoryBar   Boolean         @default(false) @map("is_statutory_bar")
  isExtendable     Boolean         @default(false) @map("is_extendable")
  extendedDueDate  DateTime?       @map("extended_due_date") @db.Date
  urgencyTier      UrgencyTier?    @map("urgency_tier")
  daysRemaining    Int?            @map("days_remaining")
  clearedAt        DateTime?       @map("cleared_at")

  matter Matter @relation(fields: [matterId], references: [id], onDelete: Cascade)

  @@index([statutoryDueDate, status])
  @@map("deadlines")
}
```

---

## 5. Seed Data

Port from existing `js/store/mockData.js`:

- 1 firm: "LexPatent IP LLP"
- 4 users (attorneys from ATTORNEYS array)
- 3–4 clients
- 5–6 matters with realistic deadlines
- Sample notifications and audit entries

```bash
npx prisma db seed
```

---

## 6. Key Queries

### Active deadlines needing escalation (cron scan)

```sql
SELECT d.*, m.matter_number, m.title, m.lead_attorney_id
FROM deadlines d
JOIN matters m ON d.matter_id = m.id
WHERE m.firm_id = $1
  AND m.deleted_at IS NULL
  AND m.status = 'ACTIVE'
  AND d.status = 'PENDING'
  AND d.statutory_due_date >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY d.statutory_due_date ASC;
```

### Urgency radar counts

```sql
SELECT urgency_tier, COUNT(*)
FROM deadlines d
JOIN matters m ON d.matter_id = m.id
WHERE m.firm_id = $1 AND d.status = 'PENDING'
GROUP BY urgency_tier;
```

### Matters with uncleared overdue deadlines

```sql
SELECT m.*, d.title AS deadline_title, d.statutory_due_date
FROM matters m
JOIN deadlines d ON d.matter_id = m.id
WHERE m.firm_id = $1
  AND d.status = 'OVERDUE'
  AND m.deleted_at IS NULL;
```

---

## 7. Migration Strategy

| Step | Action |
|---|---|
| 1 | Create initial migration with all P0 tables |
| 2 | Seed with prototype mock data |
| 3 | Add `statutory_rules` table in Phase 2 |
| 4 | Add `parent_matter_id` family links in Phase 3 |
| 5 | Row-level security policies if multi-tenant hard isolation needed |

---

## 8. Backup & Retention

| Data | Retention |
|---|---|
| Matters (active) | Indefinite |
| Matters (archived) | 7 years minimum (malpractice statute) |
| Audit logs | 10 years, append-only |
| Notifications | 3 years |
| Receipt files | Life of matter + 7 years |
| Refresh tokens | Auto-purge on expiry |
