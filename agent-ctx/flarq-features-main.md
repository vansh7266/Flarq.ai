# Task: FLARQ Feature Implementation - Google OAuth + Atlas Vector Search

## Summary

Implemented two features in the FLARQ project:

### Feature 1: Google OAuth Button on Auth Page

**Frontend changes:**
1. Installed `@react-oauth/google` package
2. Created `frontend/src/components/GoogleOAuthButton.tsx` - reusable Google OAuth button component wrapping `@react-oauth/google`'s `GoogleLogin`
3. Modified `frontend/src/pages/AuthPage.tsx`:
   - Added `GoogleOAuthProvider` wrapper (conditional on `VITE_GOOGLE_CLIENT_ID` env var)
   - Added `GoogleOAuthButton` above the email/password form
   - Added "or continue with email" divider between Google and email login
   - Added `handleGoogleSuccess` function that sends credential to backend
4. Modified `frontend/src/services/authService.ts` - added `googleAuth()` function
5. Updated `frontend/.env.example` with `VITE_GOOGLE_CLIENT_ID=`

**Backend changes:**
1. Modified `backend/app/api/v1/auth.py`:
   - Added imports for `google.oauth2.id_token` and `google.auth.transport.requests`
   - Added `GoogleAuthRequest` Pydantic model
   - Added `POST /auth/google` endpoint that verifies Google ID token, finds/creates user, returns JWT tokens
2. Modified `backend/app/services/mongodb/repositories/user_repo.py`:
   - Added `create_google_user()` method for creating OAuth users (no password)
3. Modified `backend/app/core/config.py`:
   - Added `google_client_id` setting field
4. Updated `backend/.env.example` with `GOOGLE_CLIENT_ID=`

### Feature 2: Atlas Vector Search with Embeddings

1. Created `backend/app/services/gemini/embeddings.py`:
   - Singleton `TextEmbeddingModel` using `text-embedding-004` (768-dim vectors)
   - `generate_embedding(text, task_type)` - async wrapper with thread executor
   - `generate_query_embedding(query)` - convenience function with RETRIEVAL_QUERY task type
2. Modified `backend/mcp_server/flarq_mongo_mcp.py`:
   - Added `sys.path` manipulation to allow importing app modules
   - Updated `mongodb_vector_search` tool schema:
     - Added `query_text` parameter (text to auto-embed via Vertex AI)
     - Made `query_vector` optional (alternative to `query_text`)
     - Made `limit` optional with default 10
   - Updated tool handler to generate embeddings when `query_text` is provided
   - Added proper error logging with structlog
   - Backward compatible: still supports direct `query_vector` input

## Files Modified/Created

### Created:
- `frontend/src/components/GoogleOAuthButton.tsx`
- `backend/app/services/gemini/embeddings.py`

### Modified:
- `frontend/src/pages/AuthPage.tsx`
- `frontend/src/services/authService.ts`
- `frontend/.env.example`
- `frontend/package.json` (added @react-oauth/google)
- `backend/app/api/v1/auth.py`
- `backend/app/services/mongodb/repositories/user_repo.py`
- `backend/app/core/config.py`
- `backend/.env.example`
- `backend/mcp_server/flarq_mongo_mcp.py`
