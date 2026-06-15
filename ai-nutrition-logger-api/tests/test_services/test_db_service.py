"""Tests for database service."""

import pytest
from src.services.db_service import DatabaseManager
import os


@pytest.fixture
def db(test_db_path):
    """Provide a database instance with a temporary file."""
    return DatabaseManager(db_path=test_db_path)


class TestCreateUser:
    def test_create_user_returns_id(self, db):
        user_id = db.create_user(daily_calorie_goal=2000)
        assert isinstance(user_id, str)
        assert len(user_id) > 0

    def test_create_user_can_be_retrieved(self, db):
        user_id = db.create_user(email="test@example.com", daily_calorie_goal=2200)
        user = db.get_user(user_id)
        assert user is not None
        assert user["email"] == "test@example.com"
        assert user["daily_calorie_goal"] == 2200

    def test_create_user_with_null_email(self, db):
        user_id = db.create_user()
        user = db.get_user(user_id)
        assert user is not None
        assert user["daily_calorie_goal"] == 2000


class TestGetUser:
    def test_get_nonexistent_user_returns_none(self, db):
        result = db.get_user("nonexistent-id")
        assert result is None

    def test_get_user_by_email(self, db):
        db.create_user(email="findme@example.com", daily_calorie_goal=1800)
        user = db.get_user_by_email("findme@example.com")
        assert user is not None
        assert user["email"] == "findme@example.com"


class TestCreateUserWithPassword:
    def test_create_user_with_password_hash(self, db):
        user_id = db.create_user_with_password(
            email="secure@example.com",
            password_hash="$2b$12$fakehash",
            daily_calorie_goal=2500,
        )
        user = db.get_user(user_id)
        assert user is not None
        assert user["password_hash"] == "$2b$12$fakehash"


class TestLogMeal:
    def test_log_meal_returns_meal_id(self, db):
        user_id = db.create_user()
        items = [{
            "original_name": "egg",
            "quantity": 2.0,
            "unit": "pieces",
            "calories": 140,
            "protein": 12,
            "carbs": 1,
            "fats": 10,
        }]
        meal_id = db.log_meal(user_id, "BREAKFAST", items, raw_input_text="2 eggs")
        assert isinstance(meal_id, str)
        assert len(meal_id) > 0

    def test_log_meal_totals(self, db):
        user_id = db.create_user()
        items = [
            {"original_name": "rice", "quantity": 1.0, "unit": "cup",
             "calories": 200, "protein": 4, "carbs": 45, "fats": 0.5},
            {"original_name": "bean", "quantity": 0.5, "unit": "cup",
             "calories": 110, "protein": 7, "carbs": 20, "fats": 0.5},
        ]
        db.log_meal(user_id, "LUNCH", items)
        meals = db.get_meals_by_date(user_id, "2026-04-03")
        # The logged_at is now(), so this won't match — use today's date
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        meals = db.get_meals_by_date(user_id, today)
        assert len(meals) == 1
        assert meals[0]["total_calories"] == 310.0
        assert meals[0]["total_protein"] == 11.0


class TestGetMealItems:
    def test_get_meal_items_returns_correct_count(self, db):
        user_id = db.create_user()
        items = [
            {"original_name": "bread", "quantity": 2.0, "unit": "slices",
             "calories": 160, "protein": 6, "carbs": 30, "fats": 2},
            {"original_name": "butter", "quantity": 1.0, "unit": "tbsp",
             "calories": 100, "protein": 0, "carbs": 0, "fats": 11},
        ]
        meal_id = db.log_meal(user_id, "BREAKFAST", items)
        meal_items = db.get_meal_items(meal_id)
        assert len(meal_items) == 2
        assert meal_items[0]["original_name"] == "bread"
        assert meal_items[1]["original_name"] == "butter"

    def test_get_meal_items_empty_for_nonexistent(self, db):
        items = db.get_meal_items("nonexistent-meal-id")
        assert items == []

    def test_get_meal_items_returns_all_fields(self, db):
        user_id = db.create_user()
        items = [{
            "original_name": "steak",
            "quantity": 8.0,
            "unit": "oz",
            "api_food_id": "99999",
            "calories": 500,
            "protein": 50,
            "carbs": 0,
            "fats": 32,
        }]
        meal_id = db.log_meal(user_id, "DINNER", items)
        meal_items = db.get_meal_items(meal_id)
        assert len(meal_items) == 1
        item = meal_items[0]
        assert item["original_name"] == "steak"
        assert item["quantity"] == 8.0
        assert item["unit"] == "oz"
        assert item["api_food_id"] == "99999"
        assert item["calories"] == 500


