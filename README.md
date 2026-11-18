# FLARQ

FLARQ is an AI job search workspace. It turns resumes and job descriptions into structured profiles and requirements, helps candidates compare skills against roles, and keeps applications and follow-ups in one place.

- **Analyze roles:** Extract job requirements, compare them with a saved candidate profile, and draft tailored cover letters.
- **Track applications:** Manage stages in a Kanban board and review response and interview trends.
- **Ask the agent:** Query your application history, find roles that need follow-up, and search saved job descriptions by meaning.

## Architecture

React and TypeScript power the frontend. FastAPI handles requests, calls Gemini on Vertex AI, and connects to MongoDB through a Python Model Context Protocol (MCP) server. Gemini 3.5 Flash-Lite handles generation and tool calling. Gemini Embedding 001 creates vectors for saved job descriptions and search queries.

## Local setup

Requirements: Python 3.11+, Node.js 20+, MongoDB, and a Google Cloud project with Vertex AI enabled. Follow the [Google Cloud authentication guide](backend/setup_gcp_auth.md) to set up Application Default Credentials.

From the repository root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

Fill in `MONGODB_URI`, `JWT_SECRET_KEY`, and `GOOGLE_CLOUD_PROJECT` in `backend/.env`. Start the API:

```bash
python -m uvicorn app.main:app --env-file .env --reload --port 8000
```

In another terminal, from the repository root:

```bash
cd frontend
npm ci
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The API docs are at [http://localhost:8000/docs](http://localhost:8000/docs).

| Optional setting | Default | Purpose |
| --- | --- | --- |
| `VERTEX_AI_MODEL` | `gemini-3.5-flash-lite` | Gemini model for text generation and tools |
| `VERTEX_AI_LOCATION` | `global` | Generation endpoint |
| `VERTEX_EMBEDDING_MODEL` | `gemini-embedding-001` | Embedding model for both documents and queries |
| `GOOGLE_CLOUD_LOCATION` | `us-central1` | Embedding endpoint |
| `JOBS_VECTOR_INDEX` | unset | Atlas search index name |
| `GOOGLE_CLIENT_ID` | unset | Optional Google sign-in client ID. Set the same value in the frontend as `VITE_GOOGLE_CLIENT_ID`. |

## Saved job search

Create an Atlas **Vector Search** index named `job_descriptions_vector` on the `job_descriptions` collection:

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" },
    { "type": "filter", "path": "user_id" }
  ]
}
```

Set `JOBS_VECTOR_INDEX=job_descriptions_vector` in `backend/.env` and restart the API. New job descriptions saved by job analysis or gap analysis receive embeddings. Reanalyze older documents to add them to the index. The agent embeds the query, asks Atlas for up to five matches filtered to the signed-in user, and uses the returned excerpts to answer. Try “Which of my saved job descriptions mention Python and distributed systems?”

## Backend tests

From `backend/` with the virtual environment active:

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
```
