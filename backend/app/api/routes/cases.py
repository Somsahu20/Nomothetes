from datetime import date
from typing import Optional
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func


from app.db.session import get_db
from app.models.case import Case
from app.models.entity import Entity
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.case import (
    CaseUploadResponse,
    CaseListItem,
    CaseListResponse,
    CaseDetailResponse,
    CaseDeleteResponse
)
from app.schemas.entity import CaseEntitiesResponse, EntityResponse
from app.services.file_service import file_service
from app.services.task_service import task_service, TaskType
from app.services.processing_service import process_document, reprocess_entities
from app.schemas.case import CaseReprocessResponse
from app.core.config import settings

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/cases", tags=["Cases"])


@router.post("/upload", response_model=CaseUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_case(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    court_name: Optional[str] = Form(None),
    case_date: Optional[date] = Form(None),
    document_type: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a PDF document for processing."""
    # Validate file
    await file_service.validate_file(file)

    # Save file to disk
    file_path, filename = await file_service.save_file(file, str(current_user.user_id))

    # Create case record
    new_case = Case(
        uploaded_by=current_user.user_id,
        filename=filename,
        file_path=file_path,
        court_name=court_name,
        case_date=case_date,
        document_type=document_type,
        status="processing"
    )

    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    # Create processing task and run in background
    task_id = task_service.create_task(
        task_type=TaskType.OCR,
        user_id=str(current_user.user_id),
        case_id=str(new_case.case_id)
    )
    background_tasks.add_task(process_document, task_id, str(new_case.case_id), str(current_user.user_id))

    logger.info(f"Case {new_case.case_id} uploaded by user {current_user.user_id}")

    return CaseUploadResponse(
        case_id=new_case.case_id,
        filename=filename,
        status=new_case.status,
        task_id=task_id
    )


@router.get("", response_model=CaseListResponse)
async def list_cases(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    court: Optional[str] = Query(None),
    case_status: Optional[str] = Query(None, alias="status"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    sort: str = Query("upload_date"),
    order: str = Query("desc"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's cases with pagination and filters."""
    # Base query - only user's non-deleted cases
    query = db.query(Case).filter(
        Case.uploaded_by == current_user.user_id,
        Case.is_deleted == False
    )

    # Apply filters
    if court:
        query = query.filter(Case.court_name.ilike(f"%{court}%"))
    if case_status:
        query = query.filter(Case.status == case_status)
    if start_date:
        query = query.filter(Case.case_date >= start_date)
    if end_date:
        query = query.filter(Case.case_date <= end_date)

    # Get total count
    total = query.count()

    # Apply sorting
    sort_column = getattr(Case, sort, Case.upload_date)
    if order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Apply pagination
    offset = (page - 1) * limit
    cases = query.offset(offset).limit(limit).all()

    # Build response with entity counts
    case_items = []
    for case in cases:
        entity_count = db.query(func.count(Entity.entity_id)).filter(
            Entity.case_id == case.case_id
        ).scalar()

        case_items.append(CaseListItem(
            case_id=case.case_id,
            filename=case.filename,
            court_name=case.court_name,
            case_date=case.case_date,
            upload_date=case.upload_date,
            status=case.status,
            entity_count=entity_count or 0
        ))

    pages = (total + limit - 1) // limit

    return CaseListResponse(
        cases=case_items,
        total=total,
        page=page,
        limit=limit,
        pages=pages
    )


@router.get("/{case_id}", response_model=CaseDetailResponse)
async def get_case(
    case_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get case details."""
    case = db.query(Case).filter(
        Case.case_id == case_id,
        Case.is_deleted == False
    ).first()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    # Check ownership
    if case.uploaded_by != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Get entity count
    entity_count = db.query(func.count(Entity.entity_id)).filter(
        Entity.case_id == case_id
    ).scalar()

    # Check if has analysis (placeholder for now)
    has_analysis = False

    return CaseDetailResponse(
        case_id=case.case_id,
        filename=case.filename,
        court_name=case.court_name,
        case_date=case.case_date,
        document_type=case.document_type,
        upload_date=case.upload_date,
        status=case.status,
        raw_text=case.raw_text,
        entity_count=entity_count or 0,
        has_analysis=has_analysis
    )


@router.delete("/{case_id}", response_model=CaseDeleteResponse)
async def delete_case(
    case_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soft delete a case."""
    case = db.query(Case).filter(
        Case.case_id == case_id,
        Case.is_deleted == False
    ).first()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    # Check ownership
    if case.uploaded_by != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Soft delete
    case.is_deleted = True
    db.commit()

    logger.info(f"Case {case_id} deleted by user {current_user.user_id}")

    return CaseDeleteResponse(message="Case deleted")


@router.get("/{case_id}/entities", response_model=CaseEntitiesResponse)
async def get_case_entities(
    case_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get entities extracted from a case."""
    # Check case exists and user owns it
    case = db.query(Case).filter(
        Case.case_id == case_id,
        Case.is_deleted == False
    ).first()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    if case.uploaded_by != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Get entities
    entities = db.query(Entity).filter(Entity.case_id == case_id).all()

    entity_responses = [
        EntityResponse(
            entity_id=e.entity_id,
            entity_type=e.entity_type,
            entity_name=e.entity_name,
            normalized_name=e.normalized_name,
            confidence_score=e.confidence_score,
            page_number=e.page_number
        )
        for e in entities
    ]

    return CaseEntitiesResponse(
        entities=entity_responses,
        total=len(entity_responses)
    )


@router.post("/{case_id}/reprocess", response_model=CaseReprocessResponse)
async def reprocess_case(
    request: Request,
    case_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reprocess a case to re-extract entities with improved NER.
    This clears existing entities and queues a new extraction task.
    """
    # Check case exists and user owns it
    case = db.query(Case).filter(
        Case.case_id == case_id,
        Case.is_deleted == False
    ).first()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    if case.uploaded_by != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Check if case is already processing
    if case.status == "processing":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Case is already being processed"
        )

    # Check if case has raw text (required for entity extraction)
    if not case.raw_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Case has no extracted text. Please re-upload the document."
        )

    # Delete existing entities for this case
    deleted_count = db.query(Entity).filter(Entity.case_id == case_id).delete()
    logger.info(f"Deleted {deleted_count} existing entities for case {case_id}")

    # Update case status
    case.status = "processing"
    db.commit()

    # Create new entity extraction task and run in background
    task_id = task_service.create_task(
        task_type=TaskType.ENTITY_EXTRACTION,
        user_id=str(current_user.user_id),
        case_id=str(case_id)
    )
    background_tasks.add_task(reprocess_entities, task_id, str(case_id), str(current_user.user_id))

    logger.info(f"Case {case_id} queued for reprocessing by user {current_user.user_id}")

    return CaseReprocessResponse(
        case_id=case_id,
        status="processing",
        task_id=task_id,
        message="Case queued for entity re-extraction"
    )
