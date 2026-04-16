import logging
from typing import List, Dict, Any, Optional
from src.config.constants import DEFAULT_MEAL_TYPE
from src.processors.ai_text_processor import AITextProcessor
from src.services.usda_service import USDAService
from src.services.db_service import DatabaseManager
from src.models.nutrition_models import ProcessedMeal, ProcessedFoodItem, FoodMacros, ExtractedFoodItem
from src.core.macros_utils import scale_macros, calculate_totals, build_db_items

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NutritionLoggingWorkflow:
    """
    Orchestrator for the entire nutrition logging pipeline.

    This class coordinates:
    1. Parsing meal text using AI.
    2. Finding and resolving foods in the USDA API.
    3. Calculating final nutritional values scaled to the portion size.
    4. Saving the results to the database.

    Attributes:
        db (DatabaseManager): Persistence layer.
        ai (AITextProcessor): AI logic for extraction and estimation.
        usda (USDAService): USDA API interface.
    """

    def __init__(self, db: DatabaseManager, ai: AITextProcessor, usda: USDAService):
        """
        Initializes the workflow with required services.

        Args:
            db (DatabaseManager): The database service.
            ai (AITextProcessor): The AI processing service.
            usda (USDAService): The USDA API service.
        """
        self.db = db
        self.ai = ai
        self.usda = usda

    def process_meal_text(self, user_id: str, meal_text: str, meal_type: str = DEFAULT_MEAL_TYPE) -> ProcessedMeal:
        """
        Processes a natural language description into a database entry.

        This is the main entry point for the "Text to Database" workflow.

        Args:
            user_id (str): The UUID of the user.
            meal_text (str): The raw text (e.g., "3 eggs and avocado").
            meal_type (str, optional): The meal category. Defaults to "Unspecified".

        Returns:
            ProcessedMeal: The complete result including per-item macros and totals.
        """
        logger.info(f"Processing meal input: '{meal_text}' for user {user_id}")

        # 1. Extract individual items from text
        extracted_items = self.ai.analyze_meal_text(meal_text)

        processed_items: List[ProcessedFoodItem] = []

        # 2. Process each extracted item
        for item in extracted_items:
            processed_item = self._process_single_food_item(item)
            processed_items.append(processed_item)

        # 3. Create the final meal structure
        total_macros = calculate_totals(processed_items)
        
        # 4. Generate a catchy meal title
        meal_title = self.ai.generate_meal_title(processed_items)
        
        result = ProcessedMeal(
            items=processed_items,
            total_calories=total_macros.calories,
            total_protein=total_macros.protein,
            total_carbs=total_macros.carbs,
            total_fats=total_macros.fats,
            raw_input_text=meal_text,
            meal_title=meal_title
        )

        # 5. Persist to DB
        self._save_to_db(result, user_id, meal_type, meal_title)

        return result

    def _process_single_food_item(self, item: ExtractedFoodItem) -> ProcessedFoodItem:
        """
        Internal logic to resolve a single food item.

        Attempts USDA lookup first, then falls back to AI estimation.

        Args:
            item (ExtractedFoodItem): The structured item from Phase 1.

        Returns:
            ProcessedFoodItem: The final item with resolved/estimated macros.
        """
        logger.info(f"Resolving item: {item.name}")
        resolution_method = "USDA Resolved"

        # A. Search USDA for candidates
        candidates = self.usda.search_food(item.name)

        # B. Disambiguate using AI
        best_fdc_id = self.ai.select_best_match(item.name, candidates)

        macros_100g = None
        if best_fdc_id:
            macros_100g = self.usda.get_macros_from_fdc_id(best_fdc_id)
            # Check if we actually got nutrients (some IDs have 0 nutrients in FDC)
            if macros_100g.calories == 0:
                logger.warning(f"USDA ID {best_fdc_id} had 0 calories. Falling back to AI.")
                macros_100g = None

        # C. Fallback to AI Estimation if no ID or no nutrients
        if not macros_100g:
            logger.info(f"No API match for {item.name}. Using AI estimation.")
            final_macros = self.ai.estimate_nutrition(item)
            resolution_method = "AI Estimated"
        else:
            logger.info(f"API match found (ID: {best_fdc_id}) for {item.name}")
            # D. Scale macros (USDA returns per 100g)
            final_macros = scale_macros(macros_100g, item.estimated_weight_g)

        return ProcessedFoodItem(
            original_item=item,
            macros=final_macros,
            is_ai_estimated=(resolution_method == "AI Estimated")
        )

    def _save_to_db(self, meal: ProcessedMeal, user_id: str, meal_type: str, meal_title: str):
        """
        Converts the ProcessedMeal model to a format compatible with DatabaseManager.

        Args:
            meal (ProcessedMeal): The final meal object to save.
            user_id (str): The user ID.
            meal_type (str): The meal type.
            meal_title (str): The AI-generated title.
        """
        db_items = build_db_items(meal)

        self.db.log_meal(
            user_id=user_id,
            meal_type=meal_type,
            items=db_items,
            raw_input_text=meal.raw_input_text,
            meal_title=meal_title
        )
