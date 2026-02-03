from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field


class TimeSeriesDataPoint(BaseModel):
    """A single data point in a time series."""
    period: str  # e.g., "2024-01", "2024-W05", "2024-01-15"
    count: int


class CasesOverTimeResponse(BaseModel):
    """Cases over time for line/area charts."""
    data: List[TimeSeriesDataPoint]
    period_type: str  # "day", "week", "month"


class EntityDistributionItem(BaseModel):
    """Entity type distribution item."""
    entity_type: str
    count: int
    percentage: float = Field(ge=0, le=100)


class EntityDistributionResponse(BaseModel):
    """Entity distribution by type for pie charts."""
    data: List[EntityDistributionItem]
    total: int


class TopEntityItem(BaseModel):
    """A top entity item."""
    name: str
    entity_type: str
    case_count: int
    occurrence_count: int


class TopEntitiesResponse(BaseModel):
    """Top entities by case appearances."""
    data: List[TopEntityItem]


class CourtDistributionItem(BaseModel):
    """Cases distribution by court."""
    court_name: str
    count: int
    percentage: float = Field(ge=0, le=100)


class CourtDistributionResponse(BaseModel):
    """Cases by court for bar charts."""
    data: List[CourtDistributionItem]
    total: int


class StatusDistributionItem(BaseModel):
    """Cases by processing status."""
    status: str
    count: int


class AnalyticsSummaryResponse(BaseModel):
    """Overall analytics summary."""
    total_cases: int
    total_entities: int
    unique_entities: int
    avg_entities_per_case: float
    cases_this_month: int
    entities_this_month: int
    status_distribution: List[StatusDistributionItem]


class TrendsResponse(BaseModel):
    """Combined trends data for dashboard."""
    cases_over_time: List[TimeSeriesDataPoint]
    entity_distribution: List[EntityDistributionItem]
    top_entities: List[TopEntityItem]
    court_distribution: List[CourtDistributionItem]
