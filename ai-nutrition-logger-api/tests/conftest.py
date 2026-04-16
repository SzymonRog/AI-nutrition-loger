"""Shared test fixtures for the AI Nutrition Logger test suite."""

import gc
import importlib
import os
import tempfile
import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture(autouse=True)
def set_jwt_secret():
    """Ensure JWT_SECRET_KEY is set for all tests."""
    os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing-only"
    yield
    del os.environ["JWT_SECRET_KEY"]


@pytest.fixture
def test_db_path():
    """Provide a temporary database path for tests."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        path = f.name
    try:
        yield path
    finally:
        _safe_unlink(path)


def _safe_unlink(path):
    """Best-effort temp file cleanup for Windows file locks."""
    gc.collect()
    if os.path.exists(path):
        try:
            os.unlink(path)
        except PermissionError:
            pass


@pytest.fixture
def isolated_client():
    """Provide a test client with an isolated temporary database.

    Creates a fresh SQLite DB and patches all route-level service
    references so each test runs against a clean slate.
    """
    from fastapi.testclient import TestClient
    from src.services.db_service import DatabaseManager
    from src.services.usda_service import USDAService
    from src.processors.ai_text_processor import AITextProcessor
    from src.processors.vision_ai_processor import VisionAIProcessor
    from src.core.nutrition_workflow import NutritionLoggingWorkflow
    from src.core.image_nutrition_workflow import ImageNutritionWorkflow

    gc.collect()

    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name

    try:
        isolated_db = DatabaseManager(db_path=db_path)
        usda = USDAService(api_key="dummy")
        ai = AITextProcessor(api_key="dummy")
        vision = VisionAIProcessor(api_key="dummy")
        text_workflow = NutritionLoggingWorkflow(isolated_db, ai, usda)
        image_workflow = ImageNutritionWorkflow(isolated_db, vision, usda)

        # Build a fresh FastAPI app instance so router state is clean
        from fastapi import FastAPI
        from fastapi.middleware.cors import CORSMiddleware
        from fastapi.responses import JSONResponse
        from contextlib import asynccontextmanager

        @asynccontextmanager
        async def lifespan(app):
            yield

        app = FastAPI(
            title="AI Nutrition Logger API",
            version="1.0.0",
            docs_url="/docs",
            redoc_url="/redoc",
            lifespan=lifespan,
        )

        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        # Patch module-level services, then import routes
        with (
            patch("src.api.routes.auth.db", isolated_db),
            patch("src.api.routes.users.db", isolated_db),
            patch("src.api.routes.meals.db", isolated_db),
            patch("src.api.routes.meals.usda", usda),
            patch("src.api.routes.meals.ai_processor", ai),
            patch("src.api.routes.meals.vision_processor", vision),
            patch("src.api.routes.meals.text_workflow", text_workflow),
            patch("src.api.routes.meals.image_workflow", image_workflow),
        ):
            from src.api.routes import auth, meals, users

            @app.get("/health", tags=["Health"])
            def health_check():
                return JSONResponse(
                    content={"status": "healthy", "service": "ai-nutrition-logger"},
                    status_code=200,
                )

            app.include_router(auth.router, prefix="/api/v1")
            app.include_router(users.router, prefix="/api/v1")
            app.include_router(meals.router, prefix="/api/v1")

        client = TestClient(app)
        yield client
        client.close()

    finally:
        gc.collect()
        _safe_unlink(db_path)
