"""Tests for meals API endpoints."""

import io
import pytest

from src.api.main import app


class TestProcessMealText:
    def test_rejects_unauthenticated(self, isolated_client):
        response = isolated_client.post("/api/v1/meals/text", json={
            "meal_text": "2 eggs",
            "meal_type": "BREAKFAST",
        })
        assert response.status_code == 401

    def test_rejects_invalid_meal_type(self, isolated_client):
        self._register(isolated_client)
        response = isolated_client.post(
            "/api/v1/meals/text",
            json={"meal_text": "2 eggs", "meal_type": "BRUNCH"},
            headers=self._auth(isolated_client),
        )
        assert response.status_code == 422

    def test_rejects_empty_meal_text(self, isolated_client):
        self._register(isolated_client)
        response = isolated_client.post(
            "/api/v1/meals/text",
            json={"meal_text": "", "meal_type": "BREAKFAST"},
            headers=self._auth(isolated_client),
        )
        assert response.status_code == 422

    def _register(self, client):
        client.post("/api/v1/auth/register", json={
            "email": "mealuser@test.com",
            "password": "mealpassword1",
        })

    def _auth(self, client):
        resp = client.post("/api/v1/auth/login", json={
            "email": "mealuser@test.com",
            "password": "mealpassword1",
        })
        token = resp.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}


class TestProcessMealImage:
    def test_rejects_invalid_file_type(self, isolated_client):
        self._register(isolated_client)
        response = isolated_client.post(
            "/api/v1/meals/image",
            headers=self._auth(isolated_client),
            data={"meal_type": "LUNCH"},
            files={"file": ("bad.txt", io.BytesIO(b"not an image"), "text/plain")},
        )
        assert response.status_code == 400

    def _register(self, client):
        client.post("/api/v1/auth/register", json={
            "email": "imageuser@test.com",
            "password": "imagepassword1",
        })

    def _auth(self, client):
        resp = client.post("/api/v1/auth/login", json={
            "email": "imageuser@test.com",
            "password": "imagepassword1",
        })
        token = resp.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}


class TestGetMealsByDate:
    def test_rejects_unauthenticated(self, isolated_client):
        response = isolated_client.get("/api/v1/meals/date/2026-04-03")
        assert response.status_code == 401

    def test_rejects_invalid_date_format(self, isolated_client):
        self._register(isolated_client)
        response = isolated_client.get(
            "/api/v1/meals/date/not-a-date",
            headers=self._auth(isolated_client),
        )
        assert response.status_code == 400

    def test_returns_empty_list_for_no_meals(self, isolated_client):
        self._register(isolated_client)
        response = isolated_client.get(
            "/api/v1/meals/date/2026-04-03",
            headers=self._auth(isolated_client),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["meals"] == []
        assert data["total_count"] == 0

    def _register(self, client):
        client.post("/api/v1/auth/register", json={
            "email": "dateuser@test.com",
            "password": "datepassword1",
        })

    def _auth(self, client):
        resp = client.post("/api/v1/auth/login", json={
            "email": "dateuser@test.com",
            "password": "datepassword1",
        })
        token = resp.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}


class TestHealthEndpoint:
    def test_health_returns_200(self, isolated_client):
        response = isolated_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "ai-nutrition-logger"
