from sqlalchemy import JSON, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Customer(TimestampMixin, Base):
    __tablename__ = "customers"
    __table_args__ = (UniqueConstraint("customer_id", name="uq_customers_customer_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    plan: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tenure_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recent_usage: Mapped[str | None] = mapped_column(Text, nullable=True)
    sentiment: Mapped[str | None] = mapped_column(String(255), nullable=True)
    complaints: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    billing_issues: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    support_history: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)
