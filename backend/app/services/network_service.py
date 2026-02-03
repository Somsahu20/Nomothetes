from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from collections import defaultdict

from app.models.entity import Entity
from app.models.case import Case


class NetworkService:
    """Service for building and analyzing entity networks."""

    # Entity types to show in network graph (exclude DATE)
    NETWORK_ENTITY_TYPES = ["PERSON", "COURT", "ORG", "LOCATION", "GPE"]

    def get_user_entities(
        self,
        db: Session,
        user_id: UUID,
        entity_type: str = None,
        limit: int = 100
    ) -> List[Entity]:
        """Get all entities for a user, optionally filtered by type."""
        query = db.query(Entity).filter(Entity.owner_user_id == user_id)

        if entity_type:
            query = query.filter(Entity.entity_type == entity_type)

        return query.limit(limit).all()

    def get_entity_connections(
        self,
        db: Session,
        user_id: UUID
    ) -> Dict[str, Any]:
        """
        Build network data showing entity connections across cases.
        Entities are connected if they appear in the same case.
        Only includes PERSON, COURT, ORG, LOCATION types (not DATE).
        """
        # Get all entities for the user, filtered to network-relevant types
        entities = db.query(Entity).join(Case).filter(
            Entity.owner_user_id == user_id,
            Case.is_deleted == False,
            Entity.entity_type.in_(self.NETWORK_ENTITY_TYPES)
        ).all()

        if not entities:
            return {
                "nodes": [],
                "edges": [],
                "stats": {
                    "total_nodes": 0,
                    "total_edges": 0,
                    "entity_types": {},
                    "avg_connections": 0.0
                }
            }

        # Group entities by normalized name (or name if not normalized)
        entity_groups = defaultdict(list)
        for entity in entities:
            key = (entity.normalized_name or entity.entity_name).lower()
            entity_groups[key].append(entity)

        # Build nodes - one per unique entity
        nodes = []
        node_index = {}  # Map normalized name to node index

        for idx, (name, entity_list) in enumerate(entity_groups.items()):
            # Use the first entity's details
            first_entity = entity_list[0]
            case_ids = list(set(str(e.case_id) for e in entity_list))

            nodes.append({
                "id": str(idx),
                "label": first_entity.entity_name,
                "type": first_entity.entity_type,
                "case_count": len(case_ids),
                "case_ids": case_ids,
                "entity_ids": [str(e.entity_id) for e in entity_list]
            })
            node_index[name] = idx

        # Build edges - entities are connected if they appear in the same case
        edges = []
        edge_set = set()  # To avoid duplicates

        # Group entities by case
        case_entities = defaultdict(list)
        for name, entity_list in entity_groups.items():
            for entity in entity_list:
                case_entities[str(entity.case_id)].append(name)

        # Create edges between entities in the same case
        edge_weights = defaultdict(int)  # Track how many cases share the connection

        for case_id, entity_names in case_entities.items():
            unique_names = list(set(entity_names))
            for i in range(len(unique_names)):
                for j in range(i + 1, len(unique_names)):
                    name1, name2 = unique_names[i], unique_names[j]
                    # Sort to ensure consistent edge key
                    edge_key = tuple(sorted([name1, name2]))
                    edge_weights[edge_key] += 1

        # Create edge objects
        for (name1, name2), weight in edge_weights.items():
            edges.append({
                "id": f"e{len(edges)}",
                "source": str(node_index[name1]),
                "target": str(node_index[name2]),
                "weight": weight
            })

        # Calculate stats
        stats = {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "entity_types": {},
            "avg_connections": round(len(edges) * 2 / len(nodes), 2) if nodes else 0
        }

        for node in nodes:
            entity_type = node["type"]
            stats["entity_types"][entity_type] = stats["entity_types"].get(entity_type, 0) + 1

        return {
            "nodes": nodes,
            "edges": edges,
            "stats": stats
        }

    def get_entity_detail(
        self,
        db: Session,
        user_id: UUID,
        entity_name: str
    ) -> Dict[str, Any]:
        """Get detailed information about a specific entity across all cases."""
        # Find all entities with matching name
        entities = db.query(Entity).join(Case).filter(
            Entity.owner_user_id == user_id,
            Case.is_deleted == False,
            func.lower(Entity.entity_name) == entity_name.lower()
        ).all()

        if not entities:
            return None

        # Get cases this entity appears in
        case_ids = list(set(e.case_id for e in entities))
        cases = db.query(Case).filter(Case.case_id.in_(case_ids)).all()

        # Get co-occurring entities
        co_entities = db.query(Entity).filter(
            Entity.case_id.in_(case_ids),
            Entity.owner_user_id == user_id,
            func.lower(Entity.entity_name) != entity_name.lower()
        ).all()

        # Group co-entities by name
        co_entity_counts = defaultdict(lambda: {"count": 0, "type": None, "name": None})
        for e in co_entities:
            key = (e.normalized_name or e.entity_name).lower()
            co_entity_counts[key]["count"] += 1
            co_entity_counts[key]["type"] = e.entity_type
            co_entity_counts[key]["name"] = e.entity_name

        # Sort by count
        top_connections = sorted(
            [{"name": v["name"], "type": v["type"], "count": v["count"]}
             for v in co_entity_counts.values()],
            key=lambda x: x["count"],
            reverse=True
        )[:10]

        first_entity = entities[0]
        return {
            "entity_name": first_entity.entity_name,
            "entity_type": first_entity.entity_type,
            "normalized_name": first_entity.normalized_name,
            "occurrence_count": len(entities),
            "case_count": len(cases),
            "cases": [
                {
                    "case_id": str(c.case_id),
                    "filename": c.filename,
                    "court_name": c.court_name,
                    "case_date": str(c.case_date) if c.case_date else None
                }
                for c in cases
            ],
            "top_connections": top_connections
        }


network_service = NetworkService()
