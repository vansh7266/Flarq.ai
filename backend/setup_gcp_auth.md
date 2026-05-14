# Google Cloud authentication for FLARQ (Vertex AI)

FLARQ uses **Vertex AI** (`google-cloud-aiplatform`), not the consumer Gemini API key.

## Local development

1. Install [gcloud CLI](https://cloud.google.com/sdk/docs/install).
2. Authenticate application default credentials:

   ```bash
   gcloud auth application-default login
   ```

3. Set your project:

   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

4. Enable the Vertex AI API:

   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```

5. Set env vars (see `backend/.env.example`):

   - `GOOGLE_CLOUD_PROJECT`
   - `GOOGLE_CLOUD_LOCATION` (e.g. `us-central1`)
   - `VERTEX_AI_MODEL` (e.g. `gemini-2.0-flash-001`)

## Cloud Run / GKE

- Attach a service account with **`roles/aiplatform.user`** (or broader for prototyping).
- Do not rely on `GEMINI_API_KEY`; workload identity or the metadata server supplies credentials.

## Troubleshooting

- `403` / permission errors: confirm the API is enabled and the principal has `aiplatform.user`.
- Wrong region: model availability is region-specific; align `GOOGLE_CLOUD_LOCATION` with where the model is offered.
