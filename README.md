# LexPatent Docket Radar

**Zero-Fail Patent Prosecution & Deadline Management System** for IP law firms.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (embedded, no Docker) |
| ORM | Prisma |

## Project Structure

```
PATENT_DATA_MANAGEMENT-TOOL/
├── backend/                 # Node.js API server
│   ├── prisma/              # Schema, migrations, seed
│   ├── src/                 # Routes, services, middleware
│   ├── scripts/             # DB init/start, API tests
│   └── tests/               # Unit tests
├── frontend/                # React SPA
│   └── src/
│       ├── api/             # API client
│       ├── components/      # Layout & UI
│       ├── pages/             # Board, Kanban, Receipts, etc.
│       └── styles/            # monday.com theme CSS
├── docs/                    # PRD, architecture, API spec, setup
└── package.json             # Root scripts
```

## Quick Start

```powershell
# Terminal 1 — PostgreSQL
cd backend && npm install && npm run db:start

# Terminal 2 — First-time setup (once)
cd backend && npx prisma db push && npm run db:seed

# Terminal 3 — API
cd backend && npm run dev

# Terminal 4 — React UI
cd frontend && npm install && npm run dev
```

Open **http://localhost:5173** — login: `s.jenkins@lexpatent-ip.com` / `password123`

Full guide: [docs/SETUP.md](docs/SETUP.md)

## Documentation

| Doc | Description |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Product requirements |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture |
| [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md) | REST API reference |
| [docs/SETUP.md](docs/SETUP.md) | Local development setup |
| [docs/USER_JOURNEY.md](docs/USER_JOURNEY.md) | Testing workflows |

## Tests

```powershell
cd backend
npm test          # Unit tests (rules engine)
npm run test:api  # Integration tests
```
