from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate


class CustomerRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self, domain: str | None = None, search: str | None = None) -> list[Customer]:
        statement = select(Customer).order_by(Customer.created_at.desc())
        if domain:
            statement = statement.where(Customer.domain == domain)
        if search:
            term = f"%{search.lower()}%"
            statement = statement.where(Customer.name.ilike(term) | Customer.customer_id.ilike(term))
        return list(self.db.scalars(statement).all())

    def get_by_customer_id(self, customer_id: str) -> Customer | None:
        return self.db.scalar(select(Customer).where(Customer.customer_id == customer_id))

    def create(self, payload: CustomerCreate) -> Customer:
        customer = Customer(
            customer_id=payload.customer_id,
            name=payload.name,
            domain=payload.domain,
            plan=payload.plan,
            tenure_months=payload.tenure_months,
            recent_usage=payload.recent_usage,
            sentiment=payload.sentiment,
            complaints=payload.complaints,
            billing_issues=payload.billing_issues,
            support_history=payload.support_history,
            metadata_json=payload.metadata,
        )
        self.db.add(customer)
        self.db.commit()
        self.db.refresh(customer)
        return customer

    def update(self, customer: Customer, payload: CustomerUpdate) -> Customer:
        updates = payload.model_dump(exclude_unset=True)
        if "metadata" in updates:
            customer.metadata_json = updates.pop("metadata") or {}
        for key, value in updates.items():
            setattr(customer, key, value)
        self.db.commit()
        self.db.refresh(customer)
        return customer

    def delete(self, customer: Customer) -> None:
        self.db.delete(customer)
        self.db.commit()
