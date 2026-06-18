from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Task(TimestampMixin, Base):
    __tablename__ = "tasks"
    __table_args__ = (UniqueConstraint("task_id", name="uq_tasks_task_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    customer_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(32), default="medium", nullable=False)
    due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="open", nullable=False)
    assigned_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
