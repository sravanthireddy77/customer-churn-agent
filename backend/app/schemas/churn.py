from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.customer import Domain


class CustomerSignalInput(BaseModel):
    customer_id: str = Field(..., min_length=2, max_length=64)
    name: str | None = Field(default=None, max_length=255)
    domain: Domain
    recent_usage: str | None = None
    complaints: list[str] = Field(default_factory=list)
    billing_issues: list[str] = Field(default_factory=list)
    sentiment: str | None = Field(default=None, max_length=255)
    support_history: list[str] = Field(default_factory=list)
    plan: str | None = Field(default=None, max_length=255)
    tenure_months: int | None = Field(default=None, ge=0, le=600)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("complaints", "billing_issues", "support_history")
    @classmethod
    def compact_string_lists(cls, value: list[str]) -> list[str]:
        return [item.strip() for item in value if item and item.strip()]


class ChurnAnalysisResponse(BaseModel):
    customer_id: str
    churn_score: float = Field(..., ge=0, le=1)
    reasoning: list[str] = Field(..., min_length=1)
    root_cause: str
    recommended_intervention: str
    follow_up_task: str | None = None


class ChurnAnalysisRecord(ChurnAnalysisResponse):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class BatchAnalyzeRequest(BaseModel):
    customers: list[CustomerSignalInput] = Field(..., min_length=1, max_length=100)
