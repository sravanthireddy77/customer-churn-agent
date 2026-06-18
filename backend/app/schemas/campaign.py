from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

CampaignType = Literal[
    "retention_email",
    "crm_task",
    "notify_account_manager",
    "schedule_callback",
    "win_back_campaign",
]


class CampaignTriggerRequest(BaseModel):
    customer_id: str = Field(..., min_length=2, max_length=64)
    campaign_type: CampaignType
    payload: dict[str, Any] = Field(default_factory=dict)


class CampaignEventRead(CampaignTriggerRequest):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    created_at: datetime
