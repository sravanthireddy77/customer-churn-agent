from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.repositories.tasks import TaskRepository
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services.tasks import new_task_id

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=list[TaskRead])
def list_tasks(
    status_filter: str | None = Query(default=None, alias="status"),
    customer_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[TaskRead]:
    return list(TaskRepository(db).list(status=status_filter, customer_id=customer_id))


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)) -> TaskRead:
    return TaskRepository(db).create(payload, task_id=new_task_id())


@router.put("/{task_id}", response_model=TaskRead)
def update_task(task_id: str, payload: TaskUpdate, db: Session = Depends(get_db)) -> TaskRead:
    repo = TaskRepository(db)
    task = repo.get_by_task_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return repo.update(task, payload)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: str, db: Session = Depends(get_db)) -> Response:
    repo = TaskRepository(db)
    task = repo.get_by_task_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    repo.delete(task)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
