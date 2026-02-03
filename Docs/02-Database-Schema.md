# Database Schema Reference
## Nomothetes - Legal Network Analysis Platform

---

## Overview

All tables use UUID primary keys and include proper foreign key relationships with CASCADE delete rules for data isolation.

---

## Users & Authentication

### users

```sql
CREATE TABLE users (
  user_id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  organization VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP
);
```

**Indexes:**
- Primary key on `user_id`
- Unique index on `email`

---

### refresh_tokens

```sql
CREATE TABLE refresh_tokens (
  token_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked BOOLEAN DEFAULT false
);
```

**Notes:**
- Alternative: Store in Redis for better performance
- Token rotation supported via `revoked` flag

---

## Cases & Documents

### cases

```sql
CREATE TABLE cases (
  case_id UUID PRIMARY KEY,
  uploaded_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  upload_date TIMESTAMP DEFAULT NOW(),
  raw_text TEXT,
  court_name VARCHAR(255),
  case_date DATE,
  document_type VARCHAR(100),
  is_deleted BOOLEAN DEFAULT FALSE,
  search_vector tsvector,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cases_uploaded_by ON cases(uploaded_by);
CREATE INDEX idx_cases_uploaded_by_deleted ON cases(uploaded_by, is_deleted);
CREATE INDEX idx_cases_search ON cases USING GIN(search_vector);

-- Full-text search trigger
CREATE TRIGGER cases_search_vector_update
BEFORE INSERT OR UPDATE ON cases
FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(
  search_vector,
  'pg_catalog.english',
  raw_text,
  filename,
  court_name
);
```

**Key Fields:**
- `uploaded_by` - Links case to owner user (required for data isolation)
- `is_deleted` - Soft delete flag
- `search_vector` - PostgreSQL full-text search

---

## Entities

### entities

```sql
CREATE TABLE entities (
  entity_id UUID PRIMARY KEY,
  case_id UUID REFERENCES cases(case_id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_name VARCHAR(255) NOT NULL,
  confidence_score DECIMAL(3,2),
  page_number INT,
  normalized_name VARCHAR(255),
  owner_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_entities_owner ON entities(owner_user_id);
CREATE INDEX idx_entities_case ON entities(case_id);
CREATE INDEX idx_entities_name ON entities(normalized_name, owner_user_id);
```

**Entity Types:**
- `PERSON` - Judges, lawyers, defendants, plaintiffs
- `ORG` - Courts, law firms, government bodies
- `DATE` - Case dates, filing dates

**Key Fields:**
- `owner_user_id` - Denormalized for faster user-scoped queries
- `normalized_name` - After fuzzy matching normalization
- `confidence_score` - NER confidence (0.00 to 1.00)

---

### entity_aliases

```sql
CREATE TABLE entity_aliases (
  alias_id UUID PRIMARY KEY,
  canonical_name VARCHAR(255) NOT NULL,
  alias_name VARCHAR(255) NOT NULL,
  similarity_score DECIMAL(5,2),
  merged_by UUID REFERENCES users(user_id),
  merged_at TIMESTAMP DEFAULT NOW(),
  owner_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE(owner_user_id, alias_name)
);

-- Indexes
CREATE INDEX idx_aliases_owner ON entity_aliases(owner_user_id);
```

**Purpose:** Track entity name variations for fuzzy matching.

**Examples:**
| canonical_name | alias_name | similarity_score |
|----------------|------------|------------------|
| Justice Kumar | J. Kumar | 92.5 |
| Justice Kumar | Hon. Mr. Justice Kumar | 88.0 |
| Supreme Court of India | SC India | 85.5 |

---

## Analysis Results

### analysis_results

```sql
CREATE TABLE analysis_results (
  analysis_id UUID PRIMARY KEY,
  case_id UUID REFERENCES cases(case_id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL,
  result_text TEXT,
  triggered_by UUID REFERENCES users(user_id),
  owner_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_analysis_owner ON analysis_results(owner_user_id);
```

**Analysis Types:**
- `summary` - AI-generated case summary
- `sentiment` - Judicial sentiment analysis (harsh/lenient/neutral)
- `arguments` - Legal argument pattern recognition
- `psychoanalysis` - Judge behavioral analysis

---

## Network Metrics

### network_metrics

```sql
CREATE TABLE network_metrics (
  metric_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(entity_id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(10,6) NOT NULL,
  calculated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, entity_id, metric_type)
);

-- Indexes
CREATE INDEX idx_metrics_user ON network_metrics(user_id);
CREATE INDEX idx_metrics_entity ON network_metrics(entity_id);
CREATE INDEX idx_metrics_type ON network_metrics(user_id, metric_type);
```

**Metric Types:**
- `degree` - Degree centrality
- `betweenness` - Betweenness centrality
- `pagerank` - PageRank score
- `clustering` - Clustering coefficient

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐
│   users     │───────│refresh_tokens│
└─────────────┘       └─────────────┘
       │
       │ uploaded_by
       ▼
┌─────────────┐       ┌─────────────┐
│   cases     │───────│  entities   │
└─────────────┘       └─────────────┘
       │                     │
       │                     │ owner_user_id
       ▼                     ▼
┌─────────────┐       ┌─────────────┐
│  analysis   │       │entity_aliases│
│  _results   │       └─────────────┘
└─────────────┘
                      ┌─────────────┐
                      │network_metrics│
                      └─────────────┘
```

---

## Data Isolation Rules

### ALWAYS Include user_id Filter

```sql
-- FORBIDDEN (data leak)
SELECT * FROM cases WHERE case_id = $case_id;

-- CORRECT
SELECT * FROM cases
WHERE case_id = $case_id
  AND uploaded_by = $user_id
  AND is_deleted = false;
```

### Cascade Deletion

When a user deletes their account, all related data is automatically deleted:

```sql
-- All these are automatically deleted via CASCADE:
DELETE FROM users WHERE user_id = $user_id;

-- Cascades to:
-- - cases (uploaded_by)
-- - entities (owner_user_id)
-- - analysis_results (owner_user_id)
-- - entity_aliases (owner_user_id)
-- - network_metrics (user_id)
-- - refresh_tokens (user_id)
```

---

## Migration Order

When creating tables, follow this order to respect foreign key dependencies:

1. `users`
2. `refresh_tokens`
3. `cases`
4. `entities`
5. `entity_aliases`
6. `analysis_results`
7. `network_metrics`

---

## Performance Considerations

1. **Full-text search** uses GIN index on `search_vector`
2. **User-scoped queries** benefit from composite indexes `(user_id, ...)`
3. **Soft deletes** prevent data loss, add `is_deleted` to all queries
4. **UUID primary keys** provide security (non-guessable IDs)
