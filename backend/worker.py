"""
Background worker for processing document tasks.
Run with: python -m worker
"""
import sys
import time
import logging
from typing import Optional

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("worker")

# Add app to path
sys.path.insert(0, "/app")

from app.services.redis_service import get_redis_client
from app.services.task_service import task_service, TaskStatus, TaskType
from app.services.ocr_service import ocr_service
from app.services.gemini_ner_service import gemini_ner_service
from app.db.session import SessionLocal
from app.models.case import Case
from app.models.entity import Entity


class Worker:
    """Background worker for processing tasks from Redis Streams."""

    STREAM_NAME = "nomothetes:tasks"
    GROUP_NAME = "workers"
    CONSUMER_NAME = "worker-1"
    BLOCK_MS = 5000  # Block for 5 seconds waiting for new tasks

    def __init__(self):
        self.redis = get_redis_client()
        self._ensure_consumer_group()

    def _ensure_consumer_group(self):
        """Create consumer group if it doesn't exist."""
        try:
            self.redis.xgroup_create(
                self.STREAM_NAME,
                self.GROUP_NAME,
                id="0",
                mkstream=True
            )
            logger.info(f"Created consumer group {self.GROUP_NAME}")
        except Exception as e:
            if "BUSYGROUP" in str(e):
                logger.debug("Consumer group already exists")
            else:
                logger.error(f"Error creating consumer group: {e}")

    def run(self):
        """Main worker loop."""
        logger.info("Worker started, waiting for tasks...")

        while True:
            try:
                # Read from stream
                messages = self.redis.xreadgroup(
                    self.GROUP_NAME,
                    self.CONSUMER_NAME,
                    {self.STREAM_NAME: ">"},
                    count=1,
                    block=self.BLOCK_MS
                )

                if not messages:
                    continue

                for stream_name, stream_messages in messages:
                    for message_id, data in stream_messages:
                        self._process_message(message_id, data)

            except KeyboardInterrupt:
                logger.info("Worker shutting down...")
                break
            except Exception as e:
                logger.error(f"Error in worker loop: {e}")
                time.sleep(1)

    def _process_message(self, message_id: str, data: dict):
        """Process a single task message."""
        task_id = data.get("task_id")
        task_type = data.get("task_type")
        case_id = data.get("case_id")
        user_id = data.get("user_id")

        logger.info(f"Processing task {task_id}: {task_type}")

        try:
            # Update status to in_progress
            task_service.update_task_status(task_id, TaskStatus.IN_PROGRESS, progress=0)

            if task_type == TaskType.OCR.value:
                self._process_ocr(task_id, case_id, user_id)
            elif task_type == TaskType.ENTITY_EXTRACTION.value:
                self._process_entity_extraction(task_id, case_id, user_id)
            else:
                logger.warning(f"Unknown task type: {task_type}")
                task_service.update_task_status(
                    task_id,
                    TaskStatus.FAILED,
                    error=f"Unknown task type: {task_type}"
                )

            # Acknowledge message
            self.redis.xack(self.STREAM_NAME, self.GROUP_NAME, message_id)

        except Exception as e:
            logger.error(f"Task {task_id} failed: {e}")
            task_service.update_task_status(
                task_id,
                TaskStatus.FAILED,
                error=str(e)
            )
            # Still acknowledge to prevent infinite retry
            self.redis.xack(self.STREAM_NAME, self.GROUP_NAME, message_id)

    def _process_ocr(self, task_id: str, case_id: str, user_id: str):
        """Process OCR task."""
        db = SessionLocal()
        try:
            # Get case
            case = db.query(Case).filter(Case.case_id == case_id).first()
            if not case:
                raise ValueError(f"Case {case_id} not found")

            # Verify ownership
            if str(case.uploaded_by) != user_id:
                raise ValueError("User does not own this case")

            task_service.update_task_status(task_id, TaskStatus.IN_PROGRESS, progress=10)

            # Extract text
            file_path = case.file_path
            if not file_path:
                raise ValueError("No file path for case")

            logger.info(f"Extracting text from {file_path}")
            full_text, page_texts = ocr_service.extract_text_from_pdf(file_path)

            task_service.update_task_status(task_id, TaskStatus.IN_PROGRESS, progress=50)

            # Update case with extracted text
            case.raw_text = full_text
            case.status = "ocr_complete"
            db.commit()

            task_service.update_task_status(task_id, TaskStatus.IN_PROGRESS, progress=70)

            # Queue entity extraction task
            entity_task_id = task_service.create_task(
                TaskType.ENTITY_EXTRACTION,
                user_id,
                case_id
            )

            # Complete OCR task
            task_service.update_task_status(
                task_id,
                TaskStatus.COMPLETED,
                progress=100,
                result={
                    "pages": len(page_texts),
                    "characters": len(full_text),
                    "next_task_id": entity_task_id
                }
            )

            logger.info(f"OCR complete for case {case_id}, queued entity extraction {entity_task_id}")

        finally:
            db.close()

    def _process_entity_extraction(self, task_id: str, case_id: str, user_id: str):
        """Process entity extraction task."""
        db = SessionLocal()
        try:
            # Get case
            case = db.query(Case).filter(Case.case_id == case_id).first()
            if not case:
                raise ValueError(f"Case {case_id} not found")

            # Verify ownership
            if str(case.uploaded_by) != user_id:
                raise ValueError("User does not own this case")

            if not case.raw_text:
                raise ValueError("No text to extract entities from")

            task_service.update_task_status(task_id, TaskStatus.IN_PROGRESS, progress=10)

            # Extract entities using Gemini
            logger.info(f"Extracting entities from case {case_id} using Gemini")
            entities = gemini_ner_service.extract_entities(case.raw_text)
            entities = gemini_ner_service.deduplicate_entities(entities)

            task_service.update_task_status(task_id, TaskStatus.IN_PROGRESS, progress=50)

            # Store entities in database
            entity_count = 0
            for extracted in entities:
                entity = Entity(
                    case_id=case.case_id,
                    owner_user_id=case.uploaded_by,
                    entity_type=extracted.entity_type,
                    entity_name=extracted.entity_name,
                    normalized_name=extracted.entity_name.lower(),
                    confidence_score=extracted.confidence_score,
                    page_number=extracted.page_number
                )
                db.add(entity)
                entity_count += 1

            task_service.update_task_status(task_id, TaskStatus.IN_PROGRESS, progress=80)

            # Update case status
            case.status = "complete"
            db.commit()

            # Complete task
            task_service.update_task_status(
                task_id,
                TaskStatus.COMPLETED,
                progress=100,
                result={"entities_extracted": entity_count}
            )

            logger.info(f"Entity extraction complete for case {case_id}: {entity_count} entities")

        finally:
            db.close()


def main():
    """Entry point for worker."""
    worker = Worker()
    worker.run()


if __name__ == "__main__":
    main()
