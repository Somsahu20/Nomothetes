from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class CaseUploadResponse(BaseModel):
    """Response after uploading a case."""
    case_id: UUID
    filename: str
    status: str
    task_id: str

    class Config:
        from_attributes = True


class CaseListItem(BaseModel):
    """Case item in list response."""
    case_id: UUID
    filename: str
    court_name: Optional[str] = None
    case_date: Optional[date] = None
    upload_date: datetime
    status: str
    entity_count: int = 0

    class Config:
        from_attributes = True


class CaseListResponse(BaseModel):
    """Paginated list of cases."""
    cases: List[CaseListItem]
    total: int
    page: int
    limit: int
    pages: int


class CaseDetailResponse(BaseModel):
    """Detailed case information."""
    case_id: UUID
    filename: str
    court_name: Optional[str] = None
    case_date: Optional[date] = None
    document_type: Optional[str] = None
    upload_date: datetime
    status: str
    raw_text: Optional[str] = None
    entity_count: int = 0
    has_analysis: bool = False

    class Config:
        from_attributes = True


class CaseDeleteResponse(BaseModel):
    """Response after deleting a case."""
    message: str


class CaseReprocessResponse(BaseModel):
    """Response after reprocessing a case."""
    case_id: UUID
    status: str
    task_id: str
    message: str


class CaseQueryParams(BaseModel):
    """Query parameters for case listing."""
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    court: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    sort: str = Field(default="upload_date")
    order: str = Field(default="desc", pattern="^(asc|desc)$")
