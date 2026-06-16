from datetime import datetime
from typing import List, Optional, Union

from pydantic import BaseModel, Field

from src.config.constants import (
    CALORIE_GOAL_MIN,
    CALORIE_GOAL_MAX,
    MEAL_TEXT_MAX_LENGTH,
    MEAL_TYPES,
    SEXES,
    ACTIVITY_LEVELS,
    GOAL_DIRECTIONS,
    GOAL_PACES,
    AGE_MIN,
    AGE_MAX,
    HEIGHT_CM_MIN,
    HEIGHT_CM_MAX,
    WEIGHT_KG_MIN,
    WEIGHT_KG_MAX,
)


# --- User Schemas ---
class UserProfile(BaseModel):
    id: str
    email: Optional[str] = None
    daily_calorie_goal: int
    sex: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    activity_level: Optional[str] = None
    goal_direction: Optional[str] = None
    goal_pace: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    daily_calorie_goal: int = Field(..., ge=CALORIE_GOAL_MIN, le=CALORIE_GOAL_MAX)
    sex: Optional[str] = Field(None, pattern=f"^({'|'.join(SEXES)})$")
    age: Optional[int] = Field(None, ge=AGE_MIN, le=AGE_MAX)
    height_cm: Optional[float] = Field(None, ge=HEIGHT_CM_MIN, le=HEIGHT_CM_MAX)
    weight_kg: Optional[float] = Field(None, ge=WEIGHT_KG_MIN, le=WEIGHT_KG_MAX)
    activity_level: Optional[str] = Field(None, pattern=f"^({'|'.join(ACTIVITY_LEVELS)})$")
    goal_direction: Optional[str] = Field(None, pattern=f"^({'|'.join(GOAL_DIRECTIONS)})$")
    goal_pace: Optional[str] = Field(None, pattern=f"^({'|'.join(GOAL_PACES)})$")


# --- Meal Processing Schemas ---
class MealTextRequest(BaseModel):
    meal_text: str = Field(..., min_length=1, max_length=MEAL_TEXT_MAX_LENGTH)
    meal_type: str = Field(..., pattern=f"^({'|'.join(MEAL_TYPES)})$")


class MealImageRequest(BaseModel):
    meal_type: str = Field(..., pattern=f"^({'|'.join(MEAL_TYPES)})$")
    meal_description: Optional[str] = Field(None, max_length=MEAL_TEXT_MAX_LENGTH)


class MealTotalsUpdateRequest(BaseModel):
    total_calories: float = Field(..., ge=0)
    total_protein: float = Field(..., ge=0)
    total_carbs: float = Field(..., ge=0)
    total_fats: float = Field(..., ge=0)


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
