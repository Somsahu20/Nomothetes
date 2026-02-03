import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, text, or_
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.session import get_db
from app.models.case import Case
from app.models.entity import Entity
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.search import SearchResponse, SearchResultItem
from app.core.config import settings

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=SearchResponse)
@limiter.limit(settings.RATE_LIMIT_SEARCH)
async def search(
    request: Request,
    q: str = Query(..., min_length=1, max_length=500, description="Search query"),
    type: str = Query("all", regex="^(all|cases|entities)$", description="Search type filter"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Results per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Global search across cases and entities.

    Uses PostgreSQL full-text search for cases (tsvector) and ILIKE for entities.
    """
    user_id = current_user.user_id
    offset = (page - 1) * limit
    results = []
    total = 0

    # Search cases using full-text search
    if type in ("all", "cases"):
        case_results, case_count = search_cases(db, user_id, q, offset if type == "cases" else 0, limit)
        results.extend(case_results)
        total += case_count

    # Search entities using ILIKE
    if type in ("all", "entities"):
        entity_offset = 0 if type == "entities" else max(0, offset - total)
        entity_limit = limit if type == "entities" else max(0, limit - len(results))

        if entity_limit > 0:
            entity_results, entity_count = search_entities(db, user_id, q, entity_offset, entity_limit)
            results.extend(entity_results)
            total += entity_count

    # Apply pagination for combined results
    if type == "all":
        results = results[:limit]

    return SearchResponse(
        results=results,
        total=total,
        page=page,
        limit=limit,
        query=q,
        search_type=type
    )


def search_cases(db: Session, user_id: UUID, query: str, offset: int, limit: int) -> tuple:
    """Search cases using PostgreSQL full-text search."""

    # Create tsquery from search terms
    search_query = func.plainto_tsquery('english', query)

    # Query with ranking
    cases_query = db.query(
        Case.case_id,
        Case.filename,
        Case.court_name,
        Case.case_date,
        Case.status,
        Case.raw_text,
        func.ts_rank(Case.search_vector, search_query).label('rank')
    ).filter(
        Case.uploaded_by == user_id,
        Case.is_deleted == False,
        Case.search_vector.op('@@')(search_query)
    ).order_by(
        text('rank DESC')
    )

    # Get total count
    total = cases_query.count()

    # Get paginated results
    case_results = cases_query.offset(offset).limit(limit).all()

    results = []
    for case in case_results:
        # Generate snippet from raw_text
        snippet = None
        if case.raw_text:
            # Use ts_headline for highlighted snippet
            headline_query = text("""
                SELECT ts_headline('english', :text, plainto_tsquery('english', :query),
                'MaxWords=50, MinWords=20, StartSel=<mark>, StopSel=</mark>')
            """)
            try:
                headline_result = db.execute(
                    headline_query,
                    {"text": case.raw_text[:10000], "query": query}
                ).scalar()
                snippet = headline_result
            except Exception as e:
                logger.warning(f"Failed to generate headline: {e}")
                # Fallback: simple substring
                snippet = case.raw_text[:200] + "..." if len(case.raw_text) > 200 else case.raw_text

        results.append(SearchResultItem(
            id=case.case_id,
            type="case",
            title=case.filename,
            snippet=snippet,
            relevance=float(case.rank) if case.rank else 0.0,
            metadata={
                "court_name": case.court_name,
                "case_date": str(case.case_date) if case.case_date else None,
                "status": case.status
            }
        ))

    return results, total


def search_entities(db: Session, user_id: UUID, query: str, offset: int, limit: int) -> tuple:
    """Search entities using ILIKE pattern matching."""

    search_pattern = f"%{query}%"

    # Query entities with case info
    entities_query = db.query(
        Entity.entity_id,
        Entity.entity_name,
        Entity.entity_type,
        Entity.case_id,
        Case.filename.label('case_filename')
    ).join(Case).filter(
        Entity.owner_user_id == user_id,
        Case.is_deleted == False,
        Entity.entity_name.ilike(search_pattern)
    ).order_by(
        Entity.entity_name
    )

    # Get total count
    total = entities_query.count()

    # Get paginated results
    entity_results = entities_query.offset(offset).limit(limit).all()

    results = []
    for entity in entity_results:
        results.append(SearchResultItem(
            id=entity.entity_id,
            type="entity",
            title=entity.entity_name,
            snippet=f"Found in: {entity.case_filename}",
            relevance=1.0,  # ILIKE doesn't provide ranking
            metadata={
                "entity_type": entity.entity_type,
                "case_id": str(entity.case_id),
                "case_filename": entity.case_filename
            }
        ))

    return results, total


@router.get("/suggestions")
@limiter.limit(settings.RATE_LIMIT_SUGGESTIONS)
async def search_suggestions(
    request: Request,
    q: str = Query(..., min_length=2, max_length=100),
    limit: int = Query(5, ge=1, le=10),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get quick search suggestions for autocomplete."""
    user_id = current_user.user_id
    search_pattern = f"%{q}%"

    # Get matching case filenames
    cases = db.query(Case.case_id, Case.filename).filter(
        Case.uploaded_by == user_id,
        Case.is_deleted == False,
        Case.filename.ilike(search_pattern)
    ).limit(limit).all()

    # Get matching entity names
    entities = db.query(
        Entity.entity_id,
        Entity.entity_name,
        Entity.entity_type
    ).filter(
        Entity.owner_user_id == user_id,
        Entity.entity_name.ilike(search_pattern)
    ).distinct(Entity.entity_name).limit(limit).all()

    suggestions = []

    for case in cases:
        suggestions.append({
            "id": str(case.case_id),
            "type": "case",
            "text": case.filename
        })

    for entity in entities:
        suggestions.append({
            "id": str(entity.entity_id),
            "type": "entity",
            "text": entity.entity_name,
            "entity_type": entity.entity_type
        })

    return {"suggestions": suggestions[:limit]}
