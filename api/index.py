import sys
import os
from pathlib import Path
import traceback

try:
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
    
except Exception as e:
    # If there's an error during import, create a simple error handler
    error_message = f"Import error: {str(e)}\n{traceback.format_exc()}"
    print(error_message, file=sys.stderr)
    
    # Create a minimal handler that returns the error
    def handler(event, context):
        return {
            "statusCode": 500,
            "body": error_message,
            "headers": {"Content-Type": "text/plain"}
        }
