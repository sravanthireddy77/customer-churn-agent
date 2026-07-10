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
        "customer_id": "CUST-001",
        "name": "Acme Corp",
        "domain": "Technology",
        "plan": "Enterprise",
        "tenure_months": 24,
        "recent_usage": "declining",
        "sentiment": "negative",
        "complaints": ["Slow support response", "Missing features"],
        "billing_issues": [],
        "support_history": ["Ticket #123", "Ticket #456"],
        "metadata": {},
        "created_at": (datetime.now() - timedelta(days=730)).isoformat(),
        "updated_at": datetime.now().isoformat()
    },
    {
        "id": 2,
        "customer_id": "CUST-002",
        "name": "Beta Inc",
        "domain": "Finance",
        "plan": "Professional",
        "tenure_months": 12,
        "recent_usage": "stable",
        "sentiment": "positive",
        "complaints": [],
        "billing_issues": [],
        "support_history": ["Ticket #789"],
        "metadata": {},
        "created_at": (datetime.now() - timedelta(days=365)).isoformat(),
        "updated_at": datetime.now().isoformat()
    }
]

mock_analyses = [
    {
        "id": 1,
        "customer_id": "CUST-001",
        "churn_score": 75.0,
        "reasoning": [
            "Usage declining over past 3 months",
            "Multiple support tickets with slow resolution",
            "Negative sentiment in recent interactions"
        ],
        "root_cause": "declining_usage",
        "recommended_intervention": "Schedule account review call with customer success team",
        "follow_up_task": "Contact within 48 hours",
        "created_at": datetime.now().isoformat()
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

@app.get("/api/churn/results")
def get_churn_results():
    return JSONResponse(mock_analyses)

@app.get("/api/churn/results/{customer_id}")
def get_churn_result(customer_id: int):
    analysis = next((a for a in mock_analyses if a["customer_id"] == customer_id), None)
    if analysis:
        return JSONResponse(analysis)
    return JSONResponse({"error": "Analysis not found"}, status_code=404)

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
