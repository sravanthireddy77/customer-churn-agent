from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Domain = Literal["Telecom", "Banking", "SaaS"]


class CustomerBase(BaseModel):
    customer_id: str = Field(..., min_length=2, max_length=64)
    name: str = Field(..., min_length=1, max_length=255)
    domain: Domain
    plan: str | None = Field(default=None, max_length=255)
    tenure_months: int | None = Field(default=None, ge=0, le=600)
    recent_usage: str | None = None
    sentiment: str | None = Field(default=None, max_length=255)
    complaints: list[str] = Field(default_factory=list)
    billing_issues: list[str] = Field(default_factory=list)
    support_history: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("complaints", "billing_issues", "support_history")
    @classmethod
    def compact_string_lists(cls, value: list[str]) -> list[str]:
        return [item.strip() for item in value if item and item.strip()]


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    domain: Domain | None = None
    plan: str | None = Field(default=None, max_length=255)
    tenure_months: int | None = Field(default=None, ge=0, le=600)
    recent_usage: str | None = None
    sentiment: str | None = Field(default=None, max_length=255)
    complaints: list[str] | None = None
    billing_issues: list[str] | None = None
    support_history: list[str] | None = None
    metadata: dict[str, Any] | None = None


class CustomerRead(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
