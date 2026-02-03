from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, Field


class TaskResponse(BaseModel):
    """Task in response."""
    task_id: str
    task_type: str
    status: str
    progress: int = 0
    created_at: datetime
    case_id: Optional[UUID] = None

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    """List of tasks."""
    tasks: List[TaskResponse]
    total: int


class TaskStatusResponse(BaseModel):
    """Detailed task status."""
    task_id: str
    status: str
    progress: int = 0
    result: Optional[dict] = None
    error: Optional[str] = None
    completed_at: Optional[datetime] = None


class TaskRetryResponse(BaseModel):
    """Response after retrying a task."""
    message: str
    new_task_id: str


class TaskQueryParams(BaseModel):
    """Query parameters for task listing."""
    status: Optional[str] = None
    type: Optional[str] = None
    page: int = Field(default=1, ge=1)
