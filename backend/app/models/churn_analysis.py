from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.base import utcnow


class ChurnAnalysis(Base):
    __tablename__ = "churn_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    churn_score: Mapped[float] = mapped_column(Float, nullable=False)
    reasoning: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    root_cause: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_intervention: Mapped[str] = mapped_column(Text, nullable=False)
    follow_up_task: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
