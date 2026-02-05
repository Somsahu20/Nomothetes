from typing import Optional
from datetime import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.task import (
    TaskResponse,
    TaskListResponse,
    TaskStatusResponse
)
from app.services.task_service import task_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    task_status: Optional[str] = Query(None, alias="status"),
    task_type: Optional[str] = Query(None, alias="type"),
    page: int = Query(1, ge=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's tasks."""
    tasks = task_service.get_user_tasks(
        user_id=str(current_user.user_id),
        status_filter=task_status,
        type_filter=task_type,
        limit=50
    )

    task_responses = []
    for task in tasks:
        try:
            created_at = datetime.fromisoformat(task.created_at) if task.created_at else datetime.utcnow()
        except ValueError:
            created_at = datetime.utcnow()

        task_responses.append(TaskResponse(
            task_id=task.task_id,
            task_type=task.task_type,
            status=task.status,
            progress=task.progress,
            created_at=created_at,
            case_id=task.case_id if task.case_id else None
        ))

    return TaskListResponse(
        tasks=task_responses,
        total=len(task_responses)
    )


@router.get("/{task_id}/status", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get task status."""
    task = task_service.get_task(task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Check ownership
    if task.user_id != str(current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    completed_at = None
    if task.completed_at:
        try:
            completed_at = datetime.fromisoformat(task.completed_at)
        except ValueError:
            pass

    return TaskStatusResponse(
        task_id=task.task_id,
        status=task.status,
        progress=task.progress,
        result=task.result,
        error=task.error,
        completed_at=completed_at
    )
