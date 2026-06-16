import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Load environment variables from .env file
load_dotenv()

from src.api.routes import meals, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    print("Starting AI Nutrition Logger API...")
    yield
    print("Shutting down AI Nutrition Logger API...")


# Normalize configured origins: trim whitespace and trailing slashes so a value
# like "https://app.vercel.app/" still matches the browser's Origin header.
_raw_origins = [o.strip().rstrip("/") for o in os.getenv("CORS_ORIGINS", "*").split(",")]
allowed_origins = [o for o in _raw_origins if o]
_allow_all_origins = "*" in allowed_origins or not allowed_origins

# Auth uses bearer tokens (not cookies), so credentials aren't needed. The CORS
# spec forbids combining "*" with credentials, so only enable credentials when
# explicit origins are configured.
_allow_credentials = not _allow_all_origins


app = FastAPI(
    title="AI Nutrition Logger API",
    description="API for logging and analyzing nutrition data using AI",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _allow_all_origins else allowed_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint."""
    return JSONResponse(
        content={"status": "healthy", "service": "ai-nutrition-logger"},
        status_code=200
    )


# Include routers
app.include_router(users.router, prefix="/api/v1")
app.include_router(meals.router, prefix="/api/v1")


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": str(type(exc).__name__)},
    )
