import sys
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import JSONResponse

# Create a minimal test app
app = FastAPI()

@app.get("/api/test")
def test_endpoint():
    return JSONResponse({"status": "working", "message": "FastAPI is working on Vercel!"})

@app.get("/api/health")
def health():
    return JSONResponse({"status": "ok", "environment": "vercel"})

@app.get("/api/customers")
def get_customers():
    return JSONResponse([])

@app.get("/api/churn")
def get_churn_analyses():
    return JSONResponse([])

# Try to import the full backend app
try:
    # Add backend directory to Python path
    backend_path = Path(__file__).parent.parent / "backend"
    sys.path.insert(0, str(backend_path))

    # Set environment variables
    os.environ.setdefault("ENVIRONMENT", "production")
    os.environ.setdefault("AUTO_CREATE_TABLES", "false")
    os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:////tmp/churn_rescue.db")
    os.environ["VERCEL"] = "1"

    # Import and replace with full app
    from app.main import app as backend_app
    app = backend_app
    print("Successfully loaded full backend app", file=sys.stderr)
except Exception as e:
    print(f"Using minimal app - backend import failed: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc(file=sys.stderr)
