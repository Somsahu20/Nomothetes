"""
Task service for managing background task status using in-memory storage.
Uses FastAPI BackgroundTasks instead of Redis.
"""
import uuid
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum
from collections import defaultdict

logger = logging.getLogger(__name__)


class TaskType(str, Enum):
    OCR = "ocr"
    ENTITY_EXTRACTION = "entity_extraction"


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class TaskData:
    """Task data structure."""
    task_id: str
    task_type: str
    user_id: str
    case_id: str
    status: str = TaskStatus.PENDING
    progress: int = 0
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: str = ""
    completed_at: Optional[str] = None


# In-memory task storage
_tasks: Dict[str, TaskData] = {}
_user_tasks: Dict[str, List[str]] = defaultdict(list)


class TaskService:
    """Service for managing background tasks using in-memory storage."""

    def create_task(
        self,
        task_type: TaskType,
        user_id: str,
        case_id: str
    ) -> str:
        """Create a new task."""
        task_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        task = TaskData(
            task_id=task_id,
            task_type=task_type.value,
            user_id=user_id,
            case_id=case_id,
            status=TaskStatus.PENDING.value,
            created_at=now
        )

        _tasks[task_id] = task
        _user_tasks[user_id].append(task_id)

        logger.info(f"Created task {task_id} of type {task_type.value}")
        return task_id

    def get_task(self, task_id: str) -> Optional[TaskData]:
        """Get task by ID."""
        return _tasks.get(task_id)

    def update_task_status(
        self,
        task_id: str,
        status: TaskStatus,
        progress: int = 0,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ) -> None:
        """Update task status."""
        task = _tasks.get(task_id)
        if not task:
            logger.warning(f"Task {task_id} not found")
            return

        task.status = status.value
        task.progress = progress

        if result:
            task.result = result
        if error:
            task.error = error
        if status in (TaskStatus.COMPLETED, TaskStatus.FAILED):
            task.completed_at = datetime.utcnow().isoformat()

        logger.info(f"Updated task {task_id}: status={status.value}, progress={progress}")

    def get_user_tasks(
        self,
        user_id: str,
        status_filter: Optional[str] = None,
        type_filter: Optional[str] = None,
        limit: int = 50
    ) -> List[TaskData]:
        """Get tasks for a user."""
        task_ids = _user_tasks.get(user_id, [])
        tasks = [_tasks[tid] for tid in task_ids if tid in _tasks]

        if status_filter:
            tasks = [t for t in tasks if t.status == status_filter]
        if type_filter:
            tasks = [t for t in tasks if t.task_type == type_filter]

        # Sort by created_at descending
        tasks.sort(key=lambda t: t.created_at, reverse=True)
        return tasks[:limit]


task_service = TaskService()
