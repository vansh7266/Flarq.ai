# FLARQ — AI Job Search Agent

> Your AI-powered job search operating system. Analyze any job description, identify skill gaps, generate tailored cover letters, and track every application — powered by Google Gemini on Google Cloud.

**[Live Demo](https://flarq.ai)** | **[Demo Video](#)** | **[Devpost Submission](#)**

---

## What is Flarq?

Flarq is a multi-step AI agent that helps job seekers land roles faster. Unlike chatbots that just answer questions, Flarq **acts**:

- 📄 **Resume Parsing** — Upload your resume; Gemini extracts structured skills and experience
- 🎯 **Gap Analysis** — Paste any job description, get instant match score and skill gaps
- ✍️ **Cover Letter Generation** — AI-written, role-specific, in your tone (professional / conversational / bold)
- 📊 **Application Tracking** — Full Kanban board with drag-and-drop across pipeline stages
- 📈 **Analytics** — MongoDB aggregations reveal response rates, funnel metrics, and company patterns
- 🤖 **AI Agent Chat** — Ask anything about your job search; the agent uses real tools and returns grounded answers

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│            Frontend (React 19 + TypeScript)              │
│    Vite · Framer Motion · @dnd-kit · Recharts · Zustand  │
└─────────────────────────┬───────────────────────────────┘
                          │  REST / JSON
┌─────────────────────────▼───────────────────────────────┐
│              Backend (FastAPI + Python 3.11)             │
│        JWT Auth · SlowAPI · structlog · Motor            │
└──────────────┬──────────────────────────────┬──────────┘
               │                              │
┌──────────────▼──────────┐   ┌───────────────▼──────────┐
│  Vertex AI (Gemini 2.0) │   │  MongoDB MCP Server       │
│  gemini-2.0-flash-001   │   │  (stdio transport)        │
│  • Resume parsing        │   │  Tools exposed via MCP:   │
│  • JD analysis           │   │  find_one, find_many,     │
│  • Gap analysis          │   │  insert_one, update_one,  │
│  • Cover letters         │   │  delete_one, aggregate,   │
│  • Agent reasoning       │   │  inspect_schema, count    │
└─────────────────────────┘   └───────────────────────────┘
                                         │
                              ┌──────────▼──────────┐
                              │   MongoDB Atlas      │
                              │   (free M0 tier)    │
                              └─────────────────────┘
```

### MongoDB MCP Integration

Flarq uses a **real Model Context Protocol server** (`backend/mcp_server/flarq_mongo_mcp.py`) that exposes 9 MongoDB tools via stdio transport. The Flarq Agent calls these tools through the MCP protocol — not direct database calls. This is a genuine agent architecture, not an API wrapper.

Security features in the MCP server:
- Operator allowlist (`ALLOWED_FILTER_OPERATORS`) — blocks `$where`, `$function`, and other dangerous operators
- Pipeline stage blocklist — blocks `$out`, `$merge`, `$currentOp`, `$listSessions`
- User-scoped collection enforcement — requires `user_id` in filters for personal data collections
- Depth-limited filter validation — prevents recursive injection attacks

### Google Cloud Integration

Built on **Vertex AI** — Google Cloud's enterprise AI platform. Uses `gemini-2.0-flash-001` for:
- Resume parsing (structured JSON extraction)
- JD analysis and requirement extraction
- Gap analysis with scored output
- Cover letter generation (3 tones)
- Agent reasoning with Vertex AI function calling

The agent uses a **multi-turn reasoning loop** (up to 8 steps), dispatching tools in parallel via `asyncio.gather`, then synthesizing a final response.

---

## Setup

### Prerequisites

- Google Cloud account with **Vertex AI API enabled**
- MongoDB Atlas cluster (free M0 tier works)
- Node.js 20+ and Python 3.11+
- `gcloud` CLI authenticated (`gcloud auth application-default login`)

### Local Development

```bash
# Clone
git clone https://github.com/vansh7266/Flarq.ai.git
cd Flarq.ai

# Backend
cp .env.example .env
# Fill in .env values (see table below)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
# → http://localhost:3002
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | Optional | Database name (default: `flarq`) |
| `JWT_SECRET_KEY` | ✅ | Secret for JWT signing (min 32 chars) |
| `GOOGLE_CLOUD_PROJECT` | ✅ | GCP project ID with Vertex AI enabled |
| `GOOGLE_CLOUD_LOCATION` | Optional | Vertex AI region (default: `us-central1`) |
| `VERTEX_AI_MODEL` | Optional | Model ID (default: `gemini-2.0-flash-001`) |
| `FRONTEND_URL` | Production | Frontend URL for CORS (e.g. `https://flarq.ai`) |
| `ENVIRONMENT` | Optional | `development` or `production` |
| `VITE_API_URL` | Frontend | Backend URL (empty = same-origin in prod) |

### Cloud Run Deployment

The repo includes `cloudbuild.yaml` for automated CI/CD:

```bash
# Trigger a build
gcloud builds submit --config cloudbuild.yaml \
  --project=your-project-id

# Or deploy manually
gcloud run deploy flarq-backend \
  --image=gcr.io/your-project/flarq-backend:latest \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="MONGODB_URI=...,JWT_SECRET_KEY=...,GOOGLE_CLOUD_PROJECT=..."

gcloud run deploy flarq-frontend \
  --image=gcr.io/your-project/flarq-frontend:latest \
  --region=us-central1 \
  --allow-unauthenticated
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **AI** | Google Vertex AI (Gemini 2.0 Flash) |
| **Database** | MongoDB Atlas + Custom MCP Server |
| **Backend** | FastAPI, Python 3.11, Motor (async MongoDB) |
| **Frontend** | React 19, TypeScript, Vite |
| **UI** | Tailwind CSS, Framer Motion, Space Grotesk |
| **Drag & Drop** | @dnd-kit |
| **Charts** | Recharts |
| **State** | Zustand (persisted), TanStack Query |
| **Deployment** | Google Cloud Run, Cloud Build |

---

## Key Design Decisions

**Why MCP for MongoDB?** The Model Context Protocol gives the agent a structured, validated interface to the database with security enforcement at the protocol level. The agent cannot execute arbitrary queries — it can only call declared tools with validated inputs.

**Why Vertex AI over the Gemini API?** Vertex AI provides enterprise SLAs, regional data residency, and is the same platform underlying Google Cloud Agent Builder. Using it directly demonstrates production-grade AI integration.

**Why function calling instead of RAG?** The user's data is personal and small (<1000 documents). Function calling against a live database returns accurate, up-to-date results without the latency or hallucination risk of embedding-based retrieval.

---

## Team

Built for the **Google Cloud Rapid Agent Hackathon**.

---

## License

MIT — see [LICENSE](LICENSE)
