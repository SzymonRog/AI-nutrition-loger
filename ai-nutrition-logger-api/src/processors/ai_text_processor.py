import json
import logging
from typing import List, Optional, Dict, Any, Union
from src.models.nutrition_models import ExtractedFoodItem, FoodMacros
from src.processors.base_ai_processor import BaseAIProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AITextProcessor(BaseAIProcessor):
    """
    Handles all AI-driven text analysis tasks using Google's Gen AI SDK.

    This processor is responsible for:
    1. Parsing natural language meal descriptions into structured food items.
    2. Selecting the best match from a list of USDA search results (disambiguation).
    3. Estimating nutritional values when no database match is found.
    """

    def analyze_meal_text(self, text: str) -> List[ExtractedFoodItem]:
        """
        Extracts a structured list of food items from a natural language string.

        Args:
            text (str): The user's input description (e.g., "I ate 2 apples").

        Returns:
            List[ExtractedFoodItem]: A list of extracted items with names,
                quantities, units, and estimated weights.
        """
        prompt = f"""
        Analyze the following meal description and extract all individual food items.
        For each item, identify:
        - The specific name (in English).
        - The numerical quantity (float).
        - The unit of measurement (e.g., 'slices', 'grams', 'pieces', 'tbsp', 'medium').
        - An estimated total weight in grams for that portion.

        Input: "{text}"

        Return ONLY a JSON list of objects matching this structure:
        [
            {{"name": "string", "quantity": float, "unit": "string", "estimated_weight_g": float}}
        ]
        """

        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt
            )
            clean_json = response.text.strip().replace("```json", "").replace("```", "")
            print(f"DEBUG [analyze_meal_text]: Raw AI Response: {clean_json}")
            data = json.loads(clean_json)
            extracted = [ExtractedFoodItem(**item) for item in data]
            for item in extracted:
                print(f" - Extracted: {item.name} ({item.quantity} {item.unit}, {item.estimated_weight_g}g)")
            return extracted
        except Exception as e:
            logger.error(f"Error extracting food items: {str(e)}")
            return []

    def estimate_nutrition(self, item: ExtractedFoodItem) -> FoodMacros:
        """
        Fallback estimation for nutritional values using AI.

        Used when no suitable match is found in the USDA database.

        Args:
            item (ExtractedFoodItem): The item for which to estimate macros.

        Returns:
            FoodMacros: The AI-estimated nutritional data.
        """
        return self.estimate_nutrition_text(item.name, item.estimated_weight_g)
