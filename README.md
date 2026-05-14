# FLARQ (Phase 2)

**FLARQ** is an agentic job search operating system for [flarq.ai](https://flarq.ai): resume intelligence, job description analysis, gap scoring, tailored cover letters, and MongoDB-backed persistence — with a Gemini-powered analysis layer and an MCP-shaped data client (`MongoMCPClient`) that performs the same style of operations as the official MongoDB MCP server against your Atlas cluster (`MONGODB_URI`).

Phase 2 ships end-to-end **resume upload → Gemini parse → user confirm → MongoDB profile**, **JD analyze → MongoDB `job_descriptions`**, and **gap analysis + cover letter generation** with versioned `cover_letters` documents.

## Prerequisites

- Node.js 20+, Python 3.11+
- MongoDB Atlas (or compatible MongoDB deployment)
- **Google AI Studio / Vertex** API key with access to **`gemini-2.0-flash`** (configurable via `GEMINI_MODEL`)

## Environment

Copy `.env.example` → `.env` at the repo root (and/or `backend/.env` for local uvicorn). Required for Phase 2 flows:

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Atlas connection string |
| `MONGODB_DB_NAME` | Database name (default `flarq`) |
| `JWT_SECRET_KEY` | HS256 signing secret |
| `GEMINI_API_KEY` | Gemini API key |
| `GEMINI_MODEL` | Default `gemini-2.0-flash` |
| `MAX_RESUME_SIZE_MB` | Upload cap (default `5`) |
| `MAX_JD_LENGTH` | JD character cap (default `10000`) |
| `FRONTEND_URL` | CORS origin for the SPA |

Frontend: `VITE_API_URL` (browser → API, e.g. `http://localhost:8000`).

## Run locally

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 3000
```

**Docker:** `docker compose up --build` from the repo root (shared `.env`).

## API (Phase 2 highlights)

All JSON follows `{ success, message, data, error }`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness |
| `POST` | `/api/v1/auth/register` | Register |
| `POST` | `/api/v1/auth/login` | Login |
| `POST` | `/api/v1/auth/refresh` | Refresh access token |
| `POST` | `/api/v1/auth/logout` | Blocklist refresh token |
| `GET` | `/api/v1/profile` | Load profile (MongoDB via MCP client) |
| `PUT` | `/api/v1/profile` | Update profile fields |
| `POST` | `/api/v1/profile/upload-resume` | Multipart PDF/DOCX → parse (no final save until confirm) |
| `POST` | `/api/v1/profile/confirm-parsed-resume` | Save confirmed parsed JSON to `profiles` |
| `POST` | `/api/v1/jobs/analyze` | JD → Gemini analysis → `job_descriptions` |
| `POST` | `/api/v1/jobs/gap-analysis` | Profile + JD text → JD + gap (parallel fetch JD analysis) |
| `POST` | `/api/v1/jobs/cover-letter` | Profile + `jd_id` + tone → gap + cover letter → `cover_letters` |
| `POST` | `/api/v1/applications` | Create Kanban card (used from Analyze “Save to Applications”) |

## Testing

```bash
cd backend
pytest
```

## Phase 3 (next)

- Full **Applications Kanban** UX (drag/drop, status transitions, notes)
- **Analytics** charts wired to MongoDB aggregation pipelines
- **Agent** history + tool calls via MCP / Agent Builder
- **Scheduler** follow-up alerts (Cloud Scheduler + `alert_service`)

## License

Hackathon / prototype — verify licensing before external distribution.
