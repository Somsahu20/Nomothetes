# Development Phases
## Nomothetes - Legal Network Analysis Platform

**Total Duration:** 18 Weeks

---

## Phase 1: Authentication & Backend Foundation
**Duration:** Weeks 1-3

### Deliverables

- [ ] FastAPI project setup
- [ ] PostgreSQL database setup
- [ ] Redis setup
- [ ] Docker Compose configuration
- [ ] Database migrations with Alembic
- [ ] User authentication system:
  - [ ] User registration endpoint
  - [ ] Login with JWT tokens
  - [ ] Refresh token mechanism
  - [ ] Password hashing with Argon2id
  - [ ] Logout endpoint
- [ ] Users table and refresh_tokens table
- [ ] Rate limiting on auth endpoints
- [ ] Authorization middleware:
  - [ ] `get_current_user()` dependency
  - [ ] `require_case_ownership()` helper
  - [ ] `require_entity_ownership()` helper
- [ ] Basic error handling
- [ ] Environment configuration

### Technical Tasks

```bash
# Project setup
mkdir backend && cd backend
python -m venv venv
pip install fastapi uvicorn sqlalchemy alembic psycopg2-binary redis pyjwt argon2-cffi

# Initialize Alembic
alembic init migrations
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

### Testing Criteria

- [ ] User can register with valid data
- [ ] User can login and receive tokens
- [ ] Access token expires correctly
- [ ] Refresh token works
- [ ] Rate limiting blocks excessive requests
- [ ] Invalid credentials return 401
- [ ] Account locks after 5 failed attempts

---

## Phase 2: Frontend Foundation & Auth UI
**Duration:** Weeks 4-5

### Deliverables

- [ ] React + TypeScript + Vite project
- [ ] Tailwind CSS configuration
- [ ] Base component library:
  - [ ] Button (variants: primary, secondary, outline, danger)
  - [ ] Card
  - [ ] Input (text, password, email)
  - [ ] Modal
  - [ ] Badge
  - [ ] Skeleton loader
  - [ ] Toast notifications
- [ ] React Router v6 setup
- [ ] Authentication pages:
  - [ ] Login page
  - [ ] Registration page
  - [ ] Password strength indicator
- [ ] Auth Context provider
- [ ] Protected Route component
- [ ] Axios instance with interceptors
- [ ] React Query configuration
- [ ] Token refresh logic

### Technical Tasks

```bash
# Project setup
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install tailwindcss postcss autoprefixer
npm install react-router-dom axios @tanstack/react-query
npm install react-hot-toast lucide-react zod
npx tailwindcss init -p
```

### Testing Criteria

- [ ] Login form validates inputs
- [ ] Registration enforces password requirements
- [ ] Tokens stored correctly (memory + cookie)
- [ ] Protected routes redirect to login
- [ ] Token refresh happens automatically
- [ ] Error states display correctly

---

## Phase 3: Core Backend Features
**Duration:** Weeks 6-7

### Deliverables

- [ ] PDF upload endpoint
- [ ] File validation (size, type, sanitization)
- [ ] OCR service (Tesseract + PyMuPDF)
- [ ] Cases table in database
- [ ] Entities table in database
- [ ] spaCy NER integration
- [ ] Entity extraction pipeline
- [ ] Redis Streams task queue
- [ ] Worker process implementation
- [ ] Task status tracking
- [ ] Cascade deletion rules
- [ ] Full-text search setup (PostgreSQL tsvector)

### Technical Tasks

```bash
# Install dependencies
pip install pytesseract pymupdf spacy python-multipart
python -m spacy download en_core_web_sm
```

### Worker Implementation

```python
# worker.py
- Task types: ocr, entity_extraction
- Validate user ownership before processing
- Tag entities with owner_user_id
- Update task status in Redis
```

### Testing Criteria

- [ ] PDF uploads successfully
- [ ] Invalid files rejected
- [ ] OCR extracts text from PDFs
- [ ] Entities extracted and stored
- [ ] Tasks appear in queue
- [ ] Worker processes tasks
- [ ] User owns all their data

---

## Phase 4: Case Management UI
**Duration:** Weeks 8-9

### Deliverables

- [ ] App layout (sidebar + header)
- [ ] Sidebar navigation
- [ ] User dropdown menu
- [ ] Dashboard Overview page:
  - [ ] Statistics cards
  - [ ] Recent activity feed
  - [ ] Quick action buttons
- [ ] Cases List page:
  - [ ] Data table with pagination
  - [ ] Filters (court, date, status)
  - [ ] Search bar
  - [ ] Sort functionality
- [ ] Case Detail page:
  - [ ] Overview tab
  - [ ] Entities tab
  - [ ] Full Text tab
  - [ ] AI Analysis tab (placeholder)
  - [ ] Network tab (placeholder)
- [ ] Upload page:
  - [ ] Drag-and-drop zone
  - [ ] File preview list
  - [ ] Metadata inputs
  - [ ] Progress indicators
- [ ] Connect all pages to backend APIs
- [ ] Loading states
- [ ] Error handling

### Testing Criteria

- [ ] Dashboard shows correct statistics
- [ ] Cases list loads and paginates
- [ ] Filters work correctly
- [ ] Case detail shows all data
- [ ] File upload works with progress
- [ ] Only user's cases visible

---

## Phase 5: Network & Entity Features
**Duration:** Weeks 10-11

### Deliverables

- [ ] RapidFuzz integration
- [ ] Fuzzy matching service
- [ ] Entity normalization
- [ ] Entity aliases table
- [ ] NetworkX graph construction
- [ ] Network metrics calculation:
  - [ ] Degree centrality
  - [ ] Betweenness centrality
- [ ] Network metrics table
- [ ] Graph to JSON export
- [ ] Network Graph page:
  - [ ] React Flow integration
  - [ ] Node styling by type
  - [ ] Edge weights visualization
  - [ ] Zoom/Pan controls
  - [ ] Layout options
  - [ ] Node search
  - [ ] Node click details
- [ ] Entities page:
  - [ ] Entity directory
  - [ ] Type filters
  - [ ] Entity cards
  - [ ] Merge interface
- [ ] Audit logging for merges
- [ ] User-scoped network isolation

### Technical Tasks

```bash
pip install rapidfuzz networkx
npm install reactflow
```

### Testing Criteria

- [ ] Similar entities identified
- [ ] Merge creates correct aliases
- [ ] Network graph builds correctly
- [ ] Metrics calculated accurately
- [ ] Graph renders in browser
- [ ] Node interactions work
- [ ] Each user sees only their network

---

## Phase 6: Analytics & Charts
**Duration:** Weeks 12-13

### Deliverables

- [ ] Analytics API endpoints
- [ ] Time-series data aggregation
- [ ] Top entities queries
- [ ] Analytics page:
  - [ ] Statistics cards
  - [ ] Cases over time chart
  - [ ] Entity distribution pie chart
  - [ ] Top judges/lawyers bar charts
  - [ ] Trends area chart
- [ ] Dashboard charts integration
- [ ] PDF export functionality

### Technical Tasks

```bash
npm install recharts jspdf
```

### Testing Criteria

- [ ] Charts render with real data
- [ ] Time filters work
- [ ] Export generates valid PDF
- [ ] Only user's data in analytics

---

## Phase 7: AI Integration
**Duration:** Week 14

### Deliverables

- [ ] Gemini API integration
- [ ] Case summarization
- [ ] Sentiment analysis
- [ ] Argument pattern recognition
- [ ] Response caching
- [ ] Analysis results table
- [ ] AI Analysis tab in Case Detail
- [ ] "Analyze" button functionality
- [ ] Loading states for AI calls
- [ ] Error handling and retries
- [ ] Rate limit management

### Technical Tasks

```bash
pip install google-generativeai
```

### Testing Criteria

- [ ] Summaries generate correctly
- [ ] Sentiment analysis works
- [ ] Results cached (no duplicate calls)
- [ ] Errors handled gracefully
- [ ] Rate limits not exceeded

---

## Phase 8: Search & Advanced Features
**Duration:** Weeks 15-16

### Deliverables

- [ ] Full-text search backend
- [ ] Advanced search filters
- [ ] Search API endpoint
- [ ] Global search bar
- [ ] Search results page:
  - [ ] Highlighted snippets
  - [ ] Relevance scores
  - [ ] Faceted filters
  - [ ] Pagination
- [ ] Advanced search modal:
  - [ ] Query builder
  - [ ] Boolean operators
  - [ ] Entity filters
- [ ] Processing Queue page:
  - [ ] Task list with status
  - [ ] Auto-refresh
  - [ ] Retry button
- [ ] Toast notification system
- [ ] Error boundary component
- [ ] 404 and error pages

### Testing Criteria

- [ ] Search returns relevant results
- [ ] Advanced filters work
- [ ] Results only from user's data
- [ ] Task status updates in real-time
- [ ] Retry works for failed tasks

---

## Phase 9: Testing, Security & Deployment
**Duration:** Weeks 17-18

### Deliverables

- [ ] Security audit:
  - [ ] SQL injection testing
  - [ ] XSS testing
  - [ ] CSRF testing
  - [ ] Auth flow testing
- [ ] Data isolation testing:
  - [ ] Cross-user access attempts
  - [ ] API manipulation tests
  - [ ] Network graph isolation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Frontend unit tests (auth flows)
- [ ] End-to-end tests (Playwright)
- [ ] Performance optimization:
  - [ ] Database query optimization
  - [ ] Frontend bundle size
  - [ ] Image optimization
- [ ] Lighthouse audit (target: 85+)
- [ ] Accessibility audit (WCAG 2.1)
- [ ] Docker deployment guide
- [ ] Environment setup documentation
- [ ] README.md

### Security Checklist

```markdown
- [ ] All endpoints require authentication
- [ ] All queries include user_id filter
- [ ] Rate limiting on all endpoints
- [ ] Input validation everywhere
- [ ] Passwords hashed with Argon2
- [ ] Tokens expire correctly
- [ ] HTTPS configured
- [ ] Security headers added
- [ ] No sensitive data in logs
```

### Testing Criteria

- [ ] Zero security vulnerabilities found
- [ ] User A cannot access User B's data
- [ ] All tests pass
- [ ] Lighthouse score > 85
- [ ] Documentation complete
- [ ] Docker deployment works

---

## Milestone Summary

| Phase | Week | Key Milestone |
|-------|------|---------------|
| 1 | 3 | Auth system complete |
| 2 | 5 | Frontend auth working |
| 3 | 7 | Document processing pipeline |
| 4 | 9 | Case management UI |
| 5 | 11 | Network visualization |
| 6 | 13 | Analytics dashboard |
| 7 | 14 | AI analysis features |
| 8 | 16 | Search functionality |
| 9 | 18 | Production ready |

---

## Dependencies Between Phases

```
Phase 1 (Backend) ──────┐
                        ├──▶ Phase 3 (Processing) ──▶ Phase 5 (Network)
Phase 2 (Frontend) ─────┘                                    │
                                                             ▼
                        Phase 4 (Case UI) ◀──────── Phase 6 (Analytics)
                              │
                              ▼
                        Phase 7 (AI) ──▶ Phase 8 (Search)
                                               │
                                               ▼
                                         Phase 9 (Deploy)
```
