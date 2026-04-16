import os
import requests
import logging
from typing import List, Dict, Any, Optional, Union
from dotenv import load_dotenv
from src.config.constants import (
    USDA_API_BASE_URL,
    USDA_SEARCH_PAGE_SIZE,
    USDA_DEFAULT_DATA_TYPES,
)
from src.models.nutrition_models import FoodMacros

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Nutrient IDs can vary by dataset. We use the most common ones and fallback to names.
NUTRIENT_MAP = {
    "calories": {"ids": ["1008", "208", "1062", "2047", "2048"], "names": ["Energy", "Calories"]},
    "protein": {"ids": ["1003", "203"], "names": ["Protein"]},
    "carbs": {"ids": ["1005", "205"], "names": ["Carbohydrate, by difference"]},
    "fats": {"ids": ["1004", "204"], "names": ["Total lipid (fat)"]}
}


class USDAService:
    """
    Interfaces with the USDA FoodData Central API to search and retrieve nutritional data.

    This service handles searching for food candidates, fetching detailed nutrient
    information for a specific FDC ID, and extracting the relevant macronutrients.
    """

    BASE_URL = USDA_API_BASE_URL

    def __init__(self, api_key: Optional[str] = None):
        """
        Initializes the USDAService with an optional API key.

        Args:
            api_key (str, optional): The USDA API key. If not provided, it attempts 
                to load from the 'USDA_API_KEY' environment variable.
        """
        self.api_key = api_key or os.getenv("USDA_API_KEY")
        if not self.api_key:
            logger.warning("USDA_API_KEY not found. API features will be restricted.")

    def search_food(self, query: str, page_size: int = USDA_SEARCH_PAGE_SIZE) -> List[Dict[str, Any]]:
        """
        Searches the USDA database for food items matching the query.

        Uses the POST /foods/search endpoint to support complex filters like dataType.

        Args:
            query (str): The food name or description to search for.
            page_size (int, optional): Number of results to return. Defaults to 5.

        Returns:
            List[Dict[str, Any]]: A list of candidate food objects from the API.
        """
        if not self.api_key:
            return []

        # The search endpoint works best with POST when using dataType filters
        url = f"{self.BASE_URL}/foods/search?api_key={self.api_key}"
        
        payload = {
            "query": query,
            "pageSize": page_size,
            "dataType": USDA_DEFAULT_DATA_TYPES,
        }

        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            foods = data.get("foods", [])
            print(f"DEBUG [search_food]: Found {len(foods)} candidates for '{query}'")
            return foods
        except Exception as e:
            logger.error(f"Error searching USDA API: {str(e)}")
            return []

    def get_macros_from_fdc_id(self, fdc_id: Union[str, int]) -> FoodMacros:
        """
        Fetches detailed macronutrients for a specific food item ID.

        Args:
            fdc_id (str): The unique FoodData Central ID for the item.

        Returns:
            FoodMacros: A pydantic model containing calories, protein, carbs, and fats.
        """
        if not self.api_key:
            return FoodMacros(calories=0, protein=0, carbs=0, fats=0)

        url = f"{self.BASE_URL}/food/{fdc_id}"
        params = {"api_key": self.api_key}

        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            food = response.json()
            
            nutrients = food.get("foodNutrients", [])
            print(f"DEBUG [get_macros]: Fetched {len(nutrients)} raw nutrient entries for ID {fdc_id}")
            return self._extract_macros(nutrients, fdc_id)
        except Exception as e:
            logger.error(f"Error fetching macros for {fdc_id}: {str(e)}")
            return FoodMacros(calories=0, protein=0, carbs=0, fats=0)

    def _extract_macros(self, nutrients: List[Dict[str, Any]], fdc_id: Optional[Union[str, int]] = None) -> FoodMacros:
        """
        Internal helper to map raw API nutrient lists to our structured FoodMacros model.
        
        This method is robust against variations in the USDA JSON structure between 
        different datasets (e.g., Foundation vs. SR Legacy).

        Args:
            nutrients (List[Dict[str, Any]]): The 'foodNutrients' list from the API.
            fdc_id (str, optional): The ID to associate with the returned model.

        Returns:
            FoodMacros: The mapped nutritional data.
        """
        macro_map = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fats": 0.0}
        
        for n in nutrients:
            # Extract common fields
            n_info = n.get("nutrient", n)
            n_id = str(n_info.get("id") or n_info.get("nutrientId") or n_info.get("nutrientNumber", ""))
            n_name = (n_info.get("name") or "").lower()
            val = n.get("amount") if n.get("amount") is not None else n.get("value", 0.0)

            # Debug individual nutrient if amount is > 0
            if val > 0:
                print(f"  - Nutrient ID: {n_id}, Name: {n_name}, Value: {val}")

            # Check mapping
            for key, config in NUTRIENT_MAP.items():
                # Match by ID or by substring in the name
                if n_id in config["ids"] or any(name.lower() in n_name for name in config["names"]):
                    # Don't overwrite if we already found a primary match (like Energy)
                    if macro_map[key] == 0:
                        macro_map[key] = val

        print(f"DEBUG [_extract_macros]: Final Mapped -> {macro_map}")
        return FoodMacros(
            calories=macro_map["calories"],
            protein=macro_map["protein"],
            carbs=macro_map["carbs"],
            fats=macro_map["fats"],
            fdc_id=fdc_id
        )
