from datetime import datetime
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, Field


class EntityResponse(BaseModel):
    """Entity in response."""
    entity_id: UUID
    entity_type: str
    entity_name: str
    normalized_name: Optional[str] = None
    confidence_score: Optional[Decimal] = None
    page_number: Optional[int] = None

    class Config:
        from_attributes = True


class EntityListItem(BaseModel):
    """Entity item in list response."""
    entity_id: UUID
    entity_name: str
    entity_type: str
    case_count: int = 0
    centrality_score: Optional[float] = None

    class Config:
        from_attributes = True


class EntityListResponse(BaseModel):
    """Paginated list of entities."""
    entities: List[EntityListItem]
    total: int
    page: int
    limit: int


class CaseEntitiesResponse(BaseModel):
    """Entities extracted from a case."""
    entities: List[EntityResponse]
    total: int


class EntityDetailResponse(BaseModel):
    """Detailed entity information."""
    entity_id: UUID
    entity_name: str
    entity_type: str
    aliases: List[str] = []
    case_count: int = 0
    metrics: dict = {}
    top_collaborators: List[dict] = []

    class Config:
        from_attributes = True


class EntityQueryParams(BaseModel):
    """Query parameters for entity listing."""
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    type: Optional[str] = None
    search: Optional[str] = None
