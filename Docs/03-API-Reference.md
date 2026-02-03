# API Reference
## Nomothetes - Legal Network Analysis Platform

**Base URL:** `http://localhost:8000/api`

---

## Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

---

## Auth Endpoints

### POST /api/auth/register

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "organization": "Legal Corp"  // optional
}
```

**Response:** `201 Created`
```json
{
  "message": "Registration successful",
  "user_id": "uuid-here"
}
```

**Errors:**
- `400` - Invalid email format or password too weak
- `409` - Email already exists

**Rate Limit:** 3 requests/hour per IP

---

### POST /api/auth/login

Authenticate user and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "user_id": "uuid-here",
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

**Also sets:** `refresh_token` as httpOnly cookie

**Errors:**
- `401` - Invalid credentials
- `423` - Account locked (too many failed attempts)

**Rate Limit:** 5 requests/15 min per IP

---

### POST /api/auth/logout

Invalidate refresh token and end session.

**Headers:** Requires `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

---

### POST /api/auth/refresh

Get new access token using refresh token.

**Request:** Refresh token sent via httpOnly cookie

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900
}
```

**Errors:**
- `401` - Invalid or expired refresh token

---

### GET /api/auth/me

Get current authenticated user info.

**Headers:** Requires `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "user_id": "uuid-here",
  "email": "user@example.com",
  "full_name": "John Doe",
  "organization": "Legal Corp",
  "created_at": "2026-01-24T10:00:00Z",
  "last_login": "2026-01-24T12:00:00Z"
}
```

---

### PUT /api/auth/profile

Update user profile.

**Headers:** Requires `Authorization: Bearer <token>`

**Request:**
```json
{
  "full_name": "John Smith",
  "organization": "New Legal Corp"
}
```

**Response:** `200 OK`
```json
{
  "message": "Profile updated",
  "user": { ... }
}
```

---

## Case Endpoints

### POST /api/cases/upload

Upload a PDF document.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `file` - PDF file (max 50MB)
- `court_name` - Optional string
- `case_date` - Optional date (YYYY-MM-DD)
- `document_type` - Optional string

**Response:** `201 Created`
```json
{
  "case_id": "uuid-here",
  "filename": "document.pdf",
  "status": "processing",
  "task_id": "task-uuid"
}
```

**Errors:**
- `400` - Invalid file type (only PDF allowed)
- `413` - File too large (max 50MB)

**Rate Limit:** 10 files/hour per user

---

### GET /api/cases

List user's cases with pagination.

**Headers:** Requires `Authorization: Bearer <token>`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 1 | Page number |
| limit | int | 20 | Items per page (max 100) |
| court | string | - | Filter by court name |
| status | string | - | Filter by status |
| start_date | date | - | Filter from date |
| end_date | date | - | Filter to date |
| sort | string | upload_date | Sort field |
| order | string | desc | Sort order (asc/desc) |

**Response:** `200 OK`
```json
{
  "cases": [
    {
      "case_id": "uuid-here",
      "filename": "document.pdf",
      "court_name": "Supreme Court",
      "case_date": "2026-01-15",
      "upload_date": "2026-01-24T10:00:00Z",
      "status": "complete",
      "entity_count": 15
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "pages": 3
}
```

---

### GET /api/cases/{case_id}

Get case details.

**Headers:** Requires `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "case_id": "uuid-here",
  "filename": "document.pdf",
  "court_name": "Supreme Court",
  "case_date": "2026-01-15",
  "document_type": "judgment",
  "upload_date": "2026-01-24T10:00:00Z",
  "raw_text": "Full text content...",
  "entity_count": 15,
  "has_analysis": true
}
```

**Errors:**
- `404` - Case not found
- `403` - Access denied (not your case)

---

### DELETE /api/cases/{case_id}

Soft delete a case.

**Headers:** Requires `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Case deleted"
}
```

---

### GET /api/cases/{case_id}/entities

Get entities extracted from a case.

**Headers:** Requires `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "entities": [
    {
      "entity_id": "uuid-here",
      "entity_type": "PERSON",
      "entity_name": "Justice Kumar",
      "normalized_name": "Justice Kumar",
      "confidence_score": 0.95,
      "page_number": 3
    }
  ],
  "total": 15
}
```

---

### GET /api/cases/{case_id}/analysis

Get AI analysis for a case.

**Headers:** Requires `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "analysis": [
    {
      "analysis_id": "uuid-here",
      "analysis_type": "summary",
      "result_text": "This case involves...",
      "created_at": "2026-01-24T12:00:00Z"
    },
    {
      "analysis_id": "uuid-here",
      "analysis_type": "sentiment",
      "result_text": "neutral",
      "created_at": "2026-01-24T12:00:00Z"
    }
  ]
}
```

---

### POST /api/cases/{case_id}/analyze

Trigger AI analysis for a case.

**Headers:** Requires `Authorization: Bearer <token>`

**Request:**
```json
{
  "analysis_types": ["summary", "sentiment"]  // optional, defaults to all
}
```

**Response:** `202 Accepted`
```json
{
  "message": "Analysis queued",
  "task_id": "task-uuid"
}
```

**Rate Limit:** 5 requests/hour per user

---

## Entity Endpoints

### GET /api/entities

List user's entities.

**Headers:** Requires `Authorization: Bearer <token>`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 1 | Page number |
| limit | int | 20 | Items per page |
| type | string | - | Filter by entity type (PERSON/ORG/DATE) |
| search | string | - | Search by name |

**Response:** `200 OK`
```json
{
  "entities": [
    {
      "entity_id": "uuid-here",
      "entity_name": "Justice Kumar",
      "entity_type": "PERSON",
      "case_count": 12,
      "centrality_score": 0.85
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

---

### GET /api/entities/{entity_id}

Get entity details.

**Response:** `200 OK`
```json
{
  "entity_id": "uuid-here",
  "entity_name": "Justice Kumar",
  "entity_type": "PERSON",
  "aliases": ["J. Kumar", "Hon. Justice Kumar"],
  "case_count": 12,
  "metrics": {
    "degree_centrality": 0.85,
    "betweenness_centrality": 0.42
  },
  "top_collaborators": [
    {"name": "Adv. Singh", "count": 8},
    {"name": "Adv. Sharma", "count": 5}
  ]
}
```

---

### POST /api/entities/merge

Merge duplicate entities.

**Headers:** Requires `Authorization: Bearer <token>`

**Request:**
```json
{
  "primary_entity_id": "uuid-primary",
  "duplicate_entity_ids": ["uuid-dup-1", "uuid-dup-2"]
}
```

**Response:** `200 OK`
```json
{
  "message": "Entities merged",
  "merged_count": 2,
  "primary_entity": { ... }
}
```

---

## Network Endpoints

### GET /api/network/graph

Get network graph data for visualization.

**Headers:** Requires `Authorization: Bearer <token>`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| entity_type | string | - | Filter by type |
| min_connections | int | 1 | Minimum edge count |
| limit | int | 500 | Max nodes to return |

**Response:** `200 OK`
```json
{
  "nodes": [
    {
      "id": "entity-uuid",
      "label": "Justice Kumar",
      "type": "PERSON",
      "size": 0.85,
      "color": "#3B82F6"
    }
  ],
  "edges": [
    {
      "source": "entity-uuid-1",
      "target": "entity-uuid-2",
      "weight": 5
    }
  ],
  "total_nodes": 150,
  "total_edges": 320,
  "truncated": false
}
```

---

### GET /api/network/metrics

Get computed network metrics.

**Headers:** Requires `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "top_judges": [
    {"name": "Justice Kumar", "centrality": 0.85, "case_count": 45}
  ],
  "top_lawyers": [
    {"name": "Adv. Singh", "centrality": 0.72, "case_count": 38}
  ],
  "network_stats": {
    "total_nodes": 150,
    "total_edges": 320,
    "density": 0.028,
    "avg_degree": 4.27
  }
}
```

---

## Search Endpoints

### POST /api/search

Search cases with filters.

**Headers:** Requires `Authorization: Bearer <token>`

**Request:**
```json
{
  "query": "contract dispute",
  "filters": {
    "court": "Supreme Court",
    "entity_name": "Justice Kumar",
    "start_date": "2025-01-01",
    "end_date": "2026-01-24"
  },
  "page": 1,
  "limit": 20,
  "sort": "relevance"
}
```

**Response:** `200 OK`
```json
{
  "results": [
    {
      "case_id": "uuid-here",
      "filename": "document.pdf",
      "court_name": "Supreme Court",
      "snippet": "...the contract dispute between...",
      "relevance_score": 0.92,
      "highlights": ["contract", "dispute"]
    }
  ],
  "total": 12,
  "page": 1,
  "query_time_ms": 45
}
```

**Rate Limit:** 100 requests/hour per user

---

## Analytics Endpoints

### GET /api/analytics/overview

Get dashboard statistics.

**Response:** `200 OK`
```json
{
  "total_cases": 45,
  "total_entities": 150,
  "total_connections": 320,
  "pending_tasks": 2,
  "recent_uploads": [
    {"filename": "doc.pdf", "uploaded_at": "2026-01-24T10:00:00Z"}
  ]
}
```

---

### GET /api/analytics/trends

Get time-series data.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| period | string | month | Aggregation period (day/week/month) |
| start_date | date | - | Start date |
| end_date | date | - | End date |

**Response:** `200 OK`
```json
{
  "cases_over_time": [
    {"date": "2026-01", "count": 15},
    {"date": "2025-12", "count": 12}
  ],
  "entities_over_time": [
    {"date": "2026-01", "count": 45},
    {"date": "2025-12", "count": 38}
  ]
}
```

---

### GET /api/analytics/top-entities

Get top judges/lawyers by case count.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| type | string | all | Entity type filter |
| limit | int | 10 | Number of results |

**Response:** `200 OK`
```json
{
  "top_judges": [
    {"name": "Justice Kumar", "case_count": 45, "centrality": 0.85}
  ],
  "top_lawyers": [
    {"name": "Adv. Singh", "case_count": 38, "centrality": 0.72}
  ],
  "top_courts": [
    {"name": "Supreme Court", "case_count": 28}
  ]
}
```

---

## Task Endpoints

### GET /api/tasks

List user's tasks.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| status | string | - | Filter by status |
| type | string | - | Filter by task type |
| page | int | 1 | Page number |

**Response:** `200 OK`
```json
{
  "tasks": [
    {
      "task_id": "uuid-here",
      "task_type": "ocr",
      "status": "in_progress",
      "progress": 65,
      "created_at": "2026-01-24T10:00:00Z",
      "case_id": "case-uuid"
    }
  ],
  "total": 5
}
```

---

### GET /api/tasks/{task_id}/status

Check task status.

**Response:** `200 OK`
```json
{
  "task_id": "uuid-here",
  "status": "completed",
  "progress": 100,
  "result": {
    "entities_extracted": 15
  },
  "completed_at": "2026-01-24T10:05:00Z"
}
```

**Task Statuses:**
- `pending` - Queued, not started
- `in_progress` - Currently processing
- `completed` - Successfully finished
- `failed` - Error occurred

---

### POST /api/tasks/{task_id}/retry

Retry a failed task.

**Response:** `202 Accepted`
```json
{
  "message": "Task requeued",
  "new_task_id": "new-uuid"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message here",
  "error_code": "SPECIFIC_ERROR_CODE"
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | VALIDATION_ERROR | Invalid request data |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Access denied to resource |
| 404 | NOT_FOUND | Resource doesn't exist |
| 409 | CONFLICT | Resource already exists |
| 413 | FILE_TOO_LARGE | Upload exceeds size limit |
| 423 | ACCOUNT_LOCKED | Too many failed login attempts |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
