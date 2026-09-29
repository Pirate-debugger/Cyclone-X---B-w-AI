import time
import uuid
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.logging import logger
from app.api.routes_system import router as system_router
from app.api.routes_events import router as events_router
from app.api.routes_weather import router as weather_router
from app.api.routes_risk import router as risk_router
from app.api.routes_earth_engine import router as ee_router
from app.api.routes_scenarios import router as scenarios_router
from app.api.routes_infrastructure import router as infra_router
from app.api.routes_ai import router as ai_router
from app.api.routes_alerts import router as alerts_router
from app.api.routes_reports import router as reports_router
from app.api.routes_v2 import router as v2_router
from app.api.routes_geography import router as geography_router

app = FastAPI(
    title="CYCLONE-X API",
    description="AI-Powered Cyclone Impact & Infrastructure Vulnerability Intelligence Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Timing & Correlation ID Middleware
@app.middleware("http")
async def add_process_time_and_logging(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", f"req-{uuid.uuid4().hex[:8]}")
    start_time = time.time()
    
    try:
        response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-MS"] = str(duration_ms)
        
        # Log request summary
        logger.info(
            f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)",
            extra={
                "request_id": request_id,
                "route": request.url.path,
                "duration_ms": duration_ms,
                "status_code": response.status_code
            }
        )
        return response
    except Exception as exc:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        logger.error(
            f"Unhandled server error on {request.method} {request.url.path}: {str(exc)}",
            extra={
                "request_id": request_id,
                "route": request.url.path,
                "duration_ms": duration_ms
            }
        )
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An internal server error occurred.",
                    "provider": "CYCLONE-X CORE",
                    "request_id": request_id
                }
            }
        )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = request.headers.get("X-Request-ID", f"req-{uuid.uuid4().hex[:8]}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
                "provider": "CYCLONE-X API",
                "request_id": request_id
            }
        }
    )

# Register API routes under /api
app.include_router(system_router, prefix="/api")
app.include_router(events_router, prefix="/api")
app.include_router(weather_router, prefix="/api")
app.include_router(risk_router, prefix="/api")
app.include_router(ee_router, prefix="/api")
app.include_router(scenarios_router, prefix="/api")
app.include_router(infra_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(geography_router, prefix="/api")
app.include_router(v2_router, prefix="/api")
app.include_router(v2_router, prefix="/api/v2")

@app.get("/")
async def root():
    return {
        "platform": "CYCLONE-X",
        "description": "AI-Powered Cyclone Impact & Infrastructure Vulnerability Intelligence Platform",
        "version": settings.APP_VERSION,
        "mode": settings.APP_MODE.upper(),
        "docs": "/docs",
        "api_health": "/api/health"
    }
