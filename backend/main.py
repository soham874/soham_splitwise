import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware

from backend.config import settings
from backend.db import init_db
from backend.logging_config import setup_logging, request_id_ctx
from backend.controllers import (
    auth_controller,
    groups_controller,
    expenses_controller,
    currencies_controller,
    trip_controller,
)

logger = logging.getLogger(__name__)


class RequestTracingMiddleware(BaseHTTPMiddleware):
    """Assign a unique request ID and log every request/response."""

    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        request_id_ctx.set(rid)
        request.state.request_id = rid

        user_id = request.session.get("user_id", "-") if hasattr(request, "session") else "-"
        logger.info(">>> %s %s  user=%s", request.method, request.url.path, user_id)

        start = time.perf_counter()
        try:
            response: Response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.exception("!!! %s %s  500 in %.0fms", request.method, request.url.path, duration_ms)
            raise

        duration_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "<<< %s %s  status=%s  %.0fms",
            request.method, request.url.path, response.status_code, duration_ms,
        )
        response.headers["X-Request-ID"] = rid
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Application starting up")
    init_db()
    logger.info("Application ready")
    yield
    logger.info("Application shutting down")


app = FastAPI(title="Splitwise Manager API", lifespan=lifespan)

# Middleware order matters: outermost first, innermost last.
# RequestTracing wraps everything so it sees the final status code.
app.add_middleware(RequestTracingMiddleware)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_controller.router, prefix="/api")
app.include_router(groups_controller.router, prefix="/api")
app.include_router(expenses_controller.router, prefix="/api")
app.include_router(currencies_controller.router, prefix="/api")
app.include_router(trip_controller.router, prefix="/api")


@app.get("/api/health")
def health():
    from backend.db import get_connection
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        conn.close()
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {e}"
    return {"status": "ok", "db": db_status}
