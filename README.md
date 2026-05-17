# FLARQ — Your Agentic Job Search OS

> AI that doesn't just answer questions — it helps you take action.

**[Live Demo](https://flarq.ai)** | **[Demo Video](#)** | **[Devpost Submission](#)**

[![Built with Gemini](https://img.shields.io/badge/Powered%20by-Gemini%202.0-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Agent%20Builder-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/agent-builder)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas%20Vector%20Search-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Cloud Run](https://img.shields.io/badge/Deployed%20on-Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/run)

---

## The Problem

Job seekers waste **10+ hours per week** on repetitive tasks: tailoring resumes, writing cover letters, tracking applications, and following up. Existing tools are passive — they store data but don't act on it. FLARQ is different. It's an **agentic operating system** that uses AI to reason about your job search and take action on your behalf.

## What FLARQ Does

FLARQ is a multi-step AI agent that helps job seekers land roles faster. Unlike chatbots that just answer questions, FLARQ **acts**:

| Feature | What It Does | Powered By |
|---------|-------------|------------|
| **Resume Parsing** | Upload your resume; Gemini extracts structured skills, experience, and education | Gemini 2.0 Flash (Vertex AI) |
| **JD Analysis** | Paste any job description; get instant requirements, skills, and seniority extraction | Gemini 2.0 Flash |
| **Gap Analysis** | Compare your profile against a JD with a match score, missing skills, and strategy | Gemini 2.0 Flash |
| **Cover Letter Generation** | AI-written, role-specific cover letters in 3 tones (professional / conversational / bold) | Gemini 2.0 Flash |
| **Application Tracking** | Full Kanban board with drag-and-drop across pipeline stages | @dnd-kit + MongoDB via MCP |
| **Analytics Dashboard** | MongoDB aggregations reveal response rates, funnel metrics, and company patterns | MongoDB Aggregation Pipeline |
| **AI Agent Chat** | Ask anything about your job search; the agent uses real MCP tools and returns grounded answers | Agent Builder + MCP + Gemini |
| **Vector Search** | Semantic search across job descriptions using Atlas Vector Search | text-embedding-004 + Atlas |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│              Frontend (React 19 + TypeScript)                 │
│    Vite · Framer Motion · @dnd-kit · Recharts · Zustand      │
│    Lazy-loaded pages · SSE streaming · react-markdown         │
└──────────────────────────┬───────────────────────────────────┘
                           │  REST + SSE
┌──────────────────────────▼───────────────────────────────────┐
│              Backend (FastAPI + Python 3.11)                  │
│    JWT Auth · Rate Limiting · structlog · Motor               │
│    Safety Settings · Secret Manager · SSE Streaming           │
└─────────────┬───────────────────────────────┬────────────────┘
              │                               │
┌─────────────▼──────────┐  ┌────────────────▼─────────────────┐
│ Google Cloud Agent      │  │  MongoDB MCP Server (stdio)      │
│ Builder + Vertex AI     │  │                                  │
│                         │  │  9 Tools exposed via MCP:        │
│ • Agent orchestration   │  │  find_one, find_many,            │
│ • Grounded responses   │  │  insert_one, update_one,         │
│ • Gemini 2.0 Flash     │  │  delete_one, aggregate,          │
│ • Function calling      │  │  inspect_schema, count,          │
│ • Safety settings       │  │  vector_search                   │
│ • Embedding generation  │  │                                  │
│   (text-embedding-004)  │  │  Security: collection allowlist, │
│                         │  │  operator allowlist, soft delete  │
└─────────────┬──────────┘  └───────────────┬──────────────────┘
              │                              │
              │              ┌───────────────▼──────────────┐
              │              │     MongoDB Atlas             │
              │              │  • Aggregation Pipeline       │
              │              │  • Atlas Vector Search        │
              │              │  • Cross-collection $lookup   │
              │              │  • Text Indexes               │
              │              └──────────────────────────────┘
              │
┌─────────────▼──────────────────────────────────────────────┐
│              Google Cloud Infrastructure                     │
│  Cloud Run · Secret Manager · Cloud Build · IAM             │
└─────────────────────────────────────────────────────────────┘
```

---

## Hackathon Compliance

This project is built for the **Google Cloud Rapid Agent Hackathon** (MongoDB Track). Here's how it meets each requirement:

| Requirement | How FLARQ Meets It |
|-------------|-------------------|
| **Powered by Gemini** | Uses `gemini-2.0-flash-001` via Vertex AI for all AI operations (resume parsing, JD analysis, gap analysis, cover letters, agent reasoning) |
| **Google Cloud Agent Builder** | Integrates Discovery Engine `ConversationalSearchService` for agent orchestration and grounded responses. Falls back to custom Vertex AI agent for complex MCP tool-calling |
| **Move Beyond Chat** | Agent uses 6 tools that accomplish real tasks: profile lookup, application search, analytics, follow-up generation, status updates — not just Q&A |
| **Multi-Step Mission** | Agent loop runs up to 8 iterations with tool chaining. Gemini plans which tools to call and chains them (e.g., find stale apps then draft follow-up) |
| **Partner MCP Integration** | Real MCP server with 9 MongoDB tools via proper MCP SDK (stdio transport). All data operations flow through MCP protocol |
| **Cloud Run Deployment** | `cloudbuild.yaml` + frontend/backend Dockerfiles. One-command deployment via Cloud Build |
| **Secret Manager** | Production secrets (MongoDB URI, JWT key) loaded from Google Secret Manager via `app/core/secrets.py` |
| **Safety Settings** | All Gemini calls include `SafetySetting` for harassment, hate speech, sexually explicit, and dangerous content |

### Phase 1-5 Technology Coverage

| Phase | Technology | Status |
|-------|-----------|--------|
| Phase 1 | Gemini Enterprise Agent Platform (Vertex AI) | Implemented |
| Phase 1 | Agent Builder (Discovery Engine) | Implemented |
| Phase 2 | Agent Builder Extensions (Function Calling) | Implemented |
| Phase 2 | Data Stores (MongoDB via MCP) | Implemented |
| Phase 3 | MongoDB MCP Integration (9 tools) | Implemented |
| Phase 4 | Secret Manager | Implemented |
| Phase 5 | Cloud Run Deployment | Implemented |
| Phase 5 | Safety Settings | Implemented |

---

## MCP Integration Deep Dive

FLARQ implements a **real Model Context Protocol server** (`backend/mcp_server/flarq_mongo_mcp.py`) using the official Python MCP SDK. This is not a REST API wrapper — it's a genuine MCP implementation with stdio transport.

### 9 MongoDB Tools

| Tool | MongoDB Feature | Purpose |
|------|----------------|---------|
| `mongodb_find_one` | `findOne` | Single document lookup |
| `mongodb_find_many` | `find` + sort/limit | Batch queries with pagination |
| `mongodb_insert_one` | `insertOne` | Create new documents |
| `mongodb_update_one` | `updateOne` with `$set` | Modify documents |
| `mongodb_delete_one` | Soft delete (`deleted: true`) | Mark documents as deleted |
| `mongodb_aggregate` | Aggregation Pipeline | Complex analytics with `$lookup`, `$group`, `$unwind` |
| `mongodb_inspect_schema` | Schema introspection | Auto-detect collection structure |
| `mongodb_count` | `countDocuments` | Document counting |
| `mongodb_vector_search` | Atlas `$vectorSearch` | Semantic search with embeddings |

### Security Features

- **Collection allowlist** — Only approved collections can be accessed
- **Operator allowlist** — Blocks `$where`, `$function`, and other dangerous operators
- **Pipeline stage blocklist** — Blocks `$out`, `$merge`, `$currentOp`
- **User-scoped queries** — Personal data requires `user_id` in filters
- **Soft delete only** — No hard deletes, all removals set `deleted: true`
- **Auto-timestamping** — All operations auto-set `updated_at`

---

## Setup

### Prerequisites

- Google Cloud account with **Vertex AI API** and **Agent Builder** enabled
- MongoDB Atlas cluster (free M0 tier works)
- Node.js 20+ and Python 3.11+
- `gcloud` CLI authenticated (`gcloud auth application-default login`)

### Local Development

```bash
# Clone
git clone https://github.com/vansh7266/Flarq.ai.git
cd Flarq.ai

# Backend
cp backend/.env.example backend/.env
# Fill in .env values (see table below)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
# → http://localhost:3002
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | No | Database name (default: `flarq`) |
| `JWT_SECRET_KEY` | Yes | Secret for JWT signing (min 32 chars) |
| `GOOGLE_CLOUD_PROJECT` | Yes | GCP project ID with Vertex AI + Agent Builder |
| `GOOGLE_CLOUD_LOCATION` | No | Vertex AI region (default: `us-central1`) |
| `VERTEX_AI_MODEL` | No | Model ID (default: `gemini-2.0-flash-001`) |
| `AGENT_BUILDER_ID` | Yes | Agent Builder engine ID (from Google Cloud Console) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID (for Sign in with Google) |
| `FRONTEND_URL` | Prod | Frontend URL for CORS |
| `ENVIRONMENT` | No | `development` or `production` |
| `VITE_API_URL` | Frontend | Backend URL (empty = same-origin in prod) |
| `VITE_GOOGLE_CLIENT_ID` | Frontend | Google OAuth client ID |

### Cloud Run Deployment

The repo includes `cloudbuild.yaml` for automated CI/CD:

```bash
# One-command deployment
gcloud builds submit --config cloudbuild.yaml \
  --project=your-project-id

# Or deploy manually
gcloud run deploy flarq-backend \
  --source ./backend \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="MONGODB_URI=...,JWT_SECRET_KEY=...,GOOGLE_CLOUD_PROJECT=...,AGENT_BUILDER_ID=..."

gcloud run deploy flarq-frontend \
  --source ./frontend \
  --region=us-central1 \
  --allow-unauthenticated \
  --build-arg=VITE_API_URL=https://your-backend-url
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI / Agent** | Google Cloud Agent Builder, Gemini 2.0 Flash, Vertex AI, text-embedding-004 |
| **Database** | MongoDB Atlas (Aggregation Pipeline, Vector Search, Text Search) |
| **MCP** | Model Context Protocol (official Python SDK, stdio transport, 9 tools) |
| **Backend** | FastAPI, Python 3.11, Motor, JWT Auth, SSE Streaming |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion |
| **UI Components** | @dnd-kit (Kanban), Recharts (Analytics), react-markdown (Agent) |
| **State** | Zustand (persisted), TanStack Query (server state) |
| **Auth** | JWT + Google OAuth (@react-oauth/google) |
| **Infrastructure** | Google Cloud Run, Cloud Build, Secret Manager, Agent Builder |
| **Safety** | Gemini Safety Settings (4 categories, BLOCK_MEDIUM_AND_ABOVE) |

---

## Key Design Decisions

**Why Agent Builder?** The hackathon requires Google Cloud Agent Builder for agent orchestration. We use the Discovery Engine `ConversationalSearchService` API for first-pass routing and grounded responses, falling back to the custom Vertex AI agent for complex MCP tool-calling that requires live database access.

**Why MCP for MongoDB?** The Model Context Protocol gives the agent a structured, validated interface to the database with security enforcement at the protocol level. The agent cannot execute arbitrary queries — it can only call declared tools with validated inputs. This is exactly the "Partner Power" the hackathon asks for.

**Why SSE Streaming?** Real agents show their work. SSE streaming lets the agent display thinking indicators, real-time tool execution timelines, and token-by-token response generation — creating the "agent at work" experience that distinguishes agents from chatbots.

**Why Vector Search?** Atlas Vector Search with `text-embedding-004` embeddings enables semantic matching between job descriptions and candidate profiles, going beyond keyword matching to understand meaning and context.

---

## Team

Built for the **Google Cloud Rapid Agent Hackathon** — MongoDB Track.

---

## License

MIT — see [LICENSE](LICENSE)
