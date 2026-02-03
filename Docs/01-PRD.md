# Product Requirements Document (PRD)
## Legal Network Analysis Platform - Nomothetes

**Version:** 1.0
**Last Updated:** January 24, 2026
**Project Budget:** $0 (Open Source Stack)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision](#2-product-vision)
3. [Tech Stack](#3-tech-stack-zero-cost)
4. [Core Features](#4-core-features)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Deployment Architecture](#6-deployment-architecture)
7. [Success Criteria](#7-success-criteria)
8. [Development Phases](#8-development-phases)
9. [Risks & Mitigations](#9-risks--mitigations)

---

## 1. Executive Summary

A web-based platform for analyzing legal case documents that extracts entities (judges, lawyers, courts), builds relationship networks, and provides AI-powered insights using a completely free tech stack.

**Key Capabilities:**
- PDF document ingestion with OCR
- Named Entity Recognition (NER) for legal entities
- Network graph construction and visualization
- AI-powered case summarization and sentiment analysis
- User-isolated data with secure authentication

---

## 2. Product Vision

Enable legal professionals to discover hidden patterns, relationships, and behavioral insights across large volumes of legal documents through automated network analysis and AI-driven psychoanalysis within their own legal document collection.

**Target Users:**
- Legal researchers
- Law firms
- Legal analysts
- Academic researchers

---

## 3. Tech Stack (Zero Cost)

### 3.1 Core Infrastructure

| Component | Technology |
|-----------|------------|
| Backend Framework | FastAPI |
| Relational Database | PostgreSQL |
| Graph Processing | NetworkX (Python library) |
| Graph Data Storage | PostgreSQL (edge/node tables) |
| Task Queue | Redis Streams |
| Container Orchestration | Docker Compose |

### 3.2 Frontend Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18+ with TypeScript |
| Styling | Tailwind CSS |
| Build Tool | Vite |
| State Management | React Query (TanStack Query) |
| Routing | React Router v6 |
| HTTP Client | Axios |
| Authentication | JWT tokens with refresh token rotation |

### 3.3 Data Processing

| Component | Technology |
|-----------|------------|
| OCR Engine | Tesseract OCR (via pytesseract) / PyMuPDF |
| Entity Extraction | spaCy / NLTK (NER models) |
| Fuzzy Matching | RapidFuzz |

### 3.4 Visualization & Charts

| Component | Technology |
|-----------|------------|
| Graph Visualization | React Flow |
| Charts | Recharts / Chart.js |
| Icons | Lucide React |

### 3.5 AI & Intelligence

| Component | Technology |
|-----------|------------|
| LLM Services | Gemini API (free tier) |

### 3.6 Authentication & Security

| Component | Technology |
|-----------|------------|
| Password Hashing | Argon2id |
| JWT Library | PyJWT (Python) |
| Session Storage | Redis (for refresh tokens) |

---

## 4. Core Features Overview

| Feature | Description |
|---------|-------------|
| 4.1 Authentication & Authorization | Secure user login, registration, JWT tokens |
| 4.2 Frontend Dashboard | React-based UI with TypeScript and Tailwind |
| 4.3 Document Processing | PDF upload, OCR, entity extraction |
| 4.4 Entity Normalization | Fuzzy matching to merge duplicates |
| 4.5 Network Graph Construction | Build relationship networks |
| 4.6 Network Analysis | Calculate centrality metrics |
| 4.7 AI-Powered Analysis | LLM summarization and insights |
| 4.8 Search & Query | Full-text search with filters |
| 4.9 Task Processing | Async processing with Redis Streams |
| 4.10 Data Isolation | Complete user data separation |
| 4.11 API Endpoints | RESTful API specification |

*See detailed specifications in separate documents.*

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Metric | Target |
|--------|--------|
| Concurrent users | 100 |
| PDF processing (50 pages) | < 60 seconds |
| API response time (95th percentile) | < 1 second |
| Frontend First Contentful Paint | < 1.5 seconds |
| Frontend Time to Interactive | < 3 seconds |

### 5.2 Scalability

- Horizontal scaling of worker processes
- Database connection pooling
- Redis clustering support

### 5.3 Reliability

- 99% uptime target
- Automatic task retry on failure
- Graceful degradation when external APIs unavailable

### 5.4 Security

**Authentication & Authorization:**
- JWT token validation on all protected routes
- HTTP-only cookies for refresh tokens
- HTTPS only in production
- CSRF protection for state-changing operations

**Data Protection:**
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)
- Password hashing with Argon2id
- Account lockout after failed login attempts

**Data Isolation:**
- Every database query includes user_id filter
- Authorization middleware on all protected routes
- No endpoints return other users' data
- Background tasks validate user ownership

**Rate Limiting:**
- Login: 5 requests per 15 min per IP
- Register: 3 requests per hour per IP
- Upload: 10 files/hour per user
- Analyze: 5 requests/hour per user
- Search: 100 requests/hour per user

---

## 6. Deployment Architecture

### 6.1 Container Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │   Frontend    │  │    Backend    │  │    Worker     │   │
│  │   (React)     │  │   (FastAPI)   │  │   (Python)    │   │
│  │   Port: 3000  │  │   Port: 8000  │  │   (No port)   │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐                      │
│  │  PostgreSQL   │  │     Redis     │                      │
│  │  Port: 5432   │  │  Port: 6379   │                      │
│  └───────────────┘  └───────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `GEMINI_API_KEY` | Gemini API key for AI features |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins |
| `UPLOAD_PATH` | Path for file uploads |

---

## 7. Success Criteria

### 7.1 MVP Launch Criteria

- [ ] Successfully process 100 legal PDFs
- [ ] Build network graph with 500+ entities
- [ ] Generate AI summaries for all cases
- [ ] API documentation complete (OpenAPI/Swagger)
- [ ] Docker deployment working
- [ ] Frontend deployed and accessible via browser
- [ ] All major pages functional (Dashboard, Cases, Network, Analytics)
- [ ] Graph visualization working with 100+ nodes
- [ ] Mobile-responsive design verified
- [ ] Authentication system fully functional (register, login, logout)
- [ ] Protected routes enforcing authentication

### 7.2 Key Performance Indicators (KPIs)

| Metric | Target |
|--------|--------|
| Processing accuracy | > 80% |
| User-reported bug rate | < 5 per 100 documents |
| Free tier API limits exceeded | Never |
| Frontend Lighthouse score | > 85 |
| Critical accessibility issues | Zero |
| Page load time (3G connection) | < 3 seconds |
| Unauthorized access incidents | Zero |
| Login success rate | > 95% |
| Token refresh success rate | > 99% |
| Account creation time | < 2 minutes |

---

## 8. Development Phases

| Phase | Duration | Focus |
|-------|----------|-------|
| 1 | Weeks 1-3 | Authentication & Backend Foundation |
| 2 | Weeks 4-5 | Frontend Foundation & Auth UI |
| 3 | Weeks 6-7 | Core Backend Features |
| 4 | Weeks 8-9 | Case Management UI |
| 5 | Weeks 10-11 | Network & Entity Features |
| 6 | Weeks 12-13 | Analytics & Charts |
| 7 | Week 14 | AI Integration |
| 8 | Weeks 15-16 | Search & Advanced Features |
| 9 | Weeks 17-18 | Testing, Security & Deployment |

*See detailed phase breakdown in 07-Development-Phases.md*

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Free API rate limits exceeded | High | Implement caching, rate limiting, queue management |
| Poor OCR accuracy on scanned PDFs | Medium | Use PyMuPDF for digital PDFs, Tesseract for scanned |
| Entity extraction inaccuracy | High | Fine-tune NER models, add manual correction interface |
| NetworkX performance on large graphs | Medium | Optimize algorithms, consider Neo4j if needed |
| Redis memory limits | Low | Use Redis persistence, monitor memory usage |
| Frontend performance with large datasets | High | Implement virtualization, pagination, lazy loading |
| Graph visualization crashes on large networks | Medium | Limit initial render to 500 nodes, add filters |
| Browser compatibility issues | Low | Test on Chrome, Firefox, Safari; use polyfills |
| JWT token security vulnerabilities | High | Short-lived access tokens, secure refresh tokens in httpOnly cookies |
| Brute force attacks on login | High | Rate limiting, account lockout, CAPTCHA after failures |
| Unauthorized data access | High | Strict user authentication on every endpoint |
| Password storage compromise | High | Use Argon2 with high cost factor, never log passwords |

---

**Document Status:** Ready for Development
**Next Steps:** Begin Phase 1 - Authentication & Backend Foundation
