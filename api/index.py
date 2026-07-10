import sys
import os
from pathlib import Path

# Add backend directory to Python path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Set environment variables for Vercel
os.environ.setdefault("ENVIRONMENT", "production")
os.environ.setdefault("AUTO_CREATE_TABLES", "true")
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:////tmp/churn_rescue.db")

# Import app after setting environment variables
from app.main import app
from mangum import Mangum

# Create Mangum handler for AWS Lambda/Vercel
handler = Mangum(app, lifespan="off")
