# Nomothetes

A web-based **Legal Network Analysis Platform** for analyzing legal case documents, extracting entities, and visualizing relationships between legal actors.

> *Nomothetes* (Greek: νομοθέτης) means "lawgiver" or "legislator"

## Overview

Nomothetes helps legal researchers, law firms, and analysts process legal documents at scale. Upload PDF case files, automatically extract named entities (judges, lawyers, courts, organizations), and discover hidden relationships through interactive network visualizations.

### Key Features

- **PDF Processing** - Upload legal documents with automatic OCR for scanned files
- **AI Entity Extraction** - Extract persons, courts, organizations, dates, and locations using Google Gemini
- **Network Visualization** - Interactive graph showing relationships between legal entities
- **AI Case Analysis** - Generate summaries, sentiment analysis, and argument extraction
- **Full-Text Search** - Search across all documents with filters
- **Analytics Dashboard** - Statistics and trends across your case library
- **Multi-User Support** - Complete data isolation between users

## Tech Stack

### Backend
| Component | Technology |
|-----------|------------|
| Framework | FastAPI |
| Database | PostgreSQL 15 |
| ORM | SQLAlchemy |
| OCR | PyMuPDF + Tesseract |
| AI/NER | Google Gemini API |
| Auth | JWT + Argon2 |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| State | TanStack Query |
| Charts | Recharts |
| Graph | Neo4j NVL |

### Infrastructure
- Docker Compose
- Nginx (production)

## Project Structure

```
Nomothetes/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # API endpoints
│   │   ├── core/            # Config, security, auth
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   └── main.py          # FastAPI entry point
│   ├── migrations/          # Alembic migrations
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── context/         # Auth, Theme contexts
│   │   ├── services/        # API clients
│   │   └── App.tsx
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── .env
```

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Google Gemini API key (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/nomothetes.git
   cd nomothetes
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables**
   ```env
   # Database
   DB_HOST=postgres
   DB_PORT=5435
   DB_NAME=nomothetes
   DB_USER=postgres
   PASSWORD=your_secure_password

   # JWT
   JWT_SECRET=your_jwt_secret_key
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=15
   REFRESH_TOKEN_EXPIRE_DAYS=7

   # AI
   GEMINI_API_KEY=your_gemini_api_key

   # CORS
   ALLOWED_ORIGINS=http://localhost,http://localhost:80

   # App
   DEBUG=False
   UPLOAD_PATH=./uploads
   ```

4. **Build and start**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

5. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## API Reference

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/refresh` | POST | Refresh access token |
| `/api/auth/me` | GET | Get current user |

### Cases
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cases/upload` | POST | Upload PDF |
| `/api/cases` | GET | List cases |
| `/api/cases/{id}` | GET | Get case details |
| `/api/cases/{id}` | DELETE | Delete case |
| `/api/cases/{id}/entities` | GET | Get entities |
| `/api/cases/{id}/reprocess` | POST | Re-extract entities |

### Analysis
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analysis/{case_id}` | GET | Get analysis results |
| `/api/analysis/{case_id}` | POST | Trigger AI analysis |

### Network
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/network/graph` | GET | Get network graph |

### Search
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search` | GET | Search cases |

### Analytics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/overview` | GET | Dashboard stats |

## How It Works

### Document Processing Pipeline

```
Upload PDF → Validate → Save File
                ↓
        Extract Text (PyMuPDF)
                ↓
         OCR if needed (Tesseract)
                ↓
        Entity Extraction (Gemini AI)
                ↓
         Deduplicate & Normalize
                ↓
          Store in Database
```

### Entity Types Extracted

| Type | Examples |
|------|----------|
| PERSON | Judges, Advocates, Petitioners |
| COURT | Supreme Court, High Court, District Court |
| ORG | Government bodies, Companies, Institutions |
| LOCATION | Cities, States, Countries |
| DATE | Case dates, Judgment dates |

### Network Graph

Entities are connected when they appear in the same case document. Edge weights represent co-occurrence frequency. The visualization uses force-directed layout for intuitive exploration.

## Security Features

- **JWT Authentication** with short-lived access tokens (15 min)
- **Refresh Token Rotation** for enhanced security
- **Argon2id Password Hashing**
- **Rate Limiting** on all endpoints
- **User Data Isolation** - queries filtered by user_id
- **Secure Cookies** (httpOnly, secure in production)
- **CORS Configuration**

## Development

### Local Development (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Deployment

The application is containerized and ready for deployment on:

- **Railway** - Connect GitHub repo, auto-deploys
- **Render** - Docker support with managed databases
- **Fly.io** - Global deployment with Dockerfile
- **AWS/GCP/Azure** - Using Docker Compose or Kubernetes

### Production Checklist

- [ ] Set `DEBUG=False`
- [ ] Use strong `JWT_SECRET`
- [ ] Configure production `DATABASE_URL`
- [ ] Set `ALLOWED_ORIGINS` to your domain
- [ ] Enable HTTPS (handled by platform or reverse proxy)

## Documentation

Detailed documentation available in `/Docs`:

- `01-PRD.md` - Product Requirements
- `02-Database-Schema.md` - Database design
- `03-API-Reference.md` - Full API documentation
- `04-Frontend-Specifications.md` - UI/UX specs
- `05-Backend-Architecture.md` - System architecture
- `06-Security-Guidelines.md` - Security practices

## License

MIT License

## Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [Google Gemini](https://ai.google.dev/) - AI/ML capabilities
- [Neo4j NVL](https://neo4j.com/docs/nvl/) - Graph visualization
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
