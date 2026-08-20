# API Specification

**Base URL:** `/api/v1`  
**Auth:** Bearer JWT (except `/auth/*`)  
**Format:** JSON  
**Version:** 1.0

---

## 1. Conventions

### Request Headers

```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### Standard Response Envelope

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "DEADLINE_NOT_FOUND",
    "message": "Deadline with id abc-123 not found",
    "status": 404
  }
}
```

### Pagination Query Params

```
?page=1&limit=20&sort=statutoryDueDate&order=asc
```

---

## 2. Authentication

### POST `/auth/login`

Login with email and password.

**Request:**
```json
{
  "email": "s.jenkins@lexpatent-ip.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "user": {
      "id": "usr-01",
      "email": "s.jenkins@lexpatent-ip.com",
      "firstName": "Sarah",
      "lastName": "Jenkins",
      "role": "ATTORNEY",
      "firmId": "firm-01"
    }
  }
}
```

**Side effect:** Sets `refreshToken` as httpOnly cookie.

---

### POST `/auth/refresh`

Refresh access token using httpOnly cookie.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG..."
  }
}
```

---

### POST `/auth/logout`

Invalidate refresh token.

**Response (200):**
```json
{ "success": true, "data": { "message": "Logged out" } }
```

---

### GET `/auth/me`

Get current authenticated user.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "usr-01",
    "email": "s.jenkins@lexpatent-ip.com",
    "firstName": "Sarah",
    "lastName": "Jenkins",
    "role": "ATTORNEY",
    "specialization": "AI, Cryptography & Computer Systems",
    "avatarUrl": "https://..."
  }
}
```

---

## 3. Matters

### GET `/matters`

List matters with filters.

**Query params:**
| Param | Type | Description |
|---|---|---|
| search | string | Full-text search on title, matter number |
| urgency | string | T_30_ADVISORY, T_15_URGENT, T_5_CRITICAL, DAILY_CRITICAL, OVERDUE, ALL |
| jurisdiction | string | IN, US, EP, WO, ALL |
| attorney | string | User ID or ALL |
| stage | string | Prosecution stage filter |
| status | string | ACTIVE, GRANTED, etc. |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "mat-101",
      "matterNumber": "IN-2025-PAT-00941",
      "title": "Quantum-Resistant Lattice Cryptography...",
      "jurisdiction": "IN",
      "currentStage": "PROVISIONAL",
      "status": "ACTIVE",
      "priorityDate": "2025-09-02",
      "filingDate": "2025-09-02",
      "officialAppNumber": "202511048291",
      "client": {
        "id": "cli-01",
        "name": "Synapse Quantum Labs Inc.",
        "code": "SYN-Q"
      },
      "leadAttorney": {
        "id": "usr-01",
        "name": "Sarah Jenkins, Esq."
      },
      "nearestDeadline": {
        "id": "ddl-101-1",
        "title": "12-Month Priority Bar",
        "statutoryDueDate": "2026-09-02",
        "daysRemaining": 15,
        "urgencyTier": "T_15_URGENT",
        "isStatutoryBar": true
      }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 6 }
}
```

---

### GET `/matters/:id`

Get full matter detail including all deadlines, receipts, activity.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "mat-101",
    "matterNumber": "IN-2025-PAT-00941",
    "title": "...",
    "jurisdiction": "IN",
    "currentStage": "PROVISIONAL",
    "abstract": "...",
    "deadlines": [ ... ],
    "receipts": [ ... ],
    "activityLog": [ ... ]
  }
}
```

---

### POST `/matters`

Create a new matter. Auto-generates statutory deadlines based on stage trigger.

**Request:**
```json
{
  "matterNumber": "IN-2026-PAT-00984",
  "title": "Quantum Dot Photovoltaic Cells...",
  "jurisdiction": "IN",
  "currentStage": "PROVISIONAL",
  "priorityDate": "2026-08-18",
  "filingDate": "2026-08-18",
  "officialAppNumber": "202611098412",
  "clientId": "cli-new",
  "leadAttorneyId": "usr-01",
  "supervisingPartnerId": "usr-04",
  "abstract": "..."
}
```

**Response (201):** Created matter with generated deadlines.

---

### PATCH `/matters/:id`

Update matter fields.

