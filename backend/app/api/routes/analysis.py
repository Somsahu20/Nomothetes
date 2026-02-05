import logging

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session


from app.db.session import get_db
from app.models.case import Case
from app.models.analysis import AnalysisResult
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResultResponse,
    AnalysisListResponse,
    AnalysisTriggerResponse,
)
from app.services.gemini_analysis_service import gemini_analysis_service
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analysis", tags=["AI Analysis"])

VALID_ANALYSIS_TYPES = ["summary", "sentiment", "arguments"]


@router.get("/case/{case_id}", response_model=AnalysisListResponse)
async def get_case_analyses(
    case_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all AI analyses for a specific case."""
    # Verify case ownership
    case = db.query(Case).filter(
        Case.case_id == case_id,
        Case.uploaded_by == current_user.user_id,
        Case.is_deleted == False
    ).first()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    # Get all analyses for this case
    analyses = db.query(AnalysisResult).filter(
        AnalysisResult.case_id == case_id,
        AnalysisResult.owner_user_id == current_user.user_id
    ).order_by(AnalysisResult.created_at.desc()).all()

    return AnalysisListResponse(
        analyses=[AnalysisResultResponse.model_validate(a) for a in analyses],
        case_id=case_id
    )


@router.get("/case/{case_id}/{analysis_type}", response_model=AnalysisResultResponse)
async def get_specific_analysis(
    case_id: UUID,
    analysis_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific type of analysis for a case."""
    if analysis_type not in VALID_ANALYSIS_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid analysis type. Must be one of: {VALID_ANALYSIS_TYPES}"
        )

    # Verify case ownership
    case = db.query(Case).filter(
        Case.case_id == case_id,
        Case.uploaded_by == current_user.user_id,
        Case.is_deleted == False
    ).first()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    # Get the most recent analysis of this type
    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.case_id == case_id,
        AnalysisResult.owner_user_id == current_user.user_id,
        AnalysisResult.analysis_type == analysis_type
    ).order_by(AnalysisResult.created_at.desc()).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No {analysis_type} analysis found for this case"
        )

    return AnalysisResultResponse.model_validate(analysis)


@router.post("/case/{case_id}/analyze", response_model=AnalysisTriggerResponse)
async def trigger_analysis(
    request: Request,
    case_id: UUID,
    analysis_request: AnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger AI analysis on a case."""
    if analysis_request.analysis_type not in VALID_ANALYSIS_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid analysis type. Must be one of: {VALID_ANALYSIS_TYPES}"
        )

    # Verify case ownership and get case data
    case = db.query(Case).filter(
        Case.case_id == case_id,
        Case.uploaded_by == current_user.user_id,
        Case.is_deleted == False
    ).first()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    if not case.raw_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Case has no extracted text to analyze"
        )

    if case.status == "processing":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Case is still being processed. Please wait for completion."
        )

    # Check if analysis already exists
    existing = db.query(AnalysisResult).filter(
        AnalysisResult.case_id == case_id,
        AnalysisResult.owner_user_id == current_user.user_id,
        AnalysisResult.analysis_type == analysis_request.analysis_type
    ).first()

    if existing:
        # Return existing analysis
        return AnalysisTriggerResponse(
            message=f"Analysis already exists for this case",
            analysis_id=existing.analysis_id,
            analysis_type=existing.analysis_type,
            status="completed"
        )

    try:
        # Perform the analysis
        logger.info(f"Starting {analysis_request.analysis_type} analysis for case {case_id}")
        result_text = gemini_analysis_service.analyze_case(
            text=case.raw_text,
            analysis_type=analysis_request.analysis_type
        )

        if not result_text:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="AI analysis failed to generate results"
            )

        # Save analysis result
        analysis = AnalysisResult(
            case_id=case_id,
            owner_user_id=current_user.user_id,
            triggered_by=current_user.user_id,
            analysis_type=analysis_request.analysis_type,
            result_text=result_text
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        logger.info(f"Completed {analysis_request.analysis_type} analysis for case {case_id}")

        return AnalysisTriggerResponse(
            message=f"{analysis_request.analysis_type.capitalize()} analysis completed successfully",
            analysis_id=analysis.analysis_id,
            analysis_type=analysis.analysis_type,
            status="completed"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis failed for case {case_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@router.delete("/case/{case_id}/{analysis_type}")
async def delete_analysis(
    case_id: UUID,
    analysis_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a specific analysis to allow re-analysis."""
    if analysis_type not in VALID_ANALYSIS_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid analysis type. Must be one of: {VALID_ANALYSIS_TYPES}"
        )

    # Verify case ownership
    case = db.query(Case).filter(
        Case.case_id == case_id,
        Case.uploaded_by == current_user.user_id,
        Case.is_deleted == False
    ).first()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    # Delete the analysis
    deleted = db.query(AnalysisResult).filter(
        AnalysisResult.case_id == case_id,
        AnalysisResult.owner_user_id == current_user.user_id,
        AnalysisResult.analysis_type == analysis_type
    ).delete()

    db.commit()

    if deleted == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No {analysis_type} analysis found for this case"
        )

    return {"message": f"{analysis_type.capitalize()} analysis deleted successfully"}
