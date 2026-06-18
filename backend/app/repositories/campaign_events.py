from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.campaign_event import CampaignEvent
from app.schemas.campaign import CampaignTriggerRequest


class CampaignEventRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, payload: CampaignTriggerRequest, status: str = "simulated") -> CampaignEvent:
        event = CampaignEvent(
            customer_id=payload.customer_id,
            campaign_type=payload.campaign_type,
            payload=payload.payload,
            status=status,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def list(self) -> list[CampaignEvent]:
        return list(
            self.db.scalars(select(CampaignEvent).order_by(CampaignEvent.created_at.desc())).all()
        )