**Request:**
```json
{
  "currentStage": "COMPLETE",
  "leadAttorneyId": "usr-02"
}
```

---

### DELETE `/matters/:id`

Soft-delete matter (sets `deleted_at`).

**Roles:** Admin, Partner

---

### POST `/matters/:id/advance-stage`

Advance matter to next prosecution stage and generate successor deadlines.

**Request:**
```json
{
  "newStage": "COMPLETE",
  "triggerDate": "2026-08-18"
}
```

---

### GET `/matters/export`

Export filtered matters as CSV.

**Query params:** Same as GET `/matters`

**Response:** `Content-Type: text/csv`

---

## 4. Deadlines

### GET `/matters/:matterId/deadlines`

List all deadlines for a matter.

---

### GET `/deadlines`

Firm-wide deadline list (for cron dashboard).

**Query params:** `status`, `urgency`, `dueBefore`, `dueAfter`

---

### POST `/matters/:matterId/deadlines/:deadlineId/clear`

Clear a deadline (requires receipt upload + verification).

**Request (multipart/form-data or JSON with receiptId):**
```json
{
  "receiptId": "rcp-001",
  "notes": "Complete specification filed via Form 2"
}
```

**Business rules:**
1. Receipt must exist and be linked to this deadline
2. Verification must be APPROVED
3. User must have Attorney+ role
4. Creates audit log entry
5. Triggers stage advancement if applicable

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deadline": { "id": "ddl-101-1", "status": "CLEARED", "clearedAt": "..." },
    "newDeadlines": [ ... ],
    "newStage": "COMPLETE"
  }
}
```

---

### POST `/matters/:matterId/deadlines/:deadlineId/extend`

File an extension for an extendable deadline.

**Request:**
```json
{
  "extensionMonths": 3,
  "receiptId": "rcp-ext-001",
  "notes": "Form 4 filed with ₹4,000 fee"
}
```

---

## 5. Receipts

### GET `/receipts`

List all receipts (vault view).

**Query params:** `matterId`, `receiptType`, `search`

---

### POST `/receipts/upload`

Upload a government filing receipt.

**Request (multipart/form-data):**
```
file: (PDF/image)
matterId: mat-101
deadlineId: ddl-101-1  (optional)
receiptType: PROVISIONAL_FILING_CBR
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "rcp-001",
    "fileName": "IPO_CBR_Provisional.pdf",
    "receiptType": "PROVISIONAL_FILING_CBR",
    "parsedData": {
      "cbrNumber": "CBR-2026-981245",
      "officialAppNumber": "202611098412",
      "officialFees": 8000,
      "currency": "INR",
      "transactionDate": "2026-08-18T11:24:32+05:30"
    },
    "verification": {
      "id": "ver-001",
      "status": "PENDING"
    }
  }
}
```

---

### POST `/receipts/auto-docket`

Upload receipt and auto-create matter (OCR intake).

**Request (multipart/form-data):**
```
file: (PDF/image/text)
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "parsedPreview": {
      "matterNumber": "IN-2026-PAT-00984",
      "title": "...",
      "jurisdiction": "IN",
      "stage": "PROVISIONAL",
      "proposedDeadlines": [ ... ]
    },
    "confirmToken": "temp-token-abc"
  }
}
```

---

### POST `/receipts/auto-docket/confirm`

Confirm auto-docket preview and create matter.

**Request:**
```json
{
  "confirmToken": "temp-token-abc",
  "overrides": {
    "leadAttorneyId": "usr-01"
  }
}
```

---

## 6. Verifications

### GET `/verifications/pending`

List pending dual-verifications (Partner dashboard).

**Roles:** Partner, Admin

---

### POST `/verifications/:id/approve`

Approve a receipt verification (dual sign-off).

**Request:**
```json
{
  "notes": "CBR verified against IPO portal"
}
```

**Roles:** Partner, Admin

**Side effects:**
- Sets verification status to APPROVED
- Enables deadline clearance
- Creates audit log

---

### POST `/verifications/:id/reject`

Reject a verification.

**Request:**
```json
{
  "rejectionReason": "CBR number does not match IPO records"
}
```

---

## 7. Notifications

### GET `/notifications`

List notification history.

**Query params:** `tier`, `matterId`, `status`, `from`, `to`

---

### GET `/notifications/:id/preview`

Get HTML email preview for a notification.

---

### POST `/notifications/scan`

Manually trigger escalation scan (simulates cron).

**Roles:** Admin, Partner, Paralegal

**Response (200):**
```json
{
  "success": true,
  "data": {
    "scannedAt": "2026-08-18T08:00:00+05:30",
    "notificationsGenerated": 4,
    "notifications": [ ... ]
  }
}
```

---

### GET `/notifications/radar`

Get live urgency counts for radar banner.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "dailyCritical": 1,
    "critical5d": 1,
    "urgent15d": 2,
    "advisory30d": 3,
    "overdue": 0
  }
}
```

