# LexPatent Docket Radar — Product Documentation

End-to-end planning documents for building a production-grade **Patent Prosecution & Deadline Docket** system for IP law firms.

## Document Index

| Document | Description |
|---|---|
| [PRD.md](./PRD.md) | **Product Requirements Document** — vision, features, users, success metrics |
| [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md) | Market research on law-firm docketing & alert software |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture — React frontend, Node.js backend, PostgreSQL |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | PostgreSQL schema design, entities, relationships |
| [API_SPECIFICATION.md](./API_SPECIFICATION.md) | REST API endpoints, auth, request/response contracts |
| [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) | Phased build plan from prototype → production MVP |
| [SETUP.md](./SETUP.md) | **Local development setup** (no Docker) |
| [USER_JOURNEY.md](./USER_JOURNEY.md) | Testing workflows and user journeys |

## Tech Stack (Confirmed)

| Layer | Technology |
|---|---|
| Frontend | **React 18+** (TypeScript), React Router, TanStack Query |
| Backend | **Node.js** (Express or Fastify), TypeScript |
| Database | **PostgreSQL 16+** |
| ORM | Prisma or Drizzle |
| Deployment | TBD after development (see [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md)) |

## Current State

The repository contains a **frontend prototype** (vanilla JS + static server) that demonstrates:

- Statutory rules engine (IN / US / EP / PCT)
- Tiered deadline escalation (30d / 15d / 5d / daily)
- Dual-verification & government receipt vault (simulated)
- monday.com-style UI (table, Kanban, automations view)

Data is stored in browser `localStorage` with no real backend. These docs define the path to a full production system.

## How to Use These Docs

1. **Product / stakeholders** → Start with [PRD.md](./PRD.md) and [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md)
2. **Engineering leads** → [ARCHITECTURE.md](./ARCHITECTURE.md) + [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) + [API_SPECIFICATION.md](./API_SPECIFICATION.md)
3. **Project managers** → [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md)

---

*Last updated: August 2026*
