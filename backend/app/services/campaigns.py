import logging

from redis import Redis
from rq import Queue

from app.core.config import get_settings
from app.schemas.campaign import CampaignTriggerRequest

logger = logging.getLogger(__name__)


def enqueue_campaign_event(event_id: int, payload: CampaignTriggerRequest) -> bool:
    settings = get_settings()
    try:
        queue = Queue("campaigns", connection=Redis.from_url(settings.redis_url))
        queue.enqueue(
            "app.workers.jobs.simulate_campaign_delivery",
            event_id,
            payload.model_dump(),
            job_timeout=30,
        )
        return True
    except Exception:
        logger.info("Redis queue unavailable; campaign event remains simulated.", exc_info=True)
        return False
