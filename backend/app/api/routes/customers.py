from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.customer import Customer
from app.repositories.customers import CustomerRepository
from app.schemas.customer import CustomerCreate, CustomerRead, CustomerUpdate

router = APIRouter(prefix="/customers", tags=["Customers"])


def to_customer_read(customer: Customer) -> CustomerRead:
    return CustomerRead(
        id=customer.id,
        customer_id=customer.customer_id,
        name=customer.name,
        domain=customer.domain,
        plan=customer.plan,
        tenure_months=customer.tenure_months,
        recent_usage=customer.recent_usage,
        sentiment=customer.sentiment,
        complaints=customer.complaints or [],
        billing_issues=customer.billing_issues or [],
        support_history=customer.support_history or [],
        metadata=customer.metadata_json or {},
        created_at=customer.created_at,
        updated_at=customer.updated_at,
    )


@router.get("", response_model=list[CustomerRead])
def list_customers(
    domain: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[CustomerRead]:
    customers = CustomerRepository(db).list(domain=domain, search=search)
    return [to_customer_read(customer) for customer in customers]


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(customer_id: str, db: Session = Depends(get_db)) -> CustomerRead:
    customer = CustomerRepository(db).get_by_customer_id(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return to_customer_read(customer)


@router.post("", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)) -> CustomerRead:
    repo = CustomerRepository(db)
    if repo.get_by_customer_id(payload.customer_id):
        raise HTTPException(status_code=409, detail="Customer already exists")
    return to_customer_read(repo.create(payload))


@router.put("/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: str, payload: CustomerUpdate, db: Session = Depends(get_db)
) -> CustomerRead:
    repo = CustomerRepository(db)
    customer = repo.get_by_customer_id(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return to_customer_read(repo.update(customer, payload))


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: str, db: Session = Depends(get_db)) -> Response:
    repo = CustomerRepository(db)
    customer = repo.get_by_customer_id(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    repo.delete(customer)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
