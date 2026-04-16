import json
import logging
from typing import List, Dict, Any, Optional
from src.models.nutrition_models import ExtractedFoodItem, FoodMacros
from src.processors.base_ai_processor import BaseAIProcessor

logger = logging.getLogger(__name__)


class VisionAIProcessor(BaseAIProcessor):
    """
    AI-powered vision processor for analyzing meal images.

    Uses Gemini vision models to analyze photos of food and extract
    individual food items with estimated portion sizes.
    """

    def analyze_image(self, image_path: str, description: Optional[str] = None) -> List[ExtractedFoodItem]:
        """
        Analyzes a meal image and extracts food items with portion estimates.

        Args:
            image_path (str): Path to the image file.
            description (str, optional): A user-provided description to help with identification.

        Returns:
            List[ExtractedFoodItem]: A list of identified food items with
                names, quantities, units, and estimated weights in grams.
        """
        if not self.api_key:
            logger.error("No API key available for vision processing")
            return []

        prompt = """
        Analyze this meal image and identify all individual food items visible.
        
        CRITICAL INSTRUCTIONS:
        1. COMPOSITE FOODS: Group related components into single items where it makes sense (e.g., "Beef Burger", "Chicken Sandwich", "Pepperoni Pizza"). Do NOT split a burger into "bun", "patty", and "lettuce" if they are part of a single entity.
        2. NAMING: Use specific but descriptive names that are likely to match in a food database (e.g., "Whole wheat bread" instead of just "bread").
        3. PORTIONS: For each identified item, determine:
           - The food name (in English).
           - The estimated quantity (as a float).
           - The unit of measurement (e.g., 'pieces', 'slices', 'servings', 'grams').
           - An estimated total weight in grams for that whole portion.

        Return ONLY a JSON list of objects matching this structure:
        [
            {"name": "string", "quantity": float, "unit": "string", "estimated_weight_g": float}
        ]

        If you cannot identify a specific food, estimate what it is most likely to be.
        """

        if description:
            prompt += f"\n\nUSER DESCRIPTION FOR CONTEXT: \"{description}\"\nUse this description to guide your identification and portion estimation (e.g., if the user specifies a weight or a specific ingredient that is hard to see)."

        try:
            # Upload the image
            uploaded_file = self.client.files.upload(file=image_path)

            # Generate content with image
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=[uploaded_file, prompt]
            )

            # Clean and parse response
            clean_json = response.text.strip().replace("```json", "").replace("```", "")
            print(f"DEBUG [analyze_image]: Raw AI Response: {clean_json}")
            data = json.loads(clean_json)

            extracted = [ExtractedFoodItem(**item) for item in data]
            for item in extracted:
                print(f" - Identified: {item.name} ({item.quantity} {item.unit}, ~{item.estimated_weight_g}g)")

            return extracted

        except Exception as e:
            logger.error(f"Error analyzing image: {str(e)}")
            return []

    def estimate_nutrition(self, item: ExtractedFoodItem) -> FoodMacros:
        """
        Estimates nutritional information for a food item when no USDA match is found.

        Uses AI to estimate calories, protein, carbs, and fats based on the food name
        and estimated weight.

        Args:
            item (ExtractedFoodItem): The food item with name and weight.

        Returns:
            FoodMacros: Estimated nutritional values.
        """
        return self.estimate_nutrition_text(item.name, item.estimated_weight_g)
