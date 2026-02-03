from typing import Optional
from datetime import datetime, timedelta
import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case as sql_case

from app.db.session import get_db
from app.models.entity import Entity
from app.models.case import Case
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    CasesOverTimeResponse,
    EntityDistributionResponse,
    TopEntitiesResponse,
    CourtDistributionResponse,
    TrendsResponse,
    TimeSeriesDataPoint,
    EntityDistributionItem,
    TopEntityItem,
    CourtDistributionItem,
    StatusDistributionItem,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary", response_model=AnalyticsSummaryResponse)
async def get_analytics_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get overall analytics summary for the current user."""
    user_id = current_user.user_id

    # Total cases
    total_cases = db.query(func.count(Case.case_id)).filter(
        Case.uploaded_by == user_id,
        Case.is_deleted == False
    ).scalar() or 0

    # Total entities (all occurrences)
    total_entities = db.query(func.count(Entity.entity_id)).filter(
        Entity.owner_user_id == user_id
    ).scalar() or 0

    # Unique entities
    unique_entities = db.query(func.count(func.distinct(Entity.entity_name))).filter(
        Entity.owner_user_id == user_id
    ).scalar() or 0

    # Average entities per case
    avg_entities = total_entities / total_cases if total_cases > 0 else 0

    # Cases this month
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    cases_this_month = db.query(func.count(Case.case_id)).filter(
        Case.uploaded_by == user_id,
        Case.is_deleted == False,
        Case.upload_date >= start_of_month
    ).scalar() or 0

    # Entities this month
    entities_this_month = db.query(func.count(Entity.entity_id)).filter(
        Entity.owner_user_id == user_id,
        Entity.created_at >= start_of_month
    ).scalar() or 0

    # Status distribution
    status_counts = db.query(
        Case.status,
        func.count(Case.case_id)
    ).filter(
        Case.uploaded_by == user_id,
        Case.is_deleted == False
    ).group_by(Case.status).all()

    status_distribution = [
        StatusDistributionItem(status=s or "unknown", count=c)
        for s, c in status_counts
    ]

    return AnalyticsSummaryResponse(
        total_cases=total_cases,
        total_entities=total_entities,
        unique_entities=unique_entities,
        avg_entities_per_case=round(avg_entities, 2),
        cases_this_month=cases_this_month,
        entities_this_month=entities_this_month,
        status_distribution=status_distribution
    )


@router.get("/cases-over-time", response_model=CasesOverTimeResponse)
async def get_cases_over_time(
    period: str = Query("month", regex="^(day|week|month)$"),
    months: int = Query(12, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get cases uploaded over time grouped by period."""
    user_id = current_user.user_id

    # Calculate start date
    start_date = datetime.utcnow() - timedelta(days=months * 30)

    if period == "day":
        # Group by day
        results = db.query(
            func.to_char(Case.upload_date, 'YYYY-MM-DD').label('period'),
            func.count(Case.case_id).label('count')
        ).filter(
            Case.uploaded_by == user_id,
            Case.is_deleted == False,
            Case.upload_date >= start_date
        ).group_by(
            func.to_char(Case.upload_date, 'YYYY-MM-DD')
        ).order_by('period').all()
    elif period == "week":
        # Group by week
        results = db.query(
            func.to_char(Case.upload_date, 'IYYY-"W"IW').label('period'),
            func.count(Case.case_id).label('count')
        ).filter(
            Case.uploaded_by == user_id,
            Case.is_deleted == False,
            Case.upload_date >= start_date
        ).group_by(
            func.to_char(Case.upload_date, 'IYYY-"W"IW')
        ).order_by('period').all()
    else:  # month
        results = db.query(
            func.to_char(Case.upload_date, 'YYYY-MM').label('period'),
            func.count(Case.case_id).label('count')
        ).filter(
            Case.uploaded_by == user_id,
            Case.is_deleted == False,
            Case.upload_date >= start_date
        ).group_by(
            func.to_char(Case.upload_date, 'YYYY-MM')
        ).order_by('period').all()

    data = [
        TimeSeriesDataPoint(period=r.period, count=r.count)
        for r in results
    ]

    return CasesOverTimeResponse(data=data, period_type=period)


@router.get("/entity-distribution", response_model=EntityDistributionResponse)
async def get_entity_distribution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get entity distribution by type."""
    user_id = current_user.user_id

    # Count entities by type (exclude DATE entities)
    results = db.query(
        Entity.entity_type,
        func.count(Entity.entity_id).label('count')
    ).filter(
        Entity.owner_user_id == user_id,
        Entity.entity_type != 'DATE'
    ).group_by(Entity.entity_type).all()

    total = sum(r.count for r in results)

    data = [
        EntityDistributionItem(
            entity_type=r.entity_type or "UNKNOWN",
            count=r.count,
            percentage=round((r.count / total * 100) if total > 0 else 0, 2)
        )
        for r in results
    ]

    # Sort by count descending
    data.sort(key=lambda x: x.count, reverse=True)

    return EntityDistributionResponse(data=data, total=total)


@router.get("/top-entities", response_model=TopEntitiesResponse)
async def get_top_entities(
    limit: int = Query(10, ge=1, le=50),
    entity_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get top entities by case appearances."""
    user_id = current_user.user_id

    query = db.query(
        Entity.entity_name,
        Entity.entity_type,
        func.count(func.distinct(Entity.case_id)).label('case_count'),
        func.count(Entity.entity_id).label('occurrence_count')
    ).join(Case).filter(
        Entity.owner_user_id == user_id,
        Case.is_deleted == False,
        Entity.entity_type != 'DATE'
    )

    if entity_type:
        query = query.filter(Entity.entity_type == entity_type)

    results = query.group_by(
        Entity.entity_name, Entity.entity_type
    ).order_by(
        func.count(func.distinct(Entity.case_id)).desc()
    ).limit(limit).all()

    data = [
        TopEntityItem(
            name=r.entity_name,
            entity_type=r.entity_type or "UNKNOWN",
            case_count=r.case_count,
            occurrence_count=r.occurrence_count
        )
        for r in results
    ]

    return TopEntitiesResponse(data=data)


