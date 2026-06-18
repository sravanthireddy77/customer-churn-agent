from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.agent import AgentRunRequest, AgentRunResponse
from app.services.agent_orchestrator import ChurnRescueOrchestrator
from app.services.churn_agent import CHURN_RESCUE_SYSTEM_PROMPT

router = APIRouter(prefix="/agent", tags=["Churn Rescue Agent"])


@router.get("/capabilities")
def capabilities() -> dict:
    return {
        "name": "ChurnRescueAgent",
        "mode": "agentic_orchestration",
        "can_analyze_customers": True,
        "can_rank_risk": True,
        "can_create_tasks": True,
        "can_trigger_campaigns": True,
        "reasoning_policy": "Reasoning is returned before conclusions and recommendations.",
        "runtime_prompt": CHURN_RESCUE_SYSTEM_PROMPT,
    }


@router.post("/run", response_model=AgentRunResponse)
async def run_agent(payload: AgentRunRequest, db: Session = Depends(get_db)) -> AgentRunResponse:
    return await ChurnRescueOrchestrator(db).run(payload)
