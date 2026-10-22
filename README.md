# Nakshtra

Private astrology consultations. This repository contains a React frontend and a FastAPI backend. Public browsing does not require an account. Login uses HttpOnly session cookies (`nakshtra_session`), not bearer tokens in JavaScript.

## Frontend

```bash
npm install
npm run dev
```

In development, Vite proxies `/api` to FastAPI at `http://localhost:8000`. Leave `VITE_API_BASE_URL` unset so the browser stays same-origin. If you must call the API on another host, copy `.env.example` values into a local `.env` and set:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

Never put secrets in frontend environment variables. Session cookies are set by the API.

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Backend

The FastAPI app lives in `backend/`. It was restored from git history after the tree was emptied; request and response schemas for auth are:

- `POST /api/v1/auth/register` — `{ email, password }` → user, sets session cookie
- `POST /api/v1/auth/login` — `{ email, password }` → user, sets session cookie
- `POST /api/v1/auth/logout` — `{ ok: true }`, requires a session
- `GET /api/v1/auth/me` — current user, `401` when unsigned

Public registration always creates a `customer` account.

```bash
cp .env.example .env
```

Fill in PostgreSQL settings in `.env`. Do not commit that file.

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Optional local database:

```bash
docker compose up -d db
```

CORS allows `http://localhost:5173`, `http://127.0.0.1:5173`, and `https://*.monkeycode-ai.live`. Credentials are enabled; wildcard origins are not used.

## Checks

Frontend: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

Backend (needs `TEST_DATABASE_URL` or a reachable test Postgres):

```bash
cd backend
.venv/bin/pytest
```
