# LexPatent Docket Radar — Setup Guide

Production stack: **React + Node.js + PostgreSQL** (no Docker required).

## Prerequisites

- Node.js 20+
- npm

## Quick Start

### 1. Install dependencies

```powershell
cd backend
npm install

cd ../frontend
npm install
```

### 2. Start PostgreSQL (embedded — no Docker)

```powershell
cd backend
npm run db:start
```

Leave this terminal running. On first run, also initialize the schema and seed data (in a **second terminal**):

```powershell
cd backend
npx prisma db push
npm run db:seed
```

Or use the all-in-one init (first time only):

```powershell
cd backend
npm run db:init
```

### 3. Start the API server

```powershell
cd backend
npm run dev
```

API: http://localhost:4000/api/v1/health

### 4. Start the React frontend

```powershell
cd frontend
npm run dev
```

App: http://localhost:5173

## Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| Attorney | s.jenkins@lexpatent-ip.com | password123 |
| Partner | m.vance@lexpatent-ip.com | password123 |
| Paralegal | p.nair@lexpatent-ip.com | password123 |
| Admin | admin@lexpatent-ip.com | password123 |

## Running Tests

```powershell
cd backend
npm test          # Unit tests (rules engine)
npm run test:api  # Integration tests (requires API + DB running)
```

## Project Structure

```
backend/          Node.js + Express + Prisma + PostgreSQL
frontend/         React + Vite + TanStack Query
docs/             PRD, architecture, API spec, setup, user journeys
```

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lexpatent?schema=public"
JWT_SECRET="change-me"
PORT=4000
FRONTEND_URL="http://localhost:5173"
SIMULATED_DATE="2026-08-18"
```

## Features Implemented

- JWT authentication with role-based access (Admin, Partner, Attorney, Paralegal)
- Matter CRUD with auto-generated statutory deadlines
- Rules engine (IN / US / EP / PCT): 12M bar, FER, hearing, annuities, etc.
- Urgency radar (T-30 / T-15 / T-5 / Daily Critical)
- Notification cron scan with email HTML generation
- Government receipt vault + auto-docket from sample receipts
- Dual-verification workflow for deadline clearance
- Board table, Kanban pipeline, Calculator, CSV export
- Immutable audit log

## Deployment

See [docs/DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) — deployment TBD after Phase 2.
