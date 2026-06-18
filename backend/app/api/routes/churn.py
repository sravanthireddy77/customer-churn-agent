from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.repositories.churn_analyses import ChurnAnalysisRepository
from app.repositories.customers import CustomerRepository
from app.schemas.churn import (
    BatchAnalyzeRequest,
    ChurnAnalysisRecord,
    ChurnAnalysisResponse,
    CustomerSignalInput,
)
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.services.churn_agent import ChurnRescueAgent

router = APIRouter(prefix="/churn", tags=["Churn Analysis"])


@router.post("/analyze", response_model=ChurnAnalysisResponse)
async def analyze_customer(
    payload: CustomerSignalInput, db: Session = Depends(get_db)
) -> ChurnAnalysisResponse:
    _upsert_customer(db, payload)
    result = await ChurnRescueAgent().analyze(payload)
    ChurnAnalysisRepository(db).create(result)
    return result


@router.post("/analyze-batch", response_model=list[ChurnAnalysisResponse])
async def analyze_batch(
    payload: BatchAnalyzeRequest, db: Session = Depends(get_db)
) -> list[ChurnAnalysisResponse]:
    agent = ChurnRescueAgent()
    results: list[ChurnAnalysisResponse] = []
    repo = ChurnAnalysisRepository(db)
    for customer in payload.customers:
        _upsert_customer(db, customer)
        result = await agent.analyze(customer)
        repo.create(result)
        results.append(result)
    return results


@router.get("/results", response_model=list[ChurnAnalysisRecord])
def list_results(db: Session = Depends(get_db)) -> list[ChurnAnalysisRecord]:
    return list(ChurnAnalysisRepository(db).list())


@router.get("/results/{customer_id}", response_model=ChurnAnalysisRecord)
def latest_result(customer_id: str, db: Session = Depends(get_db)) -> ChurnAnalysisRecord:
    analysis = ChurnAnalysisRepository(db).latest_for_customer(customer_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Churn analysis not found")
    return analysis


def _upsert_customer(db: Session, payload: CustomerSignalInput) -> None:
    repo = CustomerRepository(db)
    customer = repo.get_by_customer_id(payload.customer_id)
    if not customer:
        repo.create(
            CustomerCreate(
                customer_id=payload.customer_id,
                name=payload.name or f"Customer {payload.customer_id}",
                domain=payload.domain,
                plan=payload.plan,
                tenure_months=payload.tenure_months,
                recent_usage=payload.recent_usage,
                sentiment=payload.sentiment,
                complaints=payload.complaints,
                billing_issues=payload.billing_issues,
                support_history=payload.support_history,
                metadata=payload.metadata,
            )
        )
        return

    repo.update(
        customer,
        CustomerUpdate(
            name=payload.name or customer.name,
            domain=payload.domain,
            plan=payload.plan,
            tenure_months=payload.tenure_months,
            recent_usage=payload.recent_usage,
            sentiment=payload.sentiment,
            complaints=payload.complaints,
            billing_issues=payload.billing_issues,
            support_history=payload.support_history,
            metadata=payload.metadata,
        ),
    )
