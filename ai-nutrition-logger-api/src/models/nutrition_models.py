from pydantic import BaseModel, Field
from typing import List, Optional, Union

class ExtractedFoodItem(BaseModel):
    """
    Represents a food item extracted from natural language text by AI.
    
    Attributes:
        name (str): The name of the food item.
        quantity (float): Numerical quantity (e.g., 2.5).
        unit (str): Unit of measure (e.g., 'slices', 'grams').
        estimated_weight_g (float): AI-estimated weight in grams for the portion.
    """
    name: str = Field(..., description="English name of the food item")
    quantity: float = Field(..., description="Numerical quantity (e.g., 2.0)")
    unit: str = Field(..., description="Unit of measurement (e.g., 'slices', 'grams', 'pieces')")
    estimated_weight_g: float = Field(..., description="AI estimated weight in grams for this portion")

class FoodMacros(BaseModel):
    """
    Nutritional information for a food item or total meal.
    
    Attributes:
        calories (float): Total energy in kcal.
        protein (float): Total protein in grams.
        carbs (float): Total carbohydrates in grams.
        fats (float): Total lipids/fats in grams.
        fdc_id (str, optional): The FoodData Central ID if resolved from API.
    """
    calories: float = Field(..., description="Total calories")
    protein: float = Field(..., description="Protein in grams")
    carbs: float = Field(..., description="Carbohydrates in grams")
    fats: float = Field(..., description="Fats in grams")
    fdc_id: Optional[Union[str, int]] = Field(None, description="USDA FoodData Central ID if matched")

class ProcessedFoodItem(BaseModel):
    """The final enriched food item ready for database storage."""
    original_item: ExtractedFoodItem
    macros: FoodMacros
    is_ai_estimated: bool = Field(False, description="True if no API match was found and AI estimated the values")

class ProcessedMeal(BaseModel):
    """The full meal containing all processed items and combined totals."""
    items: List[ProcessedFoodItem]
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fats: float
    raw_input_text: str
    meal_title: str
