# Nakshtra Tak — Astrology Consultation Platform (Phase 0)

Full-stack foundation for an astrology consultation platform inspired by
Nakshtra Tak. **Phase 0 only**: project scaffold, premium landing page,
placeholder entry routes, FastAPI health endpoints, PostgreSQL wiring and
Alembic configuration.

> Not built yet (by design): authentication, payments, chat, video calls and
> Kundali calculations.

```
.
├── frontend/          # React + TypeScript + Vite + Tailwind CSS
├── backend/           # FastAPI + SQLAlchemy 2.x + Alembic
├── .env.example       # backend environment template (copy to .env)
└── docker-compose.yml # optional local PostgreSQL
```

## Prerequisites

- Node.js ≥ 20 (tested on Node 24) and npm
- Python ≥ 3.11 (tested on 3.13)
- PostgreSQL ≥ 14 (local install **or** Docker for the bundled compose file)

## 1. Configure the environment

Secrets never live in source control — `.env` is git-ignored.

```bash
cp .env.example .env          # then edit DATABASE_URL / POSTGRES_* values
cp frontend/.env.example frontend/.env   # optional; default works locally
```

## 2. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- Health: <http://localhost:8000/health>
- Versioned health: <http://localhost:8000/api/v1/health>
- DB connectivity: <http://localhost:8000/api/v1/health/db>
- Interactive docs: <http://localhost:8000/docs>

No database needed to start the app — `/api/v1/health/db` simply reports
`"configured": false` until `DATABASE_URL` is set.

### Database (PostgreSQL)

Option A — Docker:

```bash
docker compose up -d db
```

Option B — any existing PostgreSQL server; set `DATABASE_URL` (or
`POSTGRES_*` variables) in `.env`.

Verify connectivity end-to-end with Alembic:

```bash
cd backend
alembic upgrade head           # creates the alembic_version table
alembic current                # should show 0001_phase0_baseline
```

Or hit <http://localhost:8000/api/v1/health/db> → `"connected": true`.

## 3. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

Routes: `/` (landing), `/customer`, `/astrologer`, `/admin` (placeholders),
anything else → 404 page. The footer shows live API status
(loading / online / offline) from `VITE_API_BASE_URL`.

## 4. Tests

```bash
# Backend (pytest)
cd backend
.venv/Scripts/python -m pytest    # or: pytest / python -m pytest

# Frontend (Vitest)
cd frontend
npm test
npm run typecheck
```

## 5. Production build

```bash
cd frontend && npm run build      # outputs frontend/dist
cd backend && pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Notes

- The database engine is created lazily: the API boots without DB settings
  and reports DB status through `/api/v1/health/db`.
- Never commit `.env`; only `.env.example` (with placeholders) is tracked.
- Next phases add accounts, bookings, consultations and Kundali features.