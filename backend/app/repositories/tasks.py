from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate


class TaskRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self, status: str | None = None, customer_id: str | None = None) -> list[Task]:
        statement = select(Task).order_by(Task.created_at.desc())
        if status:
            statement = statement.where(Task.status == status)
        if customer_id:
            statement = statement.where(Task.customer_id == customer_id)
        return list(self.db.scalars(statement).all())

    def get_by_task_id(self, task_id: str) -> Task | None:
        return self.db.scalar(select(Task).where(Task.task_id == task_id))

    def create(self, payload: TaskCreate, task_id: str) -> Task:
        task = Task(task_id=task_id, **payload.model_dump())
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update(self, task: Task, payload: TaskUpdate) -> Task:
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(task, key, value)
        self.db.commit()
        self.db.refresh(task)
        return task

    def delete(self, task: Task) -> None:
        self.db.delete(task)
        self.db.commit()
