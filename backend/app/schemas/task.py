from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

TaskPriority = Literal["low", "medium", "high", "urgent"]
TaskStatus = Literal["open", "in_progress", "completed"]


class TaskCreate(BaseModel):
    customer_id: str = Field(..., min_length=2, max_length=64)
    title: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=2)
    priority: TaskPriority = "medium"
    due_date: datetime | None = None
    status: TaskStatus = "open"
    assigned_to: str | None = Field(default=None, max_length=255)


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = Field(default=None, min_length=2)
    priority: TaskPriority | None = None
    due_date: datetime | None = None
    status: TaskStatus | None = None
    assigned_to: str | None = Field(default=None, max_length=255)


class TaskRead(TaskCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: str
    created_at: datetime
    updated_at: datetime
