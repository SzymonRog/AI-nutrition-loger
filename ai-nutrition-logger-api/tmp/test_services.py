import sys
import os
# Add src to path
sys.path.append(os.getcwd())

from src.processors.ai_text_processor import AITextProcessor
from src.services.usda_service import USDAService
from dotenv import load_dotenv

load_dotenv()

def test_extraction():
    processor = AITextProcessor()
    text = "I had 2 slices of whole wheat bread and a large apple"
    print(f"--- Testing AI Extraction for: '{text}' ---")
    items = processor.analyze_meal_text(text)
    for item in items:
        print(f"Extracted: {item.quantity} {item.unit} of {item.name} ({item.estimated_weight_g}g)")
    return items

def test_usda_search(item_name):
    service = USDAService()
    print(f"\n--- Testing USDA Search for: '{item_name}' ---")
    candidates = service.search_food(item_name)
    for c in candidates:
        print(f"Found: {c.get('description')} (ID: {c.get('fdcId')})")

if __name__ == "__main__":
    extracted_items = test_extraction()
    if extracted_items:
        test_usda_search(extracted_items[0].name)
