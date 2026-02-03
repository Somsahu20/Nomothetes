import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class Entity(Base):
    """Extracted entity from legal documents."""

    __tablename__ = "entities"

    entity_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False, index=True)
    owner_user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)  # PERSON, ORG, DATE
    entity_name = Column(String(255), nullable=False)
    normalized_name = Column(String(255), nullable=True)
    confidence_score = Column(Numeric(3, 2), nullable=True)
    page_number = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("Case", back_populates="entities")

    def __repr__(self):
        return f"<Entity {self.entity_name} ({self.entity_type})>"


class EntityAlias(Base):
    """Entity name aliases for fuzzy matching."""

    __tablename__ = "entity_aliases"

    alias_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    canonical_name = Column(String(255), nullable=False)
    alias_name = Column(String(255), nullable=False)
    similarity_score = Column(Numeric(5, 2), nullable=True)
    merged_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    merged_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<EntityAlias {self.alias_name} -> {self.canonical_name}>"
