import sys
import os

"""
AI Nutrition Logger - Interactive CLI Entry Point

This script starts an interactive session where the user can describe their
meal in natural language (e.g., '3 eggs and one avocado') or provide an image
path to analyze a meal photo. The system then extracts the food items, resolves
them against the USDA API, calculating nutritional totals, and logs the results
to the local SQLite database.
"""

# Add the project root to sys.path to resolve absolute imports from the 'src' package
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.services.db_service import DatabaseManager
from src.processors.ai_text_processor import AITextProcessor
from src.processors.vision_ai_processor import VisionAIProcessor
from src.services.usda_service import USDAService
from src.core.nutrition_workflow import NutritionLoggingWorkflow
from src.core.image_nutrition_workflow import ImageNutritionWorkflow
from src.config.constants import DEFAULT_DAILY_CALORIE_GOAL


def main():
    """Run a simple CLI simulation of the nutrition logger."""
    print("=== AI Nutrition Logger (Interactive CLI) ===")

    # Initialize services
    db_manager = DatabaseManager()
    ai_processor = AITextProcessor()
    vision_processor = VisionAIProcessor()
    usda_service = USDAService()

    # Initialize both workflows
    text_workflow = NutritionLoggingWorkflow(db_manager, ai_processor, usda_service)
    image_workflow = ImageNutritionWorkflow(db_manager, vision_processor, usda_service)

    # Simple User Setup (For local testing)
    user_id = db_manager.create_user(daily_calorie_goal=DEFAULT_DAILY_CALORIE_GOAL)
    print(f"User initialized (ID: {user_id[:8]}...)")

    while True:
        print("\nEnter meal input:")
        print("  - Type text (e.g., '3 eggs and toast')")
        print("  - Or enter an image file path")
        print("  - Type 'quit' to exit")
        user_input = input("\n> ")

        if user_input.lower() == 'quit':
            break

        if not user_input.strip():
            continue

        # Check if input is a valid file path (image mode)
        if os.path.isfile(user_input):
            # Image mode
            image_path = user_input
            print("Analyzing image...")
            try:
                meal = image_workflow.process_image(user_id, image_path)
                print(f"\nMeal Logged Successfully!")
                print(f"Total: {meal.total_calories:.0f} kcal | {meal.total_protein:.1f}g protein | {meal.total_carbs:.1f}g carbs | {meal.total_fats:.1f}g fats")
                for item in meal.items:
                    source = "AI Estimated" if item.is_ai_estimated else "USDA Resolved"
                    print(f" - {item.original_item.name}: {item.macros.calories:.0f} kcal | {item.macros.protein:.1f}g protein | {item.macros.carbs:.1f}g carbs | {item.macros.fats:.1f}g fats ({source})")
            except Exception as e:
                print(f"Error during image processing: {str(e)}")
        else:
            # Text mode
            meal_text = user_input
            print("Analyzing and logging...")
            try:
                meal = text_workflow.process_meal_text(user_id, meal_text)
                print(f"\nMeal Logged Successfully!")
                print(f"Total: {meal.total_calories:.0f} kcal | {meal.total_protein:.1f}g protein | {meal.total_carbs:.1f}g carbs | {meal.total_fats:.1f}g fats")
                for item in meal.items:
                    source = "AI Estimated" if item.is_ai_estimated else "USDA Resolved"
                    print(f" - {item.original_item.name}: {item.macros.calories:.0f} kcal | {item.macros.protein:.1f}g protein | {item.macros.carbs:.1f}g carbs | {item.macros.fats:.1f}g fats ({source})")
            except Exception as e:
                print(f"Error during processing: {str(e)}")


if __name__ == "__main__":
    main()
