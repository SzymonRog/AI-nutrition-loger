from datetime import datetime
from typing import List, Optional, Union

from pydantic import BaseModel, EmailStr, Field

from src.config.constants import (
    PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_LENGTH,
    DEFAULT_DAILY_CALORIE_GOAL,
    CALORIE_GOAL_MIN,
    CALORIE_GOAL_MAX,
    MEAL_TEXT_MAX_LENGTH,
    MEAL_TYPES,
)


# --- Authentication Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
    daily_calorie_goal: Optional[int] = Field(
        default=DEFAULT_DAILY_CALORIE_GOAL,
        ge=CALORIE_GOAL_MIN,
        le=CALORIE_GOAL_MAX,
    )


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None


# --- User Schemas ---
class UserProfile(BaseModel):
    id: str
    email: Optional[str] = None
    daily_calorie_goal: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Meal Processing Schemas ---
class MealTextRequest(BaseModel):
    meal_text: str = Field(..., min_length=1, max_length=MEAL_TEXT_MAX_LENGTH)
    meal_type: str = Field(..., pattern=f"^({'|'.join(MEAL_TYPES)})$")


class MealImageRequest(BaseModel):
    meal_type: str = Field(..., pattern=f"^({'|'.join(MEAL_TYPES)})$")
    meal_description: Optional[str] = Field(None, max_length=MEAL_TEXT_MAX_LENGTH)


# --- Food Item Schemas ---
class ExtractedFoodItemResponse(BaseModel):
    name: str
    quantity: float
    unit: str
    estimated_weight_g: float
    is_ai_estimated: bool


class FoodMacrosResponse(BaseModel):
    calories: float
    protein: float
    carbs: float
    fats: float
    fdc_id: Optional[Union[str, int]] = None


class ProcessedFoodItemResponse(BaseModel):
    original_item: ExtractedFoodItemResponse
    macros: FoodMacrosResponse
    is_ai_estimated: bool


# --- Meal Response Schemas ---
class ProcessedMealResponse(BaseModel):
    id: str
    items: List[ProcessedFoodItemResponse]
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fats: float
    raw_input_text: str
    meal_title: Optional[str] = None
    image_path: Optional[str] = None
    meal_type: str
    logged_at: datetime


class MealListResponse(BaseModel):
    meals: List[ProcessedMealResponse]
    total_count: int
    date: str


# --- Error Response ---
class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
