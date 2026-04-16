"""Tests for application-wide constants."""

from src.config.constants import (
    USDA_API_BASE_URL,
    USDA_SEARCH_PAGE_SIZE,
    USDA_NUTRIENT_PER_100G,
    GOOGLE_AI_MODEL_ID,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    DB_PATH,
    DEFAULT_DAILY_CALORIE_GOAL,
    CALORIE_GOAL_MIN,
    CALORIE_GOAL_MAX,
    MEAL_TYPES,
    PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_LENGTH,
    MEAL_TEXT_MAX_LENGTH,
    IMAGE_UPLOAD_DIR,
    ALLOWED_IMAGE_TYPES,
    DEFAULT_MEAL_TYPE,
)


class TestUSDAConstants:
    def test_base_url_is_string(self):
        assert isinstance(USDA_API_BASE_URL, str)
        assert USDA_API_BASE_URL.startswith("https://")

    def test_search_page_size_is_positive_int(self):
        assert isinstance(USDA_SEARCH_PAGE_SIZE, int)
        assert USDA_SEARCH_PAGE_SIZE > 0

    def test_nutrient_per_100g_is_positive_float(self):
        assert isinstance(USDA_NUTRIENT_PER_100G, float)
        assert USDA_NUTRIENT_PER_100G == 100.0


class TestAIConstants:
    def test_model_id_is_string(self):
        assert isinstance(GOOGLE_AI_MODEL_ID, str)
        assert "gemini" in GOOGLE_AI_MODEL_ID.lower()


class TestAuthConstants:
    def test_algorithm_is_hs256(self):
        assert ALGORITHM == "HS256"

    def test_token_expiry_is_positive(self):
        assert isinstance(ACCESS_TOKEN_EXPIRE_MINUTES, int)
        assert ACCESS_TOKEN_EXPIRE_MINUTES == 1440  # 24 hours


class TestUserConstants:
    def test_default_calorie_goal(self):
        assert isinstance(DEFAULT_DAILY_CALORIE_GOAL, int)
        assert DEFAULT_DAILY_CALORIE_GOAL == 2000

    def test_calorie_goal_range_valid(self):
        assert CALORIE_GOAL_MIN <= DEFAULT_DAILY_CALORIE_GOAL <= CALORIE_GOAL_MAX

    def test_min_less_than_max(self):
        assert CALORIE_GOAL_MIN < CALORIE_GOAL_MAX


class TestMealConstants:
    def test_meal_types_is_list(self):
        assert isinstance(MEAL_TYPES, list)
        assert len(MEAL_TYPES) == 4

    def test_meal_types_contains_expected_values(self):
        required = {"BREAKFAST", "LUNCH", "DINNER", "SNACK"}
        assert set(MEAL_TYPES) == required

    def test_default_meal_type(self):
        assert isinstance(DEFAULT_MEAL_TYPE, str)


class TestValidationConstants:
    def test_password_lengths(self):
        assert isinstance(PASSWORD_MIN_LENGTH, int)
        assert isinstance(PASSWORD_MAX_LENGTH, int)
        assert PASSWORD_MIN_LENGTH <= PASSWORD_MAX_LENGTH
        assert PASSWORD_MIN_LENGTH >= 4

    def test_meal_text_max_length(self):
        assert isinstance(MEAL_TEXT_MAX_LENGTH, int)
        assert MEAL_TEXT_MAX_LENGTH > 0


class TestImageConstants:
    def test_upload_dir_is_string(self):
        assert isinstance(IMAGE_UPLOAD_DIR, str)

    def test_allowed_types_is_non_empty_set(self):
        assert isinstance(ALLOWED_IMAGE_TYPES, set)
        assert len(ALLOWED_IMAGE_TYPES) >= 3
        assert "image/jpeg" in ALLOWED_IMAGE_TYPES
        assert "image/png" in ALLOWED_IMAGE_TYPES
