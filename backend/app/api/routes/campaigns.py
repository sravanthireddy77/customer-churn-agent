from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.repositories.campaign_events import CampaignEventRepository
from app.repositories.customers import CustomerRepository
from app.schemas.campaign import CampaignEventRead, CampaignTriggerRequest
from app.services.campaigns import enqueue_campaign_event

router = APIRouter(prefix="/campaigns", tags=["Campaign Simulation"])


@router.post("/trigger", response_model=CampaignEventRead, status_code=status.HTTP_201_CREATED)
def trigger_campaign(
    payload: CampaignTriggerRequest, db: Session = Depends(get_db)
) -> CampaignEventRead:
    if not CustomerRepository(db).get_by_customer_id(payload.customer_id):
        raise HTTPException(status_code=404, detail="Customer not found")

    repo = CampaignEventRepository(db)
    event = repo.create(payload, status="simulated")
    if enqueue_campaign_event(event.id, payload):
        event.status = "queued"
        db.commit()
        db.refresh(event)
    return event
