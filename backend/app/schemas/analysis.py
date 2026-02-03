from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


class AnalysisRequest(BaseModel):
    """Request to perform AI analysis on a case."""
    analysis_type: str  # summary, sentiment, arguments


class AnalysisResultResponse(BaseModel):
    """Response containing analysis result."""
    analysis_id: UUID
    case_id: UUID
    analysis_type: str
    result_text: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AnalysisListResponse(BaseModel):
    """List of analysis results for a case."""
    analyses: List[AnalysisResultResponse]
    case_id: UUID


class AnalysisTriggerResponse(BaseModel):
    """Response when triggering a new analysis."""
    message: str
    analysis_id: UUID
    analysis_type: str
    status: str  # pending, completed, failed


class SentimentData(BaseModel):
    """Parsed sentiment analysis data."""
    overall_sentiment: Optional[str] = None
    tone: Optional[str] = None
    confidence_level: Optional[str] = None
    key_observations: Optional[List[str]] = None
    party_sentiments: Optional[Dict[str, str]] = None
    judicial_tone: Optional[str] = None
    summary: Optional[str] = None
    raw_analysis: Optional[str] = None
    parse_error: Optional[bool] = False
