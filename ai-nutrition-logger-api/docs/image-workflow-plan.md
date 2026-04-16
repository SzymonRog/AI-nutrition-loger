# Image-Based Nutrition Logging - Implementation Plan

## Overview

Add the ability to log meals from images (photos of food) using AI vision capabilities. The user will be able to input an image path, and the system will analyze the image to identify food items, estimate portions, and log the meal.

## Current Architecture

```
main.py
    └── NutritionLoggingWorkflow (text-based)
            ├── AITextProcessor (text extraction)
            ├── USDAService (food database lookup)
            └── DatabaseManager (SQLite persistence)
```

## Proposed Architecture

```
main.py
    ├── NutritionLoggingWorkflow (text-based)
    │       ├── AITextProcessor (text extraction)
    │       ├── USDAService (food database lookup)
    │       └── DatabaseManager
    │
    └── ImageNutritionWorkflow (image-based) NEW
            ├── VisionAIProcessor (image analysis) NEW
            ├── USDAService (food database lookup)
            └── DatabaseManager
```

## Implementation Steps

### Step 1: Create VisionAIProcessor

**File:** `src/processors/vision_ai_processor.py`

This processor uses the Gemini vision model to analyze meal photos.

**Key methods:**
- `analyze_image(image_path: str) -> List[ExtractedFoodItem]` - Analyzes an image and returns food items with estimated weights
- `estimate_nutrition(item: ExtractedFoodItem) -> FoodMacros` - Fallback AI estimation for nutrition (reuses from AITextProcessor)

### Step 2: Create ImageNutritionWorkflow

**File:** `src/core/image_nutrition_workflow.py`

Orchestrates the image-based logging pipeline:

1. **Receive image path** - Get the path to the meal photo
2. **Analyze with Vision AI** - Use AI vision to identify food items and estimate portion sizes
3. **Resolve against USDA** - For each item, try to find a match in the USDA database
4. **Fallback to AI estimation** - If no USDA match, use AI to estimate nutrition values
5. **Save to database** - Persist the meal with all items (including image_path)

### Step 3: Update main.py to Support Image Input

Modify the CLI to accept either:
- Text input (current behavior): `I ate 2 eggs and toast`
- Image path input: `/path/to/meal photo.jpg`

Add a command-line option or prompt for image mode.

### Step 4: Database Integration (Already Supported)

The existing `DatabaseManager.log_meal()` already accepts an `image_path` parameter:

```python
self.db.log_meal(
    user_id=user_id,
    meal_type=meal_type,
    items=db_items,
    raw_input_text=None,
    image_path="/path/to/image.jpg"  # <-- already supported
)
```

## Data Flow

```
User provides image path
        │
        ▼
ImageNutritionWorkflow.analyze_image(image_path)
        │
        ▼
VisionAIProcessor.analyze_image()
        │  (uses Gemini vision model)
        ▼
Returns List[ExtractedFoodItem]
        │
        ▼
For each item: USDA lookup → AI fallback if needed
        │
        ▼
Create ProcessedMeal with all macros
        │
        ▼
DatabaseManager.log_meal(image_path=...)
        │
        ▼
Saved to SQLite (meals table stores image_path)
```

## New Files to Create

| File | Purpose |
|------|---------|
| `src/processors/vision_ai_processor.py` | AI vision analysis for food identification |
| `src/core/image_nutrition_workflow.py` | Orchestrator for image-based workflow |

## Modified Files

| File | Changes |
|------|---------|
| `src/main.py` | Add image path input option, route to ImageNutritionWorkflow |
| `src/processors/__init__.py` | Export new VisionAIProcessor |

## Model Reuse

The following existing models will be reused:
- `ExtractedFoodItem` - Food item with name, quantity, unit, estimated_weight_g
- `FoodMacros` - calories, protein, carbs, fats, fdc_id
- `ProcessedFoodItem` - original_item + macros + is_ai_estimated
- `ProcessedMeal` - items + totals + raw_input_text

## API Model

**Text Processing:** `gemini-3.1-flash-lite-preview`
**Vision/Image Processing:** `gemini-3.1-flash-lite-preview`

Both use the latest low-cost Flash Lite model for optimal pricing.

## Testing Strategy

1. Test with a sample meal photo
2. Verify food identification accuracy
3. Verify USDA matching works for common foods
4. Verify database saving with image_path
5. Verify fallback to AI estimation for unrecognized items