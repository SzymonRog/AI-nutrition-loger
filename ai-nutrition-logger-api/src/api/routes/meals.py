import os
import tempfile
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status, Form
from fastapi.responses import JSONResponse

from src.api import auth
from src.api.schemas import (
    ExtractedFoodItemResponse,
    FoodMacrosResponse,
    MealImageRequest,
    MealListResponse,
    MealTextRequest,
    ProcessedFoodItemResponse,
    ProcessedMealResponse,
    MealTotalsUpdateRequest,
)
from src.config.constants import ALLOWED_IMAGE_TYPES, MEAL_TYPES
from src.core.exceptions import AIServiceError
from src.core.nutrition_workflow import NutritionLoggingWorkflow
from src.core.image_nutrition_workflow import ImageNutritionWorkflow
from src.processors.ai_text_processor import AITextProcessor
from src.processors.vision_ai_processor import VisionAIProcessor
from src.services.db_service import DatabaseManager
from src.services.usda_service import USDAService

router = APIRouter(prefix="/meals", tags=["Meals"])

# Initialize services
db = DatabaseManager()
usda = USDAService()
ai_processor = AITextProcessor()
vision_processor = VisionAIProcessor()

# Initialize workflows
text_workflow = NutritionLoggingWorkflow(db, ai_processor, usda)
image_workflow = ImageNutritionWorkflow(db, vision_processor, usda)


@router.post("/text", response_model=ProcessedMealResponse)
def process_meal_text(
    request: MealTextRequest,
    current_user: dict = Depends(auth.get_current_user),
):
    """
    Process a text description of a meal and log it to the database.
    """
    try:
        result = text_workflow.process_meal_text(
            user_id=current_user["user_id"],
            meal_text=request.meal_text,
            meal_type=request.meal_type,
        )

        # Retrieve the persisted meal to get its ID
        meals = db.get_meals_by_date(
            current_user["user_id"], datetime.now().strftime("%Y-%m-%d")
        )
        meal = next(
            (m for m in reversed(meals) if m.get("raw_input_text") == request.meal_text),
            None,
        )

        if not meal:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve meal from database",
            )

        return _build_meal_response(meal, result, request.meal_type)

    except AIServiceError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process meal text: {str(e)}",
        )


@router.post("/image", response_model=ProcessedMealResponse)
async def process_meal_image(
    file: UploadFile,
    meal_type: str = Form("SNACK"),
    meal_description: Optional[str] = Form(None),
    current_user: dict = Depends(auth.get_current_user),
):
    """
    Process an image of a meal and log it to the database.
    """
    # Validate meal_type
    if meal_type not in MEAL_TYPES:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid meal type. Allowed: {', '.join(MEAL_TYPES)}",
        )

    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: JPEG, PNG, WebP",
        )

    # Persist the upload to a temp file: the vision workflow reads from a local
    # path, then we upload to Supabase Storage for durable storage.
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    object_path = f"{current_user['user_id']}/{timestamp}.{extension}"

    try:
        file_bytes = file.file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read image: {str(e)}",
        )

    fd, temp_path = tempfile.mkstemp(suffix=f".{extension}")
    try:
        with os.fdopen(fd, "wb") as buffer:
            buffer.write(file_bytes)

        result = image_workflow.process_image(
            user_id=current_user["user_id"],
            image_path=temp_path,
            meal_type=meal_type,
            description=meal_description,
        )

        # The workflow persisted the meal with the temp path; find it, upload the
        # image to durable storage, and rewrite image_path to the object path.
        meals = db.get_meals_by_date(
            current_user["user_id"], datetime.now().strftime("%Y-%m-%d")
        )
        meal = next(
            (m for m in reversed(meals) if m.get("image_path") == temp_path),
            None,
        )

        if not meal:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve meal from database",
            )

        db.upload_meal_image(file_bytes, object_path, file.content_type)
        db.update_meal_image(meal["id"], object_path)
        meal["image_path"] = object_path

        return _build_meal_response(meal, result, meal_type, object_path)

    except AIServiceError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process meal image: {str(e)}",
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.get("/date/{target_date}", response_model=MealListResponse)
def get_meals_by_date(
    target_date: str,
    current_user: dict = Depends(auth.get_current_user),
):
    """
    Get all meals for the current user on a specific date.
    """
    try:
        datetime.strptime(target_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD",
        )

    meals = db.get_meals_by_date(current_user["user_id"], target_date)

    meal_responses = [
        _build_meal_from_db(meal)
        for meal in meals
    ]

    return MealListResponse(
        meals=meal_responses,
        total_count=len(meal_responses),
        date=target_date,
    )


