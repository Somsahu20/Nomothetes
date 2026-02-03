import json
import uuid
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
from enum import Enum

from app.services.redis_service import redis_service, get_redis_client

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
    retry_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Redis storage."""
        data = asdict(self)
        if data["result"]:
            data["result"] = json.dumps(data["result"])
        else:
            data["result"] = ""
        if data["error"] is None:
            data["error"] = ""
        if data["completed_at"] is None:
            data["completed_at"] = ""
        return {k: str(v) for k, v in data.items()}

    @classmethod
    def from_dict(cls, data: Dict[str, str]) -> "TaskData":
        """Create from Redis hash data."""
        result = data.get("result", "")
        if result:
            try:
                result = json.loads(result)
            except json.JSONDecodeError:
                result = None
        else:
            result = None

        return cls(
            task_id=data.get("task_id", ""),
            task_type=data.get("task_type", ""),
            user_id=data.get("user_id", ""),
            case_id=data.get("case_id", ""),
            status=data.get("status", TaskStatus.PENDING),
            progress=int(data.get("progress", 0)),
            result=result,
            error=data.get("error", "") or None,
            created_at=data.get("created_at", ""),
            completed_at=data.get("completed_at", "") or None,
            retry_count=int(data.get("retry_count", 0))
        )


class TaskService:
    """Service for managing background tasks using Redis Streams."""

    STREAM_NAME = "nomothetes:tasks"
    TASK_TTL = 86400 * 7  # 7 days
    MAX_RETRIES = 3

    def __init__(self):
        self.redis = redis_service

    def create_task(
        self,
        task_type: TaskType,
        user_id: str,
        case_id: str
    ) -> str:
        """Create a new task and add to queue."""
        task_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        task = TaskData(
            task_id=task_id,
            task_type=task_type.value,
            user_id=user_id,
            case_id=case_id,
            status=TaskStatus.PENDING,
            created_at=now
        )

        # Store task data
        self.redis.set_task_status(task_id, task.to_dict(), self.TASK_TTL)

        # Add to stream for processing
        client = get_redis_client()
        client.xadd(self.STREAM_NAME, {
            "task_id": task_id,
            "task_type": task_type.value,
            "user_id": user_id,
            "case_id": case_id
        })

        logger.info(f"Created task {task_id} of type {task_type.value}")
        return task_id

    def get_task(self, task_id: str) -> Optional[TaskData]:
        """Get task by ID."""
        data = self.redis.get_task_status(task_id)
        if not data:
            return None
        return TaskData.from_dict(data)

    def update_task_status(
        self,
        task_id: str,
        status: TaskStatus,
        progress: int = 0,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ) -> None:
        """Update task status."""
        task = self.get_task(task_id)
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

        self.redis.set_task_status(task_id, task.to_dict(), self.TASK_TTL)
        logger.info(f"Updated task {task_id}: status={status.value}, progress={progress}")

    def get_user_tasks(
        self,
        user_id: str,
        status_filter: Optional[str] = None,
        type_filter: Optional[str] = None,
        limit: int = 50
    ) -> List[TaskData]:
        """Get tasks for a user."""
        # This is a simplified implementation
        # In production, you'd want to maintain a user->tasks index
        client = get_redis_client()
        tasks = []

        # Scan for task keys
        cursor = 0
        while True:
            cursor, keys = client.scan(cursor, match="task:*", count=100)
            for key in keys:
                data = client.hgetall(key)
                if data and data.get("user_id") == user_id:
                    if status_filter and data.get("status") != status_filter:
                        continue
                    if type_filter and data.get("task_type") != type_filter:
                        continue
                    tasks.append(TaskData.from_dict(data))
                    if len(tasks) >= limit:
                        break
            if cursor == 0 or len(tasks) >= limit:
                break

        # Sort by created_at descending
        tasks.sort(key=lambda t: t.created_at, reverse=True)
        return tasks[:limit]

    def retry_task(self, task_id: str) -> Optional[str]:
        """Retry a failed task."""
        task = self.get_task(task_id)
        if not task:
            return None

        if task.status != TaskStatus.FAILED:
            logger.warning(f"Cannot retry task {task_id} with status {task.status}")
            return None

        if task.retry_count >= self.MAX_RETRIES:
            logger.warning(f"Task {task_id} has exceeded max retries")
            return None

        # Create new task
        new_task_id = self.create_task(
            TaskType(task.task_type),
            task.user_id,
            task.case_id
        )

        # Update retry count
        new_task = self.get_task(new_task_id)
        if new_task:
            new_task.retry_count = task.retry_count + 1
            self.redis.set_task_status(new_task_id, new_task.to_dict(), self.TASK_TTL)

        return new_task_id

    def delete_task(self, task_id: str) -> bool:
        """Delete a task."""
        return self.redis.delete(f"task:{task_id}")


task_service = TaskService()
