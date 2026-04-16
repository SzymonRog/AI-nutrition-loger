"""Shared macro calculation helpers for nutrition workflows."""

from typing import List, Dict, Any, Tuple

from src.config.constants import USDA_NUTRIENT_PER_100G
from src.models.nutrition_models import (
    ProcessedMeal,
    ProcessedFoodItem,
    FoodMacros,
)


def scale_macros(macros: FoodMacros, weight_g: float) -> FoodMacros:
    """Scale per-100g nutritional data to the actual consumed weight."""
    factor = weight_g / USDA_NUTRIENT_PER_100G
    return FoodMacros(
        calories=round(macros.calories * factor, 1),
        protein=round(macros.protein * factor, 1),
        carbs=round(macros.carbs * factor, 1),
        fats=round(macros.fats * factor, 1),
        fdc_id=macros.fdc_id,
    )


def calculate_totals(items: List[ProcessedFoodItem]) -> FoodMacros:
    """Sum macros across all food items in a meal."""
    return FoodMacros(
        calories=sum(i.macros.calories for i in items),
        protein=sum(i.macros.protein for i in items),
        carbs=sum(i.macros.carbs for i in items),
        fats=sum(i.macros.fats for i in items),
    )


def build_db_items(meal: ProcessedMeal) -> List[Dict[str, Any]]:
    """Convert processed meal items to database-compatible dicts."""
    return [
        {
            "original_name": it.original_item.name,
            "quantity": it.original_item.quantity,
            "unit": it.original_item.unit,
            "api_food_id": it.macros.fdc_id,
            "calories": it.macros.calories,
            "protein": it.macros.protein,
            "carbs": it.macros.carbs,
            "fats": it.macros.fats,
        }
        for it in meal.items
    ]


def create_meal_result(
    processed_items: List[ProcessedFoodItem],
    raw_input_text: str,
) -> Tuple[ProcessedMeal, FoodMacros]:
    """Create a ProcessedMeal from processed items and return both meal and totals."""
    totals = calculate_totals(processed_items)
    result = ProcessedMeal(
        items=processed_items,
        total_calories=totals.calories,
        total_protein=totals.protein,
        total_carbs=totals.carbs,
        total_fats=totals.fats,
        raw_input_text=raw_input_text,
    )
    return result, totals
