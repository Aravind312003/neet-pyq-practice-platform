import os
import uvicorn
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config import settings
from app.routers import auth, questions, bookmarks

# SlowAPI Limiter Setup
limiter = Limiter(key_func=get_remote_address)

# Swagger and Doc setup based on Environment
app_kwargs = {}
if settings.ENV == "production":
    app_kwargs["openapi_url"] = None
    app_kwargs["docs_url"] = None
    app_kwargs["redoc_url"] = None

app = FastAPI(
    title="NEET PYQ Practice API Platform",
    description="High-fidelity secure REST services for custom NEET Practice papers",
    version="1.0.0",
    **app_kwargs
)

# Attach Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# -------------------------------------------------------------------------
# 1. Custom Middleware for Security Headers (Added FIRST)
# -------------------------------------------------------------------------
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    # Removed backend-blocking Content-Security-Policy header
    return response

# -------------------------------------------------------------------------
# 2. CORS Middleware Configuration (Added LAST, so it executes FIRST)
# -------------------------------------------------------------------------
origins = [
    "https://neet-pyq-practice-platform.web.app",  # Production Frontend
]

if settings.ENV != "production":
    origins.append("*")
else:
    origins.append(os.getenv("APP_URL", "https://localhost:3000"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------------
# 3. Centralized Exception Handler (With Manual CORS Fallback)
# -------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    detail = "An unexpected error occurred. Please try again."
    if settings.ENV != "production":
        detail = str(exc)
        
    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": detail}
    )
    
    # Manually append CORS headers on 500 crashes so Chrome doesn't block the traceback
    origin = request.headers.get("origin")
    if origin and (origin in origins or "*" in origins):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        
    return response

# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(bookmarks.router, prefix="/api")

@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "environment": settings.ENV}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=settings.ENV != "production")