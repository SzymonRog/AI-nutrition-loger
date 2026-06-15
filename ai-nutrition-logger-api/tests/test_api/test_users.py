"""Tests for the /users endpoints, including biometric profile updates."""


def _register_and_login(client, email="profile@example.com", password="password123"):
    client.post("/api/v1/auth/register", json={"email": email, "password": password})
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_update_profile_with_biometrics_roundtrips(isolated_client):
    headers = _register_and_login(isolated_client)
    payload = {
        "daily_calorie_goal": 2300,
        "sex": "MALE",
        "age": 30,
        "height_cm": 180.0,
        "weight_kg": 80.0,
        "activity_level": "MODERATE",
        "goal_direction": "LOSE",
        "goal_pace": "MODERATE",
    }
    resp = isolated_client.put("/api/v1/users/me", json=payload, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["daily_calorie_goal"] == 2300
    assert body["sex"] == "MALE"
    assert body["activity_level"] == "MODERATE"
    assert body["goal_pace"] == "MODERATE"

    me = isolated_client.get("/api/v1/users/me", headers=headers)
    assert me.json()["weight_kg"] == 80.0


def test_update_profile_rejects_bad_enum(isolated_client):
    headers = _register_and_login(isolated_client, email="bad@example.com")
    resp = isolated_client.put(
        "/api/v1/users/me",
        json={"daily_calorie_goal": 2000, "activity_level": "EXTREME"},
        headers=headers,
    )
    assert resp.status_code == 422


def test_update_profile_rejects_out_of_range_age(isolated_client):
    headers = _register_and_login(isolated_client, email="age@example.com")
    resp = isolated_client.put(
        "/api/v1/users/me",
        json={"daily_calorie_goal": 2000, "age": 5},
        headers=headers,
    )
    assert resp.status_code == 422


def test_update_profile_goal_only_still_works(isolated_client):
    headers = _register_and_login(isolated_client, email="goalonly@example.com")
    resp = isolated_client.put(
        "/api/v1/users/me",
        json={"daily_calorie_goal": 2500},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["daily_calorie_goal"] == 2500
