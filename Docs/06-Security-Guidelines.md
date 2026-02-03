# Security Guidelines
## Nomothetes - Legal Network Analysis Platform

---

## Authentication Security

### Password Requirements

- Minimum 8 characters
- Must include:
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character (!@#$%^&*)

### Password Hashing

Use **Argon2id** with recommended parameters:

```python
from argon2 import PasswordHasher

ph = PasswordHasher(
    time_cost=3,      # Number of iterations
    memory_cost=65536, # 64MB memory
    parallelism=4,     # Parallel threads
    hash_len=32,       # Hash length
    salt_len=16        # Salt length
)
```

### JWT Token Security

**Access Token:**
- Short-lived: 15 minutes
- Stored in memory (React state)
- Sent via Authorization header
- Payload: `{ user_id, email, exp, type: "access" }`

**Refresh Token:**
- Long-lived: 7 days
- Stored in Redis
- Sent via httpOnly cookie
- Random UUID (not JWT)

```python
# Cookie settings for refresh token
response.set_cookie(
    key="refresh_token",
    value=refresh_token,
    httponly=True,        # Prevent XSS access
    secure=True,          # HTTPS only (production)
    samesite="strict",    # CSRF protection
    max_age=7 * 24 * 3600 # 7 days
)
```

---

## Rate Limiting

| Endpoint | Limit | Key |
|----------|-------|-----|
| POST /api/auth/login | 5 per 15 min | IP address |
| POST /api/auth/register | 3 per hour | IP address |
| POST /api/cases/upload | 10 per hour | User ID |
| POST /api/cases/{id}/analyze | 5 per hour | User ID |
| POST /api/search | 100 per hour | User ID |

### Account Lockout

- Lock account after 5 failed login attempts
- Lockout duration: 15 minutes
- Store in `users.locked_until` field

```python
if user.failed_login_attempts >= 5:
    user.locked_until = datetime.utcnow() + timedelta(minutes=15)
    db.commit()
    raise HTTPException(423, "Account locked. Try again in 15 minutes.")
```

---

## Data Isolation

### Critical Rule

**EVERY database query MUST include user_id filter**

```python
# FORBIDDEN - Data leak vulnerability
cases = db.query(Case).filter(Case.case_id == case_id).all()

# REQUIRED - User-scoped query
cases = db.query(Case).filter(
    Case.case_id == case_id,
    Case.uploaded_by == current_user.user_id,
    Case.is_deleted == False
).all()
```

### Authorization Middleware

Use dependency injection for all protected endpoints:

```python
@app.get("/api/cases/{case_id}")
async def get_case(
    case: Case = Depends(require_case_ownership)
):
    return case
```

### Network Isolation

Each user has isolated network graph:
- Redis key: `network:{user_id}:graph`
- Never mix graphs between users
- Fuzzy matching only within user's entities

---

## Input Validation

### SQL Injection Prevention

Always use parameterized queries (SQLAlchemy handles this):

```python
# FORBIDDEN - SQL injection vulnerability
db.execute(f"SELECT * FROM cases WHERE id = '{case_id}'")

# REQUIRED - Parameterized query
db.query(Case).filter(Case.case_id == case_id).first()
```

### XSS Prevention

1. **React auto-escapes** by default
2. **Never use** `dangerouslySetInnerHTML`
3. **Sanitize** any user-generated content before storage

```python
import bleach

def sanitize_input(text: str) -> str:
    return bleach.clean(text, strip=True)
```

### File Upload Validation

```python
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_MIME_TYPES = ["application/pdf"]

async def validate_upload(file: UploadFile):
    # Check MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, "Only PDF files allowed")

    # Check file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large (max 50MB)")

    # Sanitize filename
    safe_filename = sanitize_filename(file.filename)

    await file.seek(0)  # Reset file pointer
    return contents, safe_filename

def sanitize_filename(filename: str) -> str:
    # Remove path separators
    filename = filename.replace("/", "_").replace("\\", "_")
    # Remove special characters
    filename = re.sub(r'[^\w\-_\.]', '_', filename)
    # Limit length
    return filename[:255]
```

---

## CSRF Protection

### SameSite Cookies

```python
response.set_cookie(
    key="refresh_token",
    value=token,
    samesite="strict"  # Prevents CSRF
)
```

### Double Submit Cookie

For additional protection on state-changing operations:

```python
from secrets import token_urlsafe

@app.get("/api/csrf-token")
async def get_csrf_token():
    token = token_urlsafe(32)
    response.set_cookie("csrf_token", token, httponly=False)
    return {"csrf_token": token}

def validate_csrf(request: Request):
    cookie_token = request.cookies.get("csrf_token")
    header_token = request.headers.get("X-CSRF-Token")

    if not cookie_token or cookie_token != header_token:
        raise HTTPException(403, "CSRF validation failed")
```

---

## HTTPS Configuration

### Production Requirements

- **Always use HTTPS** in production
- Redirect HTTP to HTTPS
- Use TLS 1.2 or higher

### Security Headers

```python
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

# Redirect HTTP to HTTPS
app.add_middleware(HTTPSRedirectMiddleware)

# Only allow specific hosts
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["yourdomain.com", "*.yourdomain.com"]
)

# Add security headers
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response
```

---

## Logging & Auditing

### Audit Log Events

Log these security-relevant events:

| Event | Data to Log |
|-------|-------------|
| Login success | user_id, IP, timestamp |
| Login failure | email, IP, timestamp, reason |
| Account lockout | user_id, IP, timestamp |
| Password change | user_id, timestamp |
| Case upload | user_id, case_id, filename |
| Entity merge | user_id, entity_ids, timestamp |
| Analysis triggered | user_id, case_id, type |
| Account deletion | user_id, timestamp |

### Sensitive Data Rules

**NEVER log:**
- Passwords (plaintext or hashed)
- Full JWT tokens
- Refresh tokens
- Full document content
- Personal data beyond user_id

```python
import logging

logger = logging.getLogger(__name__)

# FORBIDDEN
logger.info(f"User {email} logged in with password {password}")

# CORRECT
logger.info(f"Login success: user_id={user.user_id}, ip={request.client.host}")
```

---

## API Security Checklist

### For Every Endpoint

- [ ] Requires authentication (JWT token)
- [ ] Validates user ownership of resources
- [ ] Uses parameterized queries
- [ ] Rate limiting applied
- [ ] Input validated and sanitized
- [ ] Errors don't leak sensitive information

### Error Responses

**FORBIDDEN - Information leak:**
```json
{
  "detail": "User john@example.com not found"
}
```

**CORRECT - Generic message:**
```json
{
  "detail": "Invalid credentials"
}
```

---

## Dependency Security

### Requirements

Keep dependencies updated:

```bash
pip install pip-audit
pip-audit  # Check for vulnerabilities
```

### Known Vulnerable Packages

Never use outdated versions of:
- PyJWT (use >= 2.0)
- SQLAlchemy (use >= 2.0)
- FastAPI (use latest stable)
- Pillow (use latest stable)

---

## Security Testing

### Pre-Launch Checklist

1. **SQL Injection testing**
   - Test all query parameters
   - Use tools like sqlmap

2. **XSS testing**
   - Test all input fields
   - Check stored vs reflected XSS

3. **Authentication testing**
   - Brute force protection
   - Session fixation
   - Token expiration

4. **Authorization testing**
   - Access other users' resources
   - Privilege escalation
   - IDOR vulnerabilities

5. **Data isolation testing**
   - Create two users
   - Verify complete separation
   - Test all endpoints

### Recommended Tools

- OWASP ZAP (automated scanning)
- Burp Suite (manual testing)
- sqlmap (SQL injection)
- pytest (automated security tests)

---

## Incident Response

### If Data Breach Detected

1. Immediately invalidate all refresh tokens
2. Force password reset for affected users
3. Rotate JWT secret key
4. Review audit logs
5. Notify affected users
6. Document incident

### Emergency Token Invalidation

```python
# Invalidate all tokens for a user
redis_client.delete(f"refresh_token:{user_id}")

# Invalidate ALL tokens (nuclear option)
redis_client.flushdb()  # Clears all refresh tokens
# Rotate JWT_SECRET  # Invalidates all access tokens
```