class TestAiSummaries:
    def test_add_and_retrieve_summary(self, db):
        user_id = db.create_user()
        summary_id = db.add_ai_summary(user_id, "DAILY", "2026-04-03", "Good job today")
        assert isinstance(summary_id, str)

        summary = db.get_latest_ai_summary(user_id, "DAILY")
        assert summary is not None
        assert summary["ai_generated_text"] == "Good job today"

    def test_no_summary_returns_none(self, db):
        user_id = db.create_user()
        result = db.get_latest_ai_summary(user_id, "WEEKLY")
        assert result is None


def test_update_user_profile_persists_biometrics(test_db_path):
    from src.services.db_service import DatabaseManager

    db = DatabaseManager(db_path=test_db_path)
    user_id = db.create_user(daily_calorie_goal=2000, email="bio@example.com")

    updated = db.update_user_profile(
        user_id,
        daily_calorie_goal=2300,
        sex="MALE",
        age=30,
        height_cm=180.0,
        weight_kg=80.0,
        activity_level="MODERATE",
        goal_direction="LOSE",
        goal_pace="MODERATE",
    )

    assert updated["daily_calorie_goal"] == 2300
    assert updated["sex"] == "MALE"
    assert updated["age"] == 30
    assert updated["height_cm"] == 180.0
    assert updated["weight_kg"] == 80.0
    assert updated["activity_level"] == "MODERATE"
    assert updated["goal_direction"] == "LOSE"
    assert updated["goal_pace"] == "MODERATE"


def test_update_user_profile_preserves_biometrics_on_goal_only_update(test_db_path):
    from src.services.db_service import DatabaseManager

    db = DatabaseManager(db_path=test_db_path)
    user_id = db.create_user(daily_calorie_goal=2000, email="keep@example.com")
    db.update_user_profile(
        user_id, daily_calorie_goal=2300, sex="FEMALE", age=25,
        height_cm=165.0, weight_kg=60.0, activity_level="LIGHT",
        goal_direction="MAINTAIN", goal_pace=None,
    )

    # Manual override: only the goal changes; biometrics must survive.
    updated = db.update_user_profile(user_id, daily_calorie_goal=1900)

    assert updated["daily_calorie_goal"] == 1900
    assert updated["sex"] == "FEMALE"
    assert updated["weight_kg"] == 60.0
    assert updated["activity_level"] == "LIGHT"


def test_update_user_profile_clears_pace_when_switching_to_maintain(test_db_path):
    from src.services.db_service import DatabaseManager

    db = DatabaseManager(db_path=test_db_path)
    user_id = db.create_user(daily_calorie_goal=2000, email="maintain@example.com")
    # Start as LOSE / MODERATE
    db.update_user_profile(
        user_id, daily_calorie_goal=2000, sex="MALE", age=30,
        height_cm=180.0, weight_kg=80.0, activity_level="MODERATE",
        goal_direction="LOSE", goal_pace="MODERATE",
    )
    # Switch to MAINTAIN (full submit: goal_direction provided, pace None)
    updated = db.update_user_profile(
        user_id, daily_calorie_goal=2200, sex="MALE", age=30,
        height_cm=180.0, weight_kg=80.0, activity_level="MODERATE",
        goal_direction="MAINTAIN", goal_pace=None,
    )
    assert updated["goal_direction"] == "MAINTAIN"
    assert updated["goal_pace"] is None  # stale MODERATE must be cleared


def test_update_user_profile_goal_only_still_preserves_pace(test_db_path):
    from src.services.db_service import DatabaseManager

    db = DatabaseManager(db_path=test_db_path)
    user_id = db.create_user(daily_calorie_goal=2000, email="paceonly@example.com")
    db.update_user_profile(
        user_id, daily_calorie_goal=2000, sex="MALE", age=30,
        height_cm=180.0, weight_kg=80.0, activity_level="MODERATE",
        goal_direction="LOSE", goal_pace="AGGRESSIVE",
    )
    # Goal-only manual override: goal_direction NOT provided -> pace preserved
    updated = db.update_user_profile(user_id, daily_calorie_goal=1800)
    assert updated["goal_direction"] == "LOSE"
    assert updated["goal_pace"] == "AGGRESSIVE"
