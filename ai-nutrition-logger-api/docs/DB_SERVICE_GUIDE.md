# Database Service Documentation (`db_service.py`)

This document provides a detailed guide on how to use the `DatabaseManager` class to interact with the application database.

---

## Initialization

To use the service, import and instantiate the `DatabaseManager`. By default, it creates/uses a database at `data/processed/nutrition_logger.db`.

```python
from src.services.db_service import DatabaseManager

db = DatabaseManager()
```

---

## User Management

### `create_user`
Registers a new user in the system.

*   **Arguments:**
    *   `daily_calorie_goal` (Optional[int]): Target calories. Defaults to `2000`.
    *   `email` (Optional[str]): User's email address.
*   **Returns:** `str` (The generated UUID for the user).

### `get_user`
Retrieves user profile information.

*   **Arguments:**
    *   `user_id` (str): The UUID of the user.
*   **Returns:** `Optional[Dict]` containing user fields (`id`, `email`, `daily_calorie_goal`, `created_at`, `updated_at`).

---

## Meal Logging

### `log_meal`
This is the primary function for saving a meal analysis result.

*   **Arguments:**
    *   `user_id` (str): The UUID of the user.
    *   `meal_type` (str): One of `"BREAKFAST"`, `"LUNCH"`, `"DINNER"`, or `"SNACK"`.
    *   `items` (List[Dict]): A list of dictionaries representing individual food items. (See **Meal Item Format** below).
    *   `raw_input_text` (Optional[str]): The original text input from the user.
    *   `image_path` (Optional[str]): Path to the uploaded image file.
*   **Returns:** `str` (The generated UUID for the meal).

#### **Meal Item Format (Dictionary Fields)**
Each dictionary in the `items` list **must** contain:

| Field | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `original_name` | `str` | Name extracted by AI | `"Whole Wheat Bread"` |
| `quantity` | `float` | Numerical amount | `2.0` |
| `unit` | `str` | Measurement unit | `"slices"` |
| `calories` | `float` | Total calories for this quantity | `140.0` |
| `protein` | `float` | Protein in grams | `6.0` |
| `carbs` | `float` | Carbs in grams | `24.0` |
| `fats` | `float` | Fats in grams | `2.0` |
| `api_food_id` | `Optional[str]` | External API reference ID | `"fdc-12345"` |

### `get_meals_by_date`
Retrieves all meals logged on a specific calendar day.

*   **Arguments:**
    *   `user_id` (str): The UUID of the user.
    *   `target_date` (str): Date string in `"YYYY-MM-DD"` format.
*   **Returns:** `List[Dict]` of meals found for that day.

### `update_meal_totals`
Manually overrides the pre-aggregated nutritional totals for a specific meal.

*   **Arguments:**
    *   `user_id` (str): The UUID of the owner (for validation).
    *   `meal_id` (str): The UUID of the meal to update.
    *   `calories` (float): New total calories.
    *   `protein` (float): New total protein.
    *   `carbs` (float): New total carbs.
    *   `fats` (float): New total fats.
*   **Returns:** `bool` (`True` if the update was successful and the user is the owner).

---

## AI Summaries

### `add_ai_summary`
Saves a generated daily or weekly insight.

*   **Arguments:**
    *   `user_id` (str): The UUID of the user.
    *   `summary_type` (str): Must be `"DAILY"` or `"WEEKLY"`.
    *   `period_date` (str): Date string in `"YYYY-MM-DD"` format.
    *   `ai_generated_text` (str): The professional insight prose.
*   **Returns:** `str` (The generated UUID for the summary).

### `get_latest_ai_summary`
Fetches the most recent summary of a specific type.

*   **Arguments:**
    *   `user_id` (str): The UUID of the user.
    *   `summary_type` (str): `"DAILY"` or `"WEEKLY"`.
*   **Returns:** `Optional[Dict]` containing the summary data.

---

## Data Formats Quick Reference

*   **UUIDs:** Always handled as `strings`.
*   **Timestamps:** Automatically handled internally, but stored as ISO strings.
*   **Floating Point:** Use `float` for all nutritional values (calories, macros, quantities).
*   **Dates:** Always use the `"YYYY-MM-DD"` format for queries.
