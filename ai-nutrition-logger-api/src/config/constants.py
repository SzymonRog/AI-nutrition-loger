"""Application-wide constants."""

# USDA API
USDA_API_BASE_URL = "https://api.nal.usda.gov/fdc/v1"
USDA_SEARCH_PAGE_SIZE = 5
USDA_DEFAULT_DATA_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)"]
USDA_NUTRIENT_PER_100G = 100.0

# Google AI
GOOGLE_AI_MODEL_ID = "gemini-3.1-flash-lite-preview"

# Authentication is handled by Supabase Auth (see src/api/auth.py).

# User Defaults
DEFAULT_DAILY_CALORIE_GOAL = 2000
CALORIE_GOAL_MIN = 500
CALORIE_GOAL_MAX = 10000

# Meal item resolution
MEAL_MEAL_ITEM_FALLBACK_ESTIMATED_WEIGHT = 0

# Meal Types
MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK", "OTHER"]
DEFAULT_MEAL_TYPE = "SNACK"

# Input Validation
PASSWORD_MIN_LENGTH = 4
PASSWORD_MAX_LENGTH = 100
MEAL_TEXT_MAX_LENGTH = 2000

# Image Upload
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

# AI Summary Types
SUMMARY_TYPE_DAILY = "DAILY"
SUMMARY_TYPE_WEEKLY = "WEEKLY"

# Calorie Calculator — biometric enums (validation source of truth)
SEXES = ["MALE", "FEMALE"]
ACTIVITY_LEVELS = ["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"]
GOAL_DIRECTIONS = ["LOSE", "MAINTAIN", "GAIN"]
GOAL_PACES = ["MILD", "MODERATE", "AGGRESSIVE"]

# Calorie Calculator — biometric field bounds
AGE_MIN, AGE_MAX = 13, 120
HEIGHT_CM_MIN, HEIGHT_CM_MAX = 50, 250
WEIGHT_KG_MIN, WEIGHT_KG_MAX = 20, 400
