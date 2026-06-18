import logging
import time

logger = logging.getLogger(__name__)


def simulate_campaign_delivery(event_id: int, payload: dict) -> dict:
    time.sleep(1)
    logger.info("Simulated campaign delivery", extra={"event_id": event_id, "payload": payload})
    return {"event_id": event_id, "status": "simulated_delivery_complete"}
