import os

os.environ.setdefault("MONGODB_URI", "mongodb://127.0.0.1:27017/flarq-test")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-ci-only-32chars!!")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "flarq-test-project")
os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "us-central1")
os.environ.setdefault("VERTEX_AI_MODEL", "gemini-2.0-flash-001")
