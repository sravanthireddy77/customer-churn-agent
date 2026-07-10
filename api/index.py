# Define a placeholder handler first before any imports
handler = None

import sys
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from mangum import Mangum

# Create a minimal test app as fallback
test_app = FastAPI()

@test_app.get("/api/test")
def test_endpoint():
    return JSONResponse({"status": "working", "message": "Minimal FastAPI + Mangum is working!"})

@test_app.get("/api/health")
def health():
    return JSONResponse({"status": "ok"})

# Set handler to test app
handler = Mangum(test_app, lifespan="off")

# Try to import the full app
try:
    # Add backend directory to Python path
    backend_path = Path(__file__).parent.parent / "backend"
    sys.path.insert(0, str(backend_path))

    # Set environment variables for Vercel
    os.environ.setdefault("ENVIRONMENT", "production")
    os.environ.setdefault("AUTO_CREATE_TABLES", "false")  # Disable for now
    os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:////tmp/churn_rescue.db")
    os.environ["VERCEL"] = "1"

    # Import app after setting environment variables
    from app.main import app
    # Replace handler with full app if import succeeds
    handler = Mangum(app, lifespan="off")
    print("Successfully loaded full backend app", file=sys.stderr)
except Exception as e:
    print(f"Failed to import main app, using test app: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc(file=sys.stderr)
