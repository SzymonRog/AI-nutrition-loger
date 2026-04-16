---
description: How to process raw meal text into structured nutritional data and log to DB
---

This workflow describes the step-by-step logic for the AI Nutrition Logger to transform user text into a database record.

1. **Text Extraction & Analysis** (`AITextProcessor`)
   - Receive `raw_input_text` from the user.
   - Use Gemini 3.1 Flash to parse the text.
   - Extract a list of objects containing: `name`, `quantity`, `unit`, and `estimated_weight_g`.
   - Ensure `name` is translated to English for API compatibility.

2. **Nutritional Lookup** (`USDAService`)
   - For each extracted item:
     - Search USDA FoodData Central for the best matching `fdc_id`.
     - Fetch detailed macro data (calories, protein, carbs, fats).
     - Scale the macros based on the `estimated_weight_g` (normalized to per 1g or per 100g).

3. **Database Persistence** (`DatabaseManager`)
   - Aggregate total macros for the meal.
   - Call `log_meal(user_id, meal_type, items, raw_input_text)`:
     - Insert a record into the `meals` table.
     - Insert individual records into the `meal_items` table (linking to the meal).

4. **Response Generation**
   - Return a structured JSON response to the UI containing the processed meal summary and a list of specific items with their calculated macros.