import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class AnalysisResult(Base):
    """AI analysis results for legal cases."""

    __tablename__ = "analysis_results"

    analysis_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False, index=True)
    owner_user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    triggered_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    analysis_type = Column(String(50), nullable=False)  # summary, sentiment, arguments, psychoanalysis
    result_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("Case", back_populates="analysis_results")

    def __repr__(self):
        return f"<AnalysisResult {self.analysis_type}>"


class NetworkMetric(Base):
    """Network analysis metrics for entities."""

    __tablename__ = "network_metrics"

    metric_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    entity_id = Column(UUID(as_uuid=True), ForeignKey("entities.entity_id", ondelete="CASCADE"), nullable=True, index=True)
    metric_type = Column(String(50), nullable=False)  # degree, betweenness, pagerank, clustering
    metric_value = Column(Numeric(10, 6), nullable=False)
    calculated_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<NetworkMetric {self.metric_type}: {self.metric_value}>"
