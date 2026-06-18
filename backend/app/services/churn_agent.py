import json
import logging

import httpx
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.schemas.churn import ChurnAnalysisResponse, CustomerSignalInput
from app.services.fallback_scoring import run_fallback_analysis

logger = logging.getLogger(__name__)

CHURN_RESCUE_SYSTEM_PROMPT = """You are a Customer Churn Rescue Agent for Telecom, Banking, and SaaS businesses.

Your job is to analyze customer records and identify churn risk.

You must examine:
- Usage changes
- Complaints
- Billing issues
- Customer sentiment
- Support history
- Plan or subscription details
- Tenure
- Payment issues
- Product adoption
- Downgrade or cancellation signals
- Competitor mentions

For each customer, determine:
1. The likelihood that the customer will churn
2. The key signals causing churn risk
3. The probable root cause
4. The next-best retention action
5. Any follow-up task that should be created

You must always provide concise step-by-step reasoning before giving the root cause or recommendation.

Your response must be valid JSON only.

Use this exact schema:

{
  "customer_id": "string",
  "churn_score": 0.0,
  "reasoning": [
    "Step-by-step explanation of signal 1.",
    "Step-by-step explanation of signal 2.",
    "Step-by-step explanation of signal 3."
  ],
  "recommended_intervention": "Personalized retention offer or message.",
  "root_cause": "Short root cause summary.",
  "follow_up_task": "Follow-up task text or null"
}

Scoring guide:
- 0.00 to 0.25: Low churn risk
- 0.26 to 0.50: Moderate churn risk
- 0.51 to 0.75: High churn risk
- 0.76 to 1.00: Critical churn risk

Recommendation rules:
- If billing issues are present, include apology, correction, and credit/refund where appropriate.
- If usage is declining, recommend onboarding, training, plan optimization, or success outreach.
- If complaints are repeated, recommend escalation or priority support.
- If sentiment is negative, use empathetic language.
- If customer is high value or long-tenured, include white-glove support.
- If SaaS adoption is low, recommend enablement session or customer success outreach.
- If Banking customer has fee complaints, recommend fee review or waiver.
- If Telecom customer has service quality complaints, recommend technical diagnostics and temporary credit.

Keep the reasoning concise but clear.

Never omit:
- churn_score
- reasoning
- root_cause
- recommended_intervention
"""


class ChurnRescueAgent:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def analyze(self, customer: CustomerSignalInput) -> ChurnAnalysisResponse:
        if self.settings.llm_enabled and self.settings.openai_api_key:
            try:
                return await self._analyze_with_llm(customer)
            except Exception:
                logger.exception("LLM churn analysis failed. Falling back to deterministic scoring.")
        return run_fallback_analysis(customer)

    async def analyze_batch(self, customers: list[CustomerSignalInput]) -> list[ChurnAnalysisResponse]:
        return [await self.analyze(customer) for customer in customers]

    async def _analyze_with_llm(self, customer: CustomerSignalInput) -> ChurnAnalysisResponse:
        url = f"{self.settings.openai_base_url.rstrip('/')}/chat/completions"
        payload = {
            "model": self.settings.openai_model,
            "messages": [
                {"role": "system", "content": CHURN_RESCUE_SYSTEM_PROMPT},
                {"role": "user", "content": customer.model_dump_json()},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        headers = {
            "Authorization": f"Bearer {self.settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=self.settings.openai_timeout_seconds) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

        content = data["choices"][0]["message"]["content"]
        try:
            parsed = json.loads(content)
            return ChurnAnalysisResponse.model_validate(parsed)
        except (json.JSONDecodeError, KeyError, ValidationError) as exc:
            raise ValueError("LLM response did not match churn analysis schema") from exc
