import sys
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta

# Create a minimal test app with mock data
app = FastAPI()

# Mock data
mock_customers = [
    {
        "id": 1,
        "name": "Acme Corp",
        "email": "contact@acme.com",
        "industry": "Technology",
        "signup_date": (datetime.now() - timedelta(days=365)).isoformat(),
        "last_interaction": (datetime.now() - timedelta(days=5)).isoformat(),
        "support_tickets": 3,
        "usage_trend": "declining",
        "sentiment_score": 6.5,
        "payment_delays": 0
    },
    {
        "id": 2,
        "name": "Beta Inc",
        "email": "info@beta.com",
        "industry": "Finance",
        "signup_date": (datetime.now() - timedelta(days=200)).isoformat(),
        "last_interaction": (datetime.now() - timedelta(days=2)).isoformat(),
        "support_tickets": 1,
        "usage_trend": "stable",
        "sentiment_score": 8.0,
        "payment_delays": 0
    }
]

mock_analyses = [
    {
        "id": 1,
        "customer_id": 1,
        "customer_name": "Acme Corp",
        "churn_probability": 0.75,
        "risk_level": "high",
        "health_score": 45,
        "created_at": datetime.now().isoformat(),
        "root_causes": ["declining_usage", "support_issues"],
        "sentiment": "negative"
    }
]

@app.get("/api/test")
def test_endpoint():
    return JSONResponse({"status": "working", "message": "FastAPI is working on Vercel!", "backend": "minimal"})

@app.get("/api/health")
def health():
    return JSONResponse({"status": "ok", "environment": "vercel", "backend": "minimal"})

@app.get("/api/customers")
def get_customers():
    return JSONResponse(mock_customers)

@app.get("/api/customers/{customer_id}")
def get_customer(customer_id: int):
    customer = next((c for c in mock_customers if c["id"] == customer_id), None)
    if customer:
        return JSONResponse(customer)
    return JSONResponse({"error": "Customer not found"}, status_code=404)

@app.get("/api/churn")
def get_churn_analyses():
    return JSONResponse(mock_analyses)

@app.get("/api/tasks")
def get_tasks():
    return JSONResponse([])

@app.post("/api/agent/run")
def run_agent():
    return JSONResponse({
        "status": "info",
        "message": "Full backend is not loaded yet. Using minimal mock API.",
        "backend": "minimal"
    })

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
