# app/main.py
import logging
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import sentry_sdk
from app.config import settings
from app.routers import gateway, dashboard

# 1. Setup Logging
logging.basicConfig(
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
    level=logging.INFO
)
logger = logging.getLogger("gatellm")

# 2. Setup Sentry
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment
    )
    logger.info("Sentry monitoring telah diaktifkan")

# 3. Setup Rate Limiter
limiter = Limiter(key_func=get_remote_address)

# 4. Inisialisasi FastAPI
app = FastAPI(
    title="GateLLM API Gateway",
    description="Satu API Key untuk akses semua model AI ternama berbasis prabayar (prepaid).",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 5. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"]
)

# 6. Global Exceptions Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail.get("error", "api_error") if isinstance(exc.detail, dict) else "api_error",
                 "status": exc.status_code,
                 "message": exc.detail.get("message", str(exc.detail)) if isinstance(exc.detail, dict) else str(exc.detail)}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": "validation_error",
            "status": 422,
            "message": "Validasi skema request payload gagal",
            "detail": exc.errors()
        }
    )

# 7. Include Routers
# Gateway router mencakup v1 dan health
app.include_router(gateway.router)
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])

@app.get("/")
async def index():
    return {
        "app": "GateLLM API Gateway",
        "status": "online",
        "docs": "/docs"
    }

logger.info("GateLLM backend successfully initialized")