@router.get("/courts", response_model=CourtDistributionResponse)
async def get_court_distribution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get cases distribution by court."""
    user_id = current_user.user_id

    results = db.query(
        func.coalesce(Case.court_name, 'Unknown').label('court_name'),
        func.count(Case.case_id).label('count')
    ).filter(
        Case.uploaded_by == user_id,
        Case.is_deleted == False
    ).group_by(
        func.coalesce(Case.court_name, 'Unknown')
    ).order_by(
        func.count(Case.case_id).desc()
    ).all()

    total = sum(r.count for r in results)

    data = [
        CourtDistributionItem(
            court_name=r.court_name,
            count=r.count,
            percentage=round((r.count / total * 100) if total > 0 else 0, 2)
        )
        for r in results
    ]

    return CourtDistributionResponse(data=data, total=total)


@router.get("/trends", response_model=TrendsResponse)
async def get_trends(
    period: str = Query("month", regex="^(day|week|month)$"),
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get combined trends data for the analytics dashboard."""
    user_id = current_user.user_id
    start_date = datetime.utcnow() - timedelta(days=months * 30)

    # Cases over time
    if period == "month":
        time_results = db.query(
            func.to_char(Case.upload_date, 'YYYY-MM').label('period'),
            func.count(Case.case_id).label('count')
        ).filter(
            Case.uploaded_by == user_id,
            Case.is_deleted == False,
            Case.upload_date >= start_date
        ).group_by(
            func.to_char(Case.upload_date, 'YYYY-MM')
        ).order_by('period').all()
    else:
        time_results = db.query(
            func.to_char(Case.upload_date, 'YYYY-MM-DD').label('period'),
            func.count(Case.case_id).label('count')
        ).filter(
            Case.uploaded_by == user_id,
            Case.is_deleted == False,
            Case.upload_date >= start_date
        ).group_by(
            func.to_char(Case.upload_date, 'YYYY-MM-DD')
        ).order_by('period').all()

    cases_over_time = [
        TimeSeriesDataPoint(period=r.period, count=r.count)
        for r in time_results
    ]

    # Entity distribution (exclude DATE entities)
    entity_results = db.query(
        Entity.entity_type,
        func.count(Entity.entity_id).label('count')
    ).filter(
        Entity.owner_user_id == user_id,
        Entity.entity_type != 'DATE'
    ).group_by(Entity.entity_type).all()

    total_entities = sum(r.count for r in entity_results)
    entity_distribution = [
        EntityDistributionItem(
            entity_type=r.entity_type or "UNKNOWN",
            count=r.count,
            percentage=round((r.count / total_entities * 100) if total_entities > 0 else 0, 2)
        )
        for r in entity_results
    ]

    # Top entities (exclude DATE entities)
    top_results = db.query(
        Entity.entity_name,
        Entity.entity_type,
        func.count(func.distinct(Entity.case_id)).label('case_count'),
        func.count(Entity.entity_id).label('occurrence_count')
    ).join(Case).filter(
        Entity.owner_user_id == user_id,
        Case.is_deleted == False,
        Entity.entity_type != 'DATE'
    ).group_by(
        Entity.entity_name, Entity.entity_type
    ).order_by(
        func.count(func.distinct(Entity.case_id)).desc()
    ).limit(10).all()

    top_entities = [
        TopEntityItem(
            name=r.entity_name,
            entity_type=r.entity_type or "UNKNOWN",
            case_count=r.case_count,
            occurrence_count=r.occurrence_count
        )
        for r in top_results
    ]

    # Court distribution
    court_results = db.query(
        func.coalesce(Case.court_name, 'Unknown').label('court_name'),
        func.count(Case.case_id).label('count')
    ).filter(
        Case.uploaded_by == user_id,
        Case.is_deleted == False
    ).group_by(
        func.coalesce(Case.court_name, 'Unknown')
    ).order_by(
        func.count(Case.case_id).desc()
    ).limit(10).all()

    total_courts = sum(r.count for r in court_results)
    court_distribution = [
        CourtDistributionItem(
            court_name=r.court_name,
            count=r.count,
            percentage=round((r.count / total_courts * 100) if total_courts > 0 else 0, 2)
        )
        for r in court_results
    ]

    return TrendsResponse(
        cases_over_time=cases_over_time,
        entity_distribution=entity_distribution,
        top_entities=top_entities,
        court_distribution=court_distribution
    )
