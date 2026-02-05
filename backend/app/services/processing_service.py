"""
Processing service for background document processing.
Handles OCR and entity extraction using FastAPI BackgroundTasks.
"""
import logging
from app.db.session import SessionLocal
from app.models.case import Case
from app.models.entity import Entity
from app.services.ocr_service import ocr_service
from app.services.gemini_ner_service import gemini_ner_service
from app.services.task_service import task_service, TaskStatus

logger = logging.getLogger(__name__)


def process_document(task_id: str, case_id: str, user_id: str):
    """
    Background task to process a document (OCR + entity extraction).
    This runs in a background thread via FastAPI BackgroundTasks.
    """
    db = SessionLocal()
    case = None
    try:
        case = db.query(Case).filter(Case.case_id == case_id).first()
        if not case:
            task_service.update_task_status(task_id, TaskStatus.FAILED, error="Case not found")
            return

        # Verify ownership
        if str(case.uploaded_by) != user_id:
            task_service.update_task_status(task_id, TaskStatus.FAILED, error="Access denied")
            return

        # OCR Phase
        task_service.update_task_status(task_id, TaskStatus.IN_PROGRESS, progress=10)

        file_path = case.file_path
        if not file_path:
            task_service.update_task_status(task_id, TaskStatus.FAILED, error="No file path for case")
            return

        logger.info(f"Extracting text from {file_path}")
        full_text, page_texts = ocr_service.extract_text_from_pdf(file_path)

        task_service.update_task_status(task_id, TaskStatus.IN_PROGRESS, progress=30)

        # Update case with extracted text
        case.raw_text = full_text
        case.status = "ocr_complete"
        db.commit()

        # Entity Extraction Phase
        task_service.update_task_status(task_id, TaskStatus.IN_PROGRESS, progress=50)

        logger.info(f"Extracting entities from case {case_id} using Gemini")
        entities = gemini_ner_service.extract_entities(full_text)
        entities = gemini_ner_service.deduplicate_entities(entities)

        task_service.update_task_status(task_id, TaskStatus.IN_PROGRESS, progress=80)

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

        # Update case status
        case.status = "complete"
        db.commit()

        # Complete task
        task_service.update_task_status(
            task_id,
            TaskStatus.COMPLETED,
            progress=100,
            result={
                "pages": len(page_texts),
                "characters": len(full_text),
                "entities_extracted": entity_count
            }
        )

        logger.info(f"Document processing complete for case {case_id}: {entity_count} entities")

    except Exception as e:
        logger.error(f"Document processing failed for case {case_id}: {e}")
        task_service.update_task_status(task_id, TaskStatus.FAILED, error=str(e))
        if case:
            case.status = "failed"
            db.commit()
    finally:
        db.close()


def reprocess_entities(task_id: str, case_id: str, user_id: str):
    """
    Background task to re-extract entities from existing text.
    This runs in a background thread via FastAPI BackgroundTasks.
    """
    db = SessionLocal()
    case = None
    try:
        case = db.query(Case).filter(Case.case_id == case_id).first()
        if not case:
            task_service.update_task_status(task_id, TaskStatus.FAILED, error="Case not found")
            return

        # Verify ownership
        if str(case.uploaded_by) != user_id:
            task_service.update_task_status(task_id, TaskStatus.FAILED, error="Access denied")
            return

        if not case.raw_text:
            task_service.update_task_status(task_id, TaskStatus.FAILED, error="No text to extract entities from")
            return

        task_service.update_task_status(task_id, TaskStatus.IN_PROGRESS, progress=20)

        # Extract entities using Gemini
        logger.info(f"Re-extracting entities from case {case_id} using Gemini")
        entities = gemini_ner_service.extract_entities(case.raw_text)
        entities = gemini_ner_service.deduplicate_entities(entities)

        task_service.update_task_status(task_id, TaskStatus.IN_PROGRESS, progress=70)

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

        logger.info(f"Entity re-extraction complete for case {case_id}: {entity_count} entities")

    except Exception as e:
        logger.error(f"Entity re-extraction failed for case {case_id}: {e}")
        task_service.update_task_status(task_id, TaskStatus.FAILED, error=str(e))
        if case:
            case.status = "failed"
            db.commit()
    finally:
        db.close()
