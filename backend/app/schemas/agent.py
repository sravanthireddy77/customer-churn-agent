from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

from app.schemas.campaign import CampaignEventRead, CampaignType
from app.schemas.churn import ChurnAnalysisResponse
from app.schemas.customer import Domain
from app.schemas.task import TaskRead

RiskLevel = Literal["low", "moderate", "high", "critical"]


class AgentRunRequest(BaseModel):
    goal: str = Field(
        default="Find churn risk, explain the cause, and prepare rescue actions.",
        min_length=5,
        max_length=500,
    )
    domain: Domain | None = None
    customer_ids: list[str] | None = Field(default=None, max_length=50)
    max_customers: int = Field(default=10, ge=1, le=100)
    create_tasks: bool = False
    trigger_campaigns: bool = False
    campaign_type: CampaignType = "retention_email"
    assigned_to: str | None = Field(default="Retention Team", max_length=255)
    include_low_risk: bool = False


class AgentAction(BaseModel):
    action_type: Literal["analyze_customer", "create_task", "trigger_campaign", "monitor"]
    customer_id: str
    status: Literal["completed", "skipped", "queued", "simulated"]
    detail: str


class AgentCustomerOutcome(BaseModel):
    customer_id: str
    name: str
    domain: Domain
    risk_level: RiskLevel
    analysis: ChurnAnalysisResponse
    action_summary: str


class DomainRiskCustomer(BaseModel):
    customer_id: str
    name: str
    risk_level: RiskLevel
    churn_score: float = Field(..., ge=0, le=1)
    root_cause: str
    recommended_intervention: str


class DomainRiskSummary(BaseModel):
    domain: Domain
    customers_analyzed: int
    at_risk_count: int
    critical_count: int
    high_count: int
    average_churn_score: float = Field(..., ge=0, le=1)
    top_risk_customer: DomainRiskCustomer | None
    at_risk_customers: list[DomainRiskCustomer]


class AgentRunResponse(BaseModel):
    run_id: str = Field(default_factory=lambda: f"RUN-{uuid4().hex[:10].upper()}")
    status: Literal["completed"]
    goal: str
    reasoning_trace: list[str]
    customer_outcomes: list[AgentCustomerOutcome]
    domain_risk_summary: list[DomainRiskSummary]
    actions: list[AgentAction]
    created_tasks: list[TaskRead]
    campaign_events: list[CampaignEventRead]
    summary: str
    next_steps: list[str]
