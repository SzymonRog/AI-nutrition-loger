"""Application-wide constants."""

# USDA API
USDA_API_BASE_URL = "https://api.nal.usda.gov/fdc/v1"
USDA_SEARCH_PAGE_SIZE = 5
USDA_DEFAULT_DATA_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)"]
USDA_NUTRIENT_PER_100G = 100.0

# Google AI
GOOGLE_AI_MODEL_ID = "gemini-3.1-flash-lite-preview"

# JWT Authentication
SECRET_KEY_ENV_VAR = "JWT_SECRET_KEY"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# Database
DB_PATH = "data/processed/nutrition_logger.db"

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
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 100
MEAL_TEXT_MAX_LENGTH = 2000

# Image Upload
IMAGE_UPLOAD_DIR = "data/raw"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

# AI Summary Types
SUMMARY_TYPE_DAILY = "DAILY"
SUMMARY_TYPE_WEEKLY = "WEEKLY"
