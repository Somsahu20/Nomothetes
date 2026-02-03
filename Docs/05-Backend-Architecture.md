# Backend Architecture
## Nomothetes - Legal Network Analysis Platform

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | FastAPI |
| Database | PostgreSQL |
| Cache/Queue | Redis |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Task Queue | Redis Streams |
| OCR | Tesseract / PyMuPDF |
| NER | spaCy |
| Fuzzy Matching | RapidFuzz |
| Graph Processing | NetworkX |
| AI | Gemini API |
| Auth | PyJWT + Argon2 |

---

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py             # Dependency injection
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── auth.py         # Authentication endpoints
│   │       ├── cases.py        # Case management
│   │       ├── entities.py     # Entity management
│   │       ├── network.py      # Network graph
│   │       ├── search.py       # Search functionality
│   │       ├── analytics.py    # Analytics endpoints
│   │       └── tasks.py        # Task status
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py           # Settings/Environment
│   │   ├── security.py         # Password hashing, JWT
│   │   └── auth.py             # Auth middleware
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── case.py
│   │   ├── entity.py
│   │   ├── analysis.py
│   │   └── network.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py             # Pydantic models
│   │   ├── case.py
│   │   ├── entity.py
│   │   ├── analysis.py
│   │   └── network.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ocr.py              # PDF text extraction
│   │   ├── ner.py              # Entity extraction
│   │   ├── fuzzy.py            # Fuzzy matching
│   │   ├── network.py          # Graph construction
│   │   └── ai.py               # LLM integration
│   └── db/
│       ├── __init__.py
│       ├── session.py          # Database session
│       └── base.py             # Base model
├── worker.py                   # Task worker process
├── migrations/                 # Alembic migrations
├── tests/
├── requirements.txt
├── Dockerfile
└── .env.example
```

---

## Core Configuration

### config.py

```python
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI
    GEMINI_API_KEY: str

    # Upload
    UPLOAD_PATH: str = "./uploads"
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
```

---

## Authentication System

### security.py

```python
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
import jwt
from datetime import datetime, timedelta
from uuid import uuid4

ph = PasswordHasher()

def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(password: str, hash: str) -> bool:
    try:
        return ph.verify(hash, password)
    except VerifyMismatchError:
        return False

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(minutes=15),
        "type": "access"
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

def create_refresh_token() -> str:
    return str(uuid4())

def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
```

### auth.py (Middleware)

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("user_id")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    return user
```

---

## Authorization Middleware

### deps.py

```python
from fastapi import HTTPException, Depends
from uuid import UUID

async def require_case_ownership(
    case_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Case:
    """Verify user owns the case"""
    case = db.query(Case).filter(
        Case.case_id == case_id,
        Case.is_deleted == False
    ).first()

    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.uploaded_by != current_user.user_id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to access this case"
        )

    return case

async def require_entity_ownership(
    entity_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Entity:
    """Verify user owns the entity"""
    entity = db.query(Entity).filter(Entity.entity_id == entity_id).first()

    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    if entity.owner_user_id != current_user.user_id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to access this entity"
        )

    return entity
```

---

## Services

### OCR Service (ocr.py)

```python
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF using PyMuPDF, fallback to OCR"""
    doc = fitz.open(file_path)
    text = ""

    for page in doc:
        page_text = page.get_text()

        if page_text.strip():
            text += page_text
        else:
            # Fallback to OCR for scanned pages
            pix = page.get_pixmap()
            img = Image.open(io.BytesIO(pix.tobytes()))
            text += pytesseract.image_to_string(img)

    doc.close()
    return text
```

### NER Service (ner.py)

```python
import spacy

nlp = spacy.load("en_core_web_sm")

def extract_entities(text: str) -> list[dict]:
    """Extract named entities from text"""
    doc = nlp(text)
    entities = []

    for ent in doc.ents:
        if ent.label_ in ["PERSON", "ORG", "DATE"]:
            entities.append({
                "entity_name": ent.text,
                "entity_type": ent.label_,
                "start": ent.start_char,
                "end": ent.end_char,
                "confidence": 0.85  # spaCy doesn't provide confidence
            })

    return entities
```

### Fuzzy Matching Service (fuzzy.py)

```python
from rapidfuzz import fuzz, process

def find_similar_entities(
    entity_name: str,
    existing_entities: list[str],
    threshold: float = 85.0
) -> list[tuple[str, float]]:
    """Find similar entity names above threshold"""
    matches = process.extract(
        entity_name,
        existing_entities,
        scorer=fuzz.token_set_ratio,
        limit=5
    )

    return [(name, score) for name, score, _ in matches if score >= threshold]

def normalize_entity_name(name: str) -> str:
    """Normalize entity name for comparison"""
    # Remove common prefixes
    prefixes = ["Hon.", "Mr.", "Mrs.", "Justice", "Adv.", "Dr."]
    normalized = name.strip()

    for prefix in prefixes:
        if normalized.startswith(prefix):
            normalized = normalized[len(prefix):].strip()

    return normalized
```

### Network Service (network.py)

