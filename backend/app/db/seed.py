from sqlalchemy import select

from app.db.database import SessionLocal
from app.models.churn_analysis import ChurnAnalysis
from app.models.customer import Customer
from app.schemas.churn import CustomerSignalInput
from app.services.fallback_scoring import run_fallback_analysis

SAMPLE_CUSTOMERS = [
    {
        "customer_id": "TEL-7824A",
        "name": "Jordan Lee",
        "domain": "Telecom",
        "recent_usage": "down 45% in past 3 months",
        "complaints": ["Slow data speeds", "Dropped calls"],
        "billing_issues": ["Overcharged $30 last cycle"],
        "sentiment": "Negative in last support call",
        "support_history": ["3 calls in 2 months"],
        "plan": "Unlimited 5G",
        "tenure_months": 18,
    },
    {
        "customer_id": "BNK-4412B",
        "name": "Avery Morgan",
        "domain": "Banking",
        "recent_usage": "Card transactions down 60% over 2 months",
        "complaints": ["Monthly maintenance fees too high"],
        "billing_issues": ["Unexpected overdraft fee"],
        "sentiment": "Frustrated after branch visit",
        "support_history": ["2 calls and 1 branch complaint"],
        "plan": "Premium Checking",
        "tenure_months": 42,
    },
    {
        "customer_id": "SAA-9031C",
        "name": "BrightOps Inc.",
        "domain": "SaaS",
        "recent_usage": "Weekly active users down 55% in 90 days",
        "complaints": ["Missing reporting feature", "Slow support response"],
        "billing_issues": [],
        "sentiment": "Neutral to negative in QBR",
        "support_history": ["4 unresolved tickets"],
        "plan": "Enterprise",
        "tenure_months": 27,
    },
    {
        "customer_id": "SAA-2209D",
        "name": "Northstar Analytics",
        "domain": "SaaS",
        "recent_usage": "Usage up 20% in past quarter",
        "complaints": [],
        "billing_issues": [],
        "sentiment": "Positive",
        "support_history": ["1 resolved ticket"],
        "plan": "Growth",
        "tenure_months": 9,
    },
    {
        "customer_id": "TEL-1190E",
        "name": "Maya Patel",
        "domain": "Telecom",
        "recent_usage": "Usage down 22% after device upgrade",
        "complaints": ["Confusing roaming charges"],
        "billing_issues": ["Roaming charge dispute"],
        "sentiment": "Concerned but cooperative",
        "support_history": ["1 billing chat"],
        "plan": "Family Unlimited",
        "tenure_months": 31,
    },
    {
        "customer_id": "BNK-8820F",
        "name": "Riverbend Studio",
        "domain": "Banking",
        "recent_usage": "ACH volume stable",
        "complaints": ["Mobile app deposits failed twice"],
        "billing_issues": [],
        "sentiment": "Neutral",
        "support_history": ["2 app support tickets"],
        "plan": "Small Business Banking",
        "tenure_months": 16,
    },
]


def seed() -> None:
    with SessionLocal() as db:
        for payload in SAMPLE_CUSTOMERS:
            customer = db.scalar(
                select(Customer).where(Customer.customer_id == payload["customer_id"])
            )
            if not customer:
                customer = Customer(
                    customer_id=payload["customer_id"],
                    name=payload["name"],
                    domain=payload["domain"],
                    plan=payload["plan"],
                    tenure_months=payload["tenure_months"],
                    recent_usage=payload["recent_usage"],
                    sentiment=payload["sentiment"],
                    complaints=payload["complaints"],
                    billing_issues=payload["billing_issues"],
                    support_history=payload["support_history"],
                    metadata_json={},
                )
                db.add(customer)

            existing_analysis = db.scalar(
                select(ChurnAnalysis).where(ChurnAnalysis.customer_id == payload["customer_id"])
            )
            if not existing_analysis:
                analysis = run_fallback_analysis(CustomerSignalInput(**payload))
                db.add(ChurnAnalysis(**analysis.model_dump()))
        db.commit()


if __name__ == "__main__":
    seed()
