from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.schemas.churn import ChurnAnalysisResponse
from app.schemas.task import TaskCreate


def new_task_id() -> str:
    return f"TASK-{uuid4().hex[:10].upper()}"


def task_from_analysis(analysis: ChurnAnalysisResponse, assigned_to: str | None = None) -> TaskCreate:
    priority = "urgent" if analysis.churn_score >= 0.76 else "high" if analysis.churn_score >= 0.51 else "medium"
    due_date = datetime.now(UTC) + timedelta(days=2 if priority == "urgent" else 5)
    return TaskCreate(
        customer_id=analysis.customer_id,
        title="Retention follow-up",
        description=analysis.follow_up_task or analysis.recommended_intervention,
        priority=priority,
        due_date=due_date,
        assigned_to=assigned_to,
    )
