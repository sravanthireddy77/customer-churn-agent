import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import agent, campaigns, churn, customers, health, tasks, seed
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.rate_limit import InMemoryRateLimitMiddleware
from app.db.database import Base, engine

configure_logging()
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Skip lifespan initialization in serverless environments
    if settings.auto_create_tables and os.getenv("VERCEL") != "1":
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created")
            # Only seed if explicitly requested via environment variable
            if settings.environment == "production" and os.getenv("SEED_DATABASE") == "true":
                from app.db.seed import seed
                seed()
                logger.info("Database seeded with sample data")
        except Exception as e:
            logger.warning(f"Database initialization error: {e}")
    yield


# For Vercel serverless, skip lifespan completely
if os.getenv("VERCEL") == "1":
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url=f"{settings.api_prefix}/docs",
        openapi_url=f"{settings.api_prefix}/openapi.json",
    )
else:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url=f"{settings.api_prefix}/docs",
        openapi_url=f"{settings.api_prefix}/openapi.json",
        lifespan=lifespan,
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list if settings.environment == "development" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    InMemoryRateLimitMiddleware,
    requests=settings.rate_limit_requests,
    window_seconds=settings.rate_limit_window_seconds,
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    logger.info(
        "request completed",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
        },
    )
    return response

app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(seed.router, prefix=settings.api_prefix)
app.include_router(agent.router, prefix=settings.api_prefix)
app.include_router(customers.router, prefix=settings.api_prefix)
app.include_router(churn.router, prefix=settings.api_prefix)
app.include_router(tasks.router, prefix=settings.api_prefix)
app.include_router(campaigns.router, prefix=settings.api_prefix)
