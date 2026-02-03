from typing import Optional, List, Dict, Any
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.session import get_db
from app.models.entity import Entity
from app.models.case import Case
from app.models.user import User
from app.api.deps import get_current_user
from app.services.network_service import network_service
from app.core.config import settings

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/network", tags=["Network"])


# Response schemas
class NetworkNode(BaseModel):
    id: str
    label: str
    type: str
    case_count: int
    case_ids: List[str]
    entity_ids: List[str]


class NetworkEdge(BaseModel):
    id: str
    source: str
    target: str
    weight: int


class NetworkStats(BaseModel):
    total_nodes: int
    total_edges: int
    entity_types: Dict[str, int]
    avg_connections: float


class NetworkGraphResponse(BaseModel):
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]
    stats: NetworkStats


class EntityConnection(BaseModel):
    name: str
    type: str
    count: int


class EntityCase(BaseModel):
    case_id: str
    filename: str
    court_name: Optional[str] = None
    case_date: Optional[str] = None


class EntityDetailResponse(BaseModel):
    entity_name: str
    entity_type: str
    normalized_name: Optional[str] = None
    occurrence_count: int
    case_count: int
    cases: List[EntityCase]
    top_connections: List[EntityConnection]


class EntityListItem(BaseModel):
    entity_id: UUID
    entity_name: str
    entity_type: str
    case_count: int


class EntityListResponse(BaseModel):
    entities: List[EntityListItem]
    total: int


@router.get("/graph", response_model=NetworkGraphResponse)
@limiter.limit(settings.RATE_LIMIT_NETWORK_GRAPH)
async def get_network_graph(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the entity network graph for the current user."""
    result = network_service.get_entity_connections(db, current_user.user_id)
    return NetworkGraphResponse(**result)


@router.get("/entities", response_model=EntityListResponse)
async def list_entities(
    entity_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List unique entities across all user's cases."""
    # Build base query - get unique entities with case counts
    query = db.query(
        Entity.entity_name,
        Entity.entity_type,
        func.count(func.distinct(Entity.case_id)).label('case_count'),
        func.min(Entity.entity_id).label('entity_id')
    ).join(Case).filter(
        Entity.owner_user_id == current_user.user_id,
        Case.is_deleted == False
    ).group_by(Entity.entity_name, Entity.entity_type)

    # Apply filters
    if entity_type:
        query = query.filter(Entity.entity_type == entity_type)

    if search:
        query = query.filter(Entity.entity_name.ilike(f"%{search}%"))

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (page - 1) * limit
    results = query.order_by(func.count(func.distinct(Entity.case_id)).desc()).offset(offset).limit(limit).all()

    entities = [
        EntityListItem(
            entity_id=r.entity_id,
            entity_name=r.entity_name,
            entity_type=r.entity_type,
            case_count=r.case_count
        )
        for r in results
    ]

    return EntityListResponse(entities=entities, total=total)


@router.get("/entities/{entity_name}", response_model=EntityDetailResponse)
async def get_entity_detail(
    entity_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific entity."""
    result = network_service.get_entity_detail(db, current_user.user_id, entity_name)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entity not found"
        )

    return EntityDetailResponse(**result)


@router.get("/stats")
async def get_network_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get network statistics for the current user."""
    # Total entities
    total_entities = db.query(func.count(func.distinct(Entity.entity_name))).filter(
        Entity.owner_user_id == current_user.user_id
    ).scalar() or 0

    # Entities by type
    type_counts = db.query(
        Entity.entity_type,
        func.count(func.distinct(Entity.entity_name))
    ).filter(
        Entity.owner_user_id == current_user.user_id
    ).group_by(Entity.entity_type).all()

    # Total cases with entities
    cases_with_entities = db.query(func.count(func.distinct(Entity.case_id))).filter(
        Entity.owner_user_id == current_user.user_id
    ).scalar() or 0

    # Most connected entities (appear in most cases)
    top_entities = db.query(
        Entity.entity_name,
        Entity.entity_type,
        func.count(func.distinct(Entity.case_id)).label('case_count')
    ).join(Case).filter(
        Entity.owner_user_id == current_user.user_id,
        Case.is_deleted == False
    ).group_by(
        Entity.entity_name, Entity.entity_type
    ).order_by(
        func.count(func.distinct(Entity.case_id)).desc()
    ).limit(10).all()

    return {
        "total_unique_entities": total_entities,
        "cases_with_entities": cases_with_entities,
        "entity_type_counts": {t: c for t, c in type_counts},
        "top_entities": [
            {"name": e.entity_name, "type": e.entity_type, "case_count": e.case_count}
            for e in top_entities
        ]
    }
