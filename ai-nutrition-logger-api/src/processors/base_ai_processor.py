"""Base class for AI processors with shared initialization and utilities."""

import json
import logging
import os
from typing import Optional, List, Dict, Any, Union

from google import genai

from src.config.constants import GOOGLE_AI_MODEL_ID
from src.models.nutrition_models import FoodMacros

logger = logging.getLogger(__name__)


class BaseAIProcessor:
    """
    Shared initialization and utilities for AI text and vision processors.
    """

    def __init__(self, api_key: Optional[str] = None, env_var: str = "GOOGLE_API_KEY"):
        self.api_key = api_key or os.getenv(env_var)
        if not self.api_key:
            logger.warning(f"{env_var} not found. AI features will be disabled.")
            self.client = None
        else:
            self.client = genai.Client(api_key=self.api_key)
            self.model_id = GOOGLE_AI_MODEL_ID

    @staticmethod
    def _parse_json_response(text: str) -> dict:
        """Clean markdown fences from AI response and parse JSON."""
        clean = text.strip().replace("```json", "").replace("```", "")
        return json.loads(clean)

    def estimate_nutrition_text(self, food_name: str, weight_g: float) -> FoodMacros:
        """
        Estimate nutritional values for a food item via AI (text-only variant).

        Args:
            food_name: Name of the food item.
            weight_g: Estimated weight in grams.

        Returns:
            FoodMacros with estimated values, or zeros on failure.
        """
        prompt = f"""
A user ate {weight_g}g of {food_name}.
Provide a reliable nutritional estimate for this portion.

Return ONLY a JSON object:
{{"calories": float, "protein": float, "carbs": float, "fats": float}}
"""
        return self._call_and_parse(prompt)

    def _call_and_parse(self, prompt: str) -> FoodMacros:
        """Generate content and parse macros JSON. Returns zeros on failure."""
        if not self.client:
            return FoodMacros(calories=0, protein=0, carbs=0, fats=0)

        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt,
            )
            data = self._parse_json_response(response.text)
            return FoodMacros(**data)
        except Exception as e:
            logger.error(f"Error estimating nutrition: {str(e)}")
            return FoodMacros(calories=0, protein=0, carbs=0, fats=0)

    def select_best_match(self, original_item: str, candidates: List[Dict[str, Any]]) -> Optional[Union[str, int]]:
        """
        Disambiguates between USDA API candidates to find the most relevant match.

        Args:
            original_item (str): The name of the item extracted from the user's text.
            candidates (List[Dict[str, Any]]): A list of food items returned from the USDA search.

        Returns:
            Optional[Union[str, int]]: The fdcId of the best candidate, or None.
        """
        if not candidates:
            return None

        candidates_summary = "\n".join([
            f"- ID: {c.get('fdcId')}, Name: {c.get('description')}, Ingredients: {c.get('ingredients', 'N/A')}"
            for c in candidates
        ])

        prompt = f"""
        User logged: "{original_item}"
        The USDA database returned these potential matches:
        {candidates_summary}

        Which match is the most accurate for the user's entry?
        Return ONLY the fdcId of the best match as a plain string or integer.
        If none are a reasonable match, return "NONE".
        """

        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt
            )
            result = response.text.strip()
            return result if result != "NONE" else None
        except Exception as e:
            logger.error(f"Error selecting best match: {str(e)}")
            return None

    def generate_meal_title(self, items: List[Any]) -> str:
        """
        Generates a concise, descriptive title for a meal based on its components.

        Args:
            items: List of ProcessedFoodItem objects.

        Returns:
            str: A catchy title like "Classic Beef Burger" or "Scrambled Eggs and Bacon".
        """
        if not items:
            return "Unspecified Meal"

        item_names = [item.original_item.name for item in items]
        items_str = ", ".join(item_names)

        prompt = f"""
        Generate a concise, catchy, and descriptive title (2-5 words) for a meal containing:
        {items_str}

        Examples:
        - "Avocado Toast with Poached Eggs"
        - "Classic Beef Burger"
        - "Chicken Caesar Salad"
        - "Protein-Packed Breakfast"

        Return ONLY the title string.
        """

        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt
            )
            return response.text.strip().replace('"', '')
        except Exception as e:
            logger.error(f"Error generating meal title: {str(e)}")
            return item_names[0].capitalize() if item_names else "New Meal"
