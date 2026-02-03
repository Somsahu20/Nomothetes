from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID


class SearchResultItem(BaseModel):
    """Individual search result item."""
    id: UUID
    type: str  # "case" or "entity"
    title: str
    snippet: Optional[str] = None
    relevance: float = 0.0
    metadata: Dict[str, Any] = {}

    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    """Search response with results and pagination."""
    results: List[SearchResultItem]
    total: int
    page: int
    limit: int
    query: str
    search_type: str  # "all", "cases", "entities"