```python
import networkx as nx
from collections import defaultdict

def build_network_graph(entities_by_case: dict) -> nx.Graph:
    """Build network graph from case entities"""
    G = nx.Graph()

    # Add nodes and edges
    for case_id, entities in entities_by_case.items():
        # Add all entities as nodes
        for entity in entities:
            if not G.has_node(entity["entity_id"]):
                G.add_node(
                    entity["entity_id"],
                    label=entity["entity_name"],
                    type=entity["entity_type"]
                )

        # Add edges between entities in same case
        for i, e1 in enumerate(entities):
            for e2 in entities[i+1:]:
                if G.has_edge(e1["entity_id"], e2["entity_id"]):
                    G[e1["entity_id"]][e2["entity_id"]]["weight"] += 1
                else:
                    G.add_edge(e1["entity_id"], e2["entity_id"], weight=1)

    return G

def calculate_metrics(G: nx.Graph) -> dict:
    """Calculate network metrics"""
    return {
        "degree_centrality": nx.degree_centrality(G),
        "betweenness_centrality": nx.betweenness_centrality(G),
        "total_nodes": G.number_of_nodes(),
        "total_edges": G.number_of_edges(),
        "density": nx.density(G)
    }

def graph_to_json(G: nx.Graph, limit: int = 500) -> dict:
    """Convert NetworkX graph to JSON for frontend"""
    # Get top nodes by degree centrality
    centrality = nx.degree_centrality(G)
    top_nodes = sorted(centrality.items(), key=lambda x: -x[1])[:limit]
    node_ids = {n[0] for n in top_nodes}

    nodes = []
    for node_id in node_ids:
        data = G.nodes[node_id]
        nodes.append({
            "id": node_id,
            "label": data.get("label", ""),
            "type": data.get("type", "UNKNOWN"),
            "size": centrality.get(node_id, 0)
        })

    edges = []
    for u, v, data in G.edges(data=True):
        if u in node_ids and v in node_ids:
            edges.append({
                "source": u,
                "target": v,
                "weight": data.get("weight", 1)
            })

    return {
        "nodes": nodes,
        "edges": edges,
        "total_nodes": G.number_of_nodes(),
        "total_edges": G.number_of_edges(),
        "truncated": G.number_of_nodes() > limit
    }
```

### AI Service (ai.py)

```python
import google.generativeai as genai
from functools import lru_cache

genai.configure(api_key=settings.GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-pro')

async def summarize_case(text: str) -> str:
    """Generate case summary using Gemini"""
    prompt = f"""
    Summarize the following legal case document in approximately 200 words.
    Focus on the key facts, legal issues, and outcome.

    Document:
    {text[:10000]}  # Limit input size
    """

    response = await model.generate_content_async(prompt)
    return response.text

async def analyze_sentiment(text: str) -> str:
    """Analyze judicial sentiment"""
    prompt = f"""
    Analyze the tone of this legal judgment.
    Classify as: harsh, lenient, or neutral.
    Provide a brief explanation.

    Document:
    {text[:10000]}
    """

    response = await model.generate_content_async(prompt)
    return response.text
```

---

## Task Worker

### worker.py

```python
import redis
import json
from app.services import ocr, ner, fuzzy, ai
from app.db.session import SessionLocal

redis_client = redis.from_url(settings.REDIS_URL)
STREAM_NAME = "task_queue"
CONSUMER_GROUP = "workers"
CONSUMER_NAME = f"worker-{os.getpid()}"

def process_task(task_data: dict):
    """Process a single task"""
    task_type = task_data["task_type"]
    user_id = task_data["user_id"]
    case_id = task_data.get("case_id")

    db = SessionLocal()

    try:
        # Validate ownership
        if case_id:
            case = db.query(Case).filter(
                Case.case_id == case_id,
                Case.uploaded_by == user_id
            ).first()

            if not case:
                return {"status": "failed", "reason": "unauthorized"}

        # Process based on type
        if task_type == "ocr":
            text = ocr.extract_text_from_pdf(case.file_path)
            case.raw_text = text
            db.commit()

        elif task_type == "entity_extraction":
            entities = ner.extract_entities(case.raw_text)
            for ent in entities:
                db.add(Entity(
                    case_id=case_id,
                    owner_user_id=user_id,
                    **ent
                ))
            db.commit()

        elif task_type == "analyze":
            summary = ai.summarize_case(case.raw_text)
            db.add(AnalysisResult(
                case_id=case_id,
                owner_user_id=user_id,
                analysis_type="summary",
                result_text=summary
            ))
            db.commit()

        return {"status": "completed"}

    except Exception as e:
        return {"status": "failed", "error": str(e)}
    finally:
        db.close()

def run_worker():
    """Main worker loop"""
    # Create consumer group if needed
    try:
        redis_client.xgroup_create(STREAM_NAME, CONSUMER_GROUP, mkstream=True)
    except redis.exceptions.ResponseError:
        pass  # Group already exists

    while True:
        messages = redis_client.xreadgroup(
            CONSUMER_GROUP,
            CONSUMER_NAME,
            {STREAM_NAME: '>'},
            count=1,
            block=5000
        )

        for stream, entries in messages:
            for msg_id, data in entries:
                task_data = {k.decode(): v.decode() for k, v in data.items()}
                result = process_task(task_data)

                # Update task status
                redis_client.hset(
                    f"task:{task_data['task_id']}",
                    mapping=result
                )

                # Acknowledge message
                redis_client.xack(STREAM_NAME, CONSUMER_GROUP, msg_id)

if __name__ == "__main__":
    run_worker()
```

---

## Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/auth/login")
@limiter.limit("5/15minute")
async def login(request: Request, ...):
    ...

@app.post("/api/auth/register")
@limiter.limit("3/hour")
async def register(request: Request, ...):
    ...

@app.post("/api/cases/upload")
@limiter.limit("10/hour")
async def upload_case(request: Request, ...):
    ...
```

---

## CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=3600
)
```

---

## Error Handling

```python
from fastapi import HTTPException
from fastapi.responses import JSONResponse

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": getattr(exc, "error_code", "UNKNOWN_ERROR")
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error_code": "INTERNAL_ERROR"
        }
    )
```
