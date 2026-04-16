"""Tests for authentication API endpoints."""

import pytest


class TestRegister:
    def test_register_success(self, isolated_client):
        isolated_client.delete("/api/v1/auth/clear")
        response = isolated_client.post("/api/v1/auth/register", json={
            "email": "newuser@test.com",
            "password": "strongpassword123",
            "daily_calorie_goal": 2200,
        })
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@test.com"
        assert data["daily_calorie_goal"] == 2200
        assert "id" in data

    def test_register_duplicate_email(self, isolated_client):
        isolated_client.post("/api/v1/auth/register", json={
            "email": "dup@test.com",
            "password": "password1234",
        })
        response = isolated_client.post("/api/v1/auth/register", json={
            "email": "dup@test.com",
            "password": "differentpass99",
        })
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_register_password_too_short(self, isolated_client):
        response = isolated_client.post("/api/v1/auth/register", json={
            "email": "short@test.com",
            "password": "abc",
        })
        assert response.status_code == 422

    def test_register_default_calorie_goal(self, isolated_client):
        response = isolated_client.post("/api/v1/auth/register", json={
            "email": "defaults@test.com",
            "password": "password1234",
        })
        assert response.status_code == 201
        assert response.json()["daily_calorie_goal"] == 2000


class TestLogin:
    def _register(self, client):
        client.post("/api/v1/auth/register", json={
            "email": "loginuser@test.com",
            "password": "mypassword123",
        })

    def test_login_success(self, isolated_client):
        self._register(isolated_client)
        response = isolated_client.post("/api/v1/auth/login", json={
            "email": "loginuser@test.com",
            "password": "mypassword123",
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, isolated_client):
        self._register(isolated_client)
        response = isolated_client.post("/api/v1/auth/login", json={
            "email": "loginuser@test.com",
            "password": "wrongpassword",
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self, isolated_client):
        response = isolated_client.post("/api/v1/auth/login", json={
            "email": "nobody@test.com",
            "password": "password",
        })
        assert response.status_code == 401


class TestJwtPersistence:
    def test_tokens_validated_across_requests(self, isolated_client):
        isolated_client.post("/api/v1/auth/register", json={
            "email": "jwtuser@test.com",
            "password": "password1234",
        })
        resp = isolated_client.post("/api/v1/auth/login", json={
            "email": "jwtuser@test.com",
            "password": "password1234",
        })
        token = resp.json()["access_token"]

        # Use token on protected users/me endpoint
        resp2 = isolated_client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp2.status_code == 200
        assert resp2.json()["email"] == "jwtuser@test.com"
