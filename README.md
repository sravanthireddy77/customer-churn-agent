# Customer Churn Rescue Agent

Production-ready MVP for an AI-powered churn rescue agent across Telecom, Banking, and SaaS customers. The app accepts a retention goal, monitors customer signals, scores churn risk, explains reasoning before conclusions, recommends next-best actions, creates follow-up tasks, and simulates outreach campaigns.

## Stack

- Backend: Python 3.11, FastAPI, Pydantic, SQLAlchemy, PostgreSQL, Redis, RQ, Alembic, Pytest
- Frontend: React, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router, Axios, Recharts
- Agent: OpenAI-compatible chat completions when configured, deterministic rules fallback by default

## Run Locally

```bash
cp .env.example .env
docker compose up --build
```

Frontend: http://localhost:5173  
API: http://localhost:8000/api  
Swagger docs: http://localhost:8000/api/docs

The backend runs migrations and seeds demo customers and churn analyses on startup.

## Optional LLM Configuration

The app works without an API key. To use an OpenAI-compatible model, set these values in `.env`:

```bash
LLM_ENABLED=true
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

API keys are only read by the backend and are never exposed to the frontend.

## Core API

- `GET /api/health`
- `GET /api/agent/capabilities`
- `POST /api/agent/run`
- `GET /api/customers`
- `GET /api/customers/{customer_id}`
- `POST /api/customers`
- `PUT /api/customers/{customer_id}`
- `DELETE /api/customers/{customer_id}`
- `POST /api/churn/analyze`
- `POST /api/churn/analyze-batch`
- `GET /api/churn/results`
- `GET /api/churn/results/{customer_id}`
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/{task_id}`
- `DELETE /api/tasks/{task_id}`
- `POST /api/campaigns/trigger`

## Agent Output Contract

`POST /api/churn/analyze` returns only:

```json
{
  "customer_id": "TEL-7824A",
  "churn_score": 0.88,
  "reasoning": [
    "Usage has dropped 45% recently, showing a sharp decline in engagement."
  ],
  "root_cause": "Service reliability and billing dissatisfaction",
  "recommended_intervention": "Offer a 2-month 30% bill credit, correct the billing issue, and schedule priority network diagnostics.",
  "follow_up_task": "Create priority callback for TEL-7824A within 2 business days."
}
```

The service validates LLM responses against this schema. If the model fails, times out, or returns invalid JSON, the rules-based scoring engine takes over.

## Agent Run

`POST /api/agent/run` orchestrates an end-to-end rescue workflow:

1. Select customers by domain or explicit IDs.
2. Inspect churn signals for each selected customer.
3. Generate reasoning before root cause and recommendation.
4. Rank customers by churn score.
5. Optionally create follow-up tasks.
6. Optionally prepare simulated outreach events.

Example:

```json
{
  "goal": "Find critical churn risk and prepare retention work.",
  "domain": "Telecom",
  "max_customers": 10,
  "create_tasks": true,
  "trigger_campaigns": true,
  "campaign_type": "retention_email",
  "include_low_risk": false
}
```

## CSV Batch Format

Upload CSV files with these headers:

```csv
customer_id,name,domain,recent_usage,complaints,billing_issues,sentiment,support_history,plan,tenure_months
TEL-1001,Jordan Lee,Telecom,down 45% in past 3 months,Slow data speeds;Dropped calls,Overcharged $30 last cycle,Negative,3 calls in 2 months,Unlimited 5G,18
```

Use semicolons inside list fields.

## Backend Development

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=sqlite+pysqlite:///./churn_rescue.db
export AUTO_CREATE_TABLES=true
python -m app.db.seed
uvicorn app.main:app --reload
```

Run tests:

```bash
cd backend
pytest
```

Run migrations manually:

```bash
cd backend
alembic upgrade head
```

## Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_BASE_URL=http://localhost:8000/api` if the API is not on the default URL.

## Demo Workflow

1. Open the Agent page.
2. Give the agent a retention goal.
3. Choose domain/customer scope and autonomy settings.
4. Run the agent.
5. Review the reasoning trace before conclusions.
6. Inspect rescue plans, created tasks, and simulated outreach events.