---

## 8. Rules Engine

### POST `/rules/calculate`

Standalone statutory rules calculator.

**Request:**
```json
{
  "triggerEvent": "PROVISIONAL_FILED",
  "triggerDate": "2025-09-02",
  "jurisdiction": "IN"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deadlines": [
      {
        "ruleId": "CONVENTION_12M_BAR",
        "title": "12-Month Priority Bar (Complete / PCT Filing)",
        "statutoryDueDate": "2026-09-02",
        "isStatutoryBar": true,
        "isExtendable": false,
        "statutorySection": "Section 9(1), Patents Act 1970"
      },
      {
        "ruleId": "PCT_30_31M_NATIONAL_PHASE",
        "title": "PCT National Phase Entry Window (30/31 Months)",
        "statutoryDueDate": "2027-04-02",
        "isStatutoryBar": true
      }
    ]
  }
}
```

---

### GET `/rules`

List all available statutory rules and trigger events.

---

## 9. Users

### GET `/users`

List firm users.

**Roles:** Admin, Partner

---

### POST `/users`

Create user.

**Roles:** Admin

---

### PATCH `/users/:id`

Update user (role, active status).

**Roles:** Admin

---

## 10. Clients

### GET `/clients`

List clients.

### POST `/clients`

Create client.

### PATCH `/clients/:id`

Update client.

---

## 11. Audit

### GET `/audit`

Query audit log.

**Query params:** `entityType`, `entityId`, `userId`, `action`, `from`, `to`

**Roles:** Admin, Partner

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "aud-001",
      "entityType": "deadline",
      "entityId": "ddl-101-1",
      "action": "CLEAR",
      "user": { "id": "usr-01", "name": "Sarah Jenkins" },
      "beforeState": { "status": "PENDING" },
      "afterState": { "status": "CLEARED" },
      "createdAt": "2026-08-18T14:30:00+05:30"
    }
  ]
}
```

---

## 12. Dashboard / Analytics

### GET `/dashboard/summary`

Firm-wide dashboard metrics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalActiveMatters": 6,
    "pendingDeadlines": 12,
    "overdueDeadlines": 0,
    "pendingVerifications": 2,
    "urgencyBreakdown": {
      "DAILY_CRITICAL": 1,
      "T_5_CRITICAL": 1,
      "T_15_URGENT": 2,
      "T_30_ADVISORY": 3,
      "SAFE_UPCOMING": 5
    },
    "mattersByStage": {
      "PROVISIONAL": +2,
      "EXAMINATION_FER": 1,
      "HEARING": 1
    }
  }
}
```

---

## 13. Health

### GET `/health`

```json
{ "status": "ok", "database": "connected", "redis": "connected" }
```

---

## 14. Error Codes

| Code | HTTP | Description |
|---|---|---|
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient role permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 422 | Request validation failed |
| RECEIPT_REQUIRED | 422 | Cannot clear deadline without receipt |
| VERIFICATION_PENDING | 422 | Dual verification not yet approved |
| DUPLICATE_MATTER | 409 | Matter number already exists |
| FILE_TOO_LARGE | 413 | Upload exceeds 10MB limit |
| INTERNAL_ERROR | 500 | Unexpected server error |

---

## 15. Webhooks (Phase 4)

Future outbound webhooks for integrations:

```
POST {client_url}/webhooks/deadline.alert
POST {client_url}/webhooks/deadline.cleared
POST {client_url}/webhooks/matter.created
```

---

## 16. Rate Limits

| Endpoint group | Limit |
|---|---|
| `/auth/login` | 10 req/min per IP |
| General API | 100 req/min per user |
| File upload | 20 req/min per user |
