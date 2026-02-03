# Docker Setup Guide
## Nomothetes - Legal Network Analysis Platform

---

## Container Architecture

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

---

## docker-compose.yml

```yaml
version: '3.8'

services:
  # Frontend - React Application
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - backend
    networks:
      - nomothetes-network

  # Backend - FastAPI Application
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://nomothetes:${DB_PASSWORD}@postgres:5432/nomothetes
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - ALLOWED_ORIGINS=http://localhost:3000
      - UPLOAD_PATH=/app/uploads
    volumes:
      - uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - nomothetes-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Worker - Background Task Processor
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: python worker.py
    environment:
      - DATABASE_URL=postgresql://nomothetes:${DB_PASSWORD}@postgres:5432/nomothetes
      - REDIS_URL=redis://redis:6379
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - UPLOAD_PATH=/app/uploads
    volumes:
      - uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - nomothetes-network
    deploy:
      replicas: 2  # Run multiple workers

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=nomothetes
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=nomothetes
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/migrations/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - nomothetes-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nomothetes"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis Cache & Queue
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - nomothetes-network

volumes:
  postgres_data:
  redis_data:
  uploads:

networks:
  nomothetes-network:
    driver: bridge
```

---

## Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy model
RUN python -m spacy download en_core_web_sm

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Frontend Dockerfile

```dockerfile
# frontend/Dockerfile

# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
```

---

## Frontend Nginx Config

```nginx
# frontend/nginx.conf
server {
    listen 3000;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Handle SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

---

## Environment Variables

### .env.example

```bash
# Database
DB_PASSWORD=your_secure_password_here

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=your_jwt_secret_here

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Production settings
# ALLOWED_ORIGINS=https://yourdomain.com
```

### Generate Secure Secrets

```bash
# Generate JWT secret
openssl rand -hex 32

# Generate database password
openssl rand -base64 24
```

---

## Development Setup

### Start Services

```bash
# Clone repository
git clone <repo-url>
cd nomothetes

# Create environment file
cp .env.example .env
# Edit .env with your values

# Build and start containers
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
```

### Run Migrations

```bash
# Enter backend container
docker-compose exec backend bash

# Run Alembic migrations
alembic upgrade head
```

### Access Services

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## Production Deployment

### docker-compose.prod.yml

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: always
    environment:
      - VITE_API_URL=https://api.yourdomain.com

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    environment:
      - DATABASE_URL=postgresql://nomothetes:${DB_PASSWORD}@postgres:5432/nomothetes
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - ALLOWED_ORIGINS=https://yourdomain.com

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: python worker.py
    restart: always
    deploy:
      replicas: 4  # More workers for production

  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      - POSTGRES_USER=nomothetes
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=nomothetes

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    restart: always
```

### Deploy Commands

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d --build

# Scale workers
docker-compose -f docker-compose.prod.yml up -d --scale worker=4

# Update single service
docker-compose -f docker-compose.prod.yml up -d --build backend
```

---

## Useful Commands

### Container Management

```bash
# Stop all containers
docker-compose down

# Stop and remove volumes (CAUTION: deletes data)
docker-compose down -v

# Restart a service
docker-compose restart backend

# View running containers
docker-compose ps

# Shell into container
docker-compose exec backend bash
docker-compose exec postgres psql -U nomothetes
```

### Database Operations

```bash
# Create database backup
docker-compose exec postgres pg_dump -U nomothetes nomothetes > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U nomothetes nomothetes

# Connect to PostgreSQL
docker-compose exec postgres psql -U nomothetes
```

### Redis Operations

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# View all keys
docker-compose exec redis redis-cli KEYS "*"

# Clear Redis cache (CAUTION)
docker-compose exec redis redis-cli FLUSHALL
```

### Logs & Debugging

```bash
# All logs
docker-compose logs -f

# Specific service with timestamps
docker-compose logs -f --timestamps backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

---

## Health Checks

### Backend Health Endpoint

```python
# app/main.py
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "redis": "connected"
    }
```

### Monitor Health

```bash
# Check all services
docker-compose ps

# Check backend health
curl http://localhost:8000/health
```

---

## Troubleshooting

### Common Issues

**Database connection refused:**
```bash
# Wait for PostgreSQL to be ready
docker-compose logs postgres
# Check if healthy before starting backend
```

**Permission denied on uploads:**
```bash
# Fix permissions
docker-compose exec backend chmod -R 777 /app/uploads
```

**Worker not processing tasks:**
```bash
# Check Redis connection
docker-compose exec worker python -c "import redis; r = redis.from_url('redis://redis:6379'); print(r.ping())"
```

**Out of disk space:**
```bash
# Clean up Docker
docker system prune -a
docker volume prune
```
