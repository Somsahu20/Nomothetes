import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, TSVECTOR
from sqlalchemy.orm import relationship

from app.db.base import Base


class Case(Base):
    """Legal case document model."""

    __tablename__ = "cases"

    case_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=True)
    upload_date = Column(DateTime, default=datetime.utcnow)
    raw_text = Column(Text, nullable=True)
    court_name = Column(String(255), nullable=True)
    case_date = Column(Date, nullable=True)
    document_type = Column(String(100), nullable=True)
    status = Column(String(50), default="pending")  # pending, processing, complete, failed
    is_deleted = Column(Boolean, default=False)
    search_vector = Column(TSVECTOR, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="cases")
    entities = relationship("Entity", back_populates="case", cascade="all, delete-orphan")
    analysis_results = relationship("AnalysisResult", back_populates="case", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Case {self.filename}>"
