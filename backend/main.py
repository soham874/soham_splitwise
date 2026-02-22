from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from backend.config import settings
from backend.db import init_db
from backend.controllers import (
    auth_controller,
    groups_controller,
    expenses_controller,
    currencies_controller,
    trip_controller,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure DB & tables exist
    init_db()
    yield


app = FastAPI(title="Splitwise Manager API", lifespan=lifespan)

# Session middleware (cookie-based, mirrors Flask's session behaviour)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

# CORS – allow the React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_controller.router)
app.include_router(groups_controller.router)
app.include_router(expenses_controller.router)
app.include_router(currencies_controller.router)
app.include_router(trip_controller.router)


@app.get("/health")
def health():
    return {"status": "ok"}