@router.get("/history", response_model=MealListResponse)
def get_meal_history(
    limit: int = 50,
    current_user: dict = Depends(auth.get_current_user),
):
    """
    Get recent meal history for the current user.
    """
    meals = db.get_user_history(current_user["user_id"], limit=limit)
    meal_responses = [_build_meal_from_db(meal) for meal in meals]
    
    return MealListResponse(
        meals=meal_responses,
        total_count=len(meal_responses),
        date=datetime.now().strftime("%Y-%m-%d"),
    )


@router.put("/{meal_id}/totals", response_model=ProcessedMealResponse)
def update_meal_totals(
    meal_id: str,
    request: MealTotalsUpdateRequest,
    current_user: dict = Depends(auth.get_current_user),
):
    """
    Update the total macro and calorie values for a meal manually.
    """
    meal = db.get_meal(meal_id)
    if not meal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal not found",
        )
        
    if meal["user_id"] != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this meal",
        )

    updated = db.update_meal_totals(
        meal_id=meal_id,
        user_id=current_user["user_id"],
        total_calories=request.total_calories,
        total_protein=request.total_protein,
        total_carbs=request.total_carbs,
        total_fats=request.total_fats
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update meal totals",
        )

    updated_meal = db.get_meal(meal_id)
    return _build_meal_from_db(updated_meal)


@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(
    meal_id: str,
    current_user: dict = Depends(auth.get_current_user),
):
    """
    Delete a meal and its associated image file.
    """
    meal = db.get_meal(meal_id)
    
    if not meal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal not found",
        )
        
    if meal["user_id"] != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this meal",
        )
        
    # Delete the stored image if present, then the DB record (items cascade).
    if meal.get("image_path"):
        db.delete_meal_image(meal["image_path"])

    db.delete_meal(meal_id)
    return None


# --- Response helpers ---

def _build_meal_response(
    meal: dict,
    result,
    meal_type: str,
    image_path: str = None,
) -> ProcessedMealResponse:
    """Build a ProcessedMealResponse from a workflow result and persisted meal record."""
    return ProcessedMealResponse(
        id=meal["id"],
        items=[
            ProcessedFoodItemResponse(
                original_item=ExtractedFoodItemResponse(
                    name=item.original_item.name,
                    quantity=item.original_item.quantity,
                    unit=item.original_item.unit,
                    estimated_weight_g=item.original_item.estimated_weight_g,
                    is_ai_estimated=item.is_ai_estimated,
                ),
                macros=FoodMacrosResponse(
                    calories=item.macros.calories,
                    protein=item.macros.protein,
                    carbs=item.macros.carbs,
                    fats=item.macros.fats,
                    fdc_id=item.macros.fdc_id,
                ),
                is_ai_estimated=item.is_ai_estimated,
            )
            for item in result.items
        ],
        total_calories=result.total_calories,
        total_protein=result.total_protein,
        total_carbs=result.total_carbs,
        total_fats=result.total_fats,
        raw_input_text=result.raw_input_text,
        image_path=image_path,
        meal_type=meal_type,
        logged_at=datetime.now(),
    )


def _build_meal_from_db(meal: dict) -> ProcessedMealResponse:
    """Build a ProcessedMealResponse from a raw database meal record."""
    items = db.get_meal_items(meal["id"])

    return ProcessedMealResponse(
        id=meal["id"],
        items=[
            ProcessedFoodItemResponse(
                original_item=ExtractedFoodItemResponse(
                    name=item["original_name"],
                    quantity=item["quantity"],
                    unit=item["unit"],
                    estimated_weight_g=0,
                    is_ai_estimated=item.get("api_food_id") is None,
                ),
                macros=FoodMacrosResponse(
                    calories=item["calories"],
                    protein=item["protein"],
                    carbs=item["carbs"],
                    fats=item["fats"],
                    fdc_id=item.get("api_food_id"),
                ),
                is_ai_estimated=item.get("api_food_id") is None,
            )
            for item in items
        ],
        total_calories=meal["total_calories"],
        total_protein=meal["total_protein"],
        total_carbs=meal["total_carbs"],
        total_fats=meal["total_fats"],
        raw_input_text=meal.get("raw_input_text", ""),
        image_path=meal.get("image_path"),
        meal_type=meal["meal_type"],
        logged_at=datetime.fromisoformat(meal["logged_at"]),
    )
