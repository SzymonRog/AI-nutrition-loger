"""Database access layer backed by Supabase (Postgres + Storage).

`DatabaseManager` keeps the same public method surface the workflows and routes
already depend on, but persists to Supabase instead of a local SQLite file. All
access uses the service-role client (`get_supabase`), which bypasses Row Level
Security — RLS policies remain in place as defense-in-depth.

User identity now lives in Supabase Auth (`auth.users`); this layer only owns the
app-specific `profiles` row plus meals, meal items, and AI summaries.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.services.supabase_client import get_supabase

MEAL_IMAGE_BUCKET = "meal-images"

# Biometric fields that are only overwritten when a value is provided, so a
# goal-only profile update preserves previously saved biometrics.
_BIOMETRIC_FIELDS = (
    "sex",
    "age",
    "height_cm",
    "weight_kg",
    "activity_level",
    "goal_direction",
    "goal_pace",
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class DatabaseManager:
    """Manages all interactions with Supabase for the AI Nutrition Logger."""

    def __init__(self):
        self.client = get_supabase()

    # --- USER PROFILES ---

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a user's profile by their auth user id."""
        res = (
            self.client.table("profiles")
            .select("*")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None

    def update_user_profile(
        self,
        user_id: str,
        daily_calorie_goal: int,
        sex: Optional[str] = None,
        age: Optional[int] = None,
        height_cm: Optional[float] = None,
        weight_kg: Optional[float] = None,
        activity_level: Optional[str] = None,
        goal_direction: Optional[str] = None,
        goal_pace: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Update a user's profile.

        Always updates ``daily_calorie_goal``. Biometric fields are only
        overwritten when a non-None value is provided, so a goal-only manual
        override preserves previously saved biometrics.
        """
        payload: Dict[str, Any] = {
            "daily_calorie_goal": daily_calorie_goal,
            "updated_at": _now_iso(),
        }
        provided = {
            "sex": sex,
            "age": age,
            "height_cm": height_cm,
            "weight_kg": weight_kg,
            "activity_level": activity_level,
            "goal_direction": goal_direction,
            "goal_pace": goal_pace,
        }
        for field in _BIOMETRIC_FIELDS:
            if provided[field] is not None:
                payload[field] = provided[field]

        res = (
            self.client.table("profiles")
            .update(payload)
            .eq("id", user_id)
            .execute()
        )
        return res.data[0] if res.data else None

    # --- MEALS ---

    def log_meal(
        self,
        user_id: str,
        meal_type: str,
        items: List[Dict[str, Any]],
        raw_input_text: Optional[str] = None,
        image_path: Optional[str] = None,
        meal_title: Optional[str] = None,
    ) -> str:
        """Log a new meal and all its food items, tallying totals first."""
        meal_id = str(uuid.uuid4())
        now = _now_iso()

        total_calories = sum(item.get("calories", 0) for item in items)
        total_protein = sum(item.get("protein", 0) for item in items)
        total_carbs = sum(item.get("carbs", 0) for item in items)
        total_fats = sum(item.get("fats", 0) for item in items)

        self.client.table("meals").insert(
            {
                "id": meal_id,
                "user_id": user_id,
                "meal_type": meal_type,
                "logged_at": now,
                "raw_input_text": raw_input_text,
                "meal_title": meal_title,
                "image_path": image_path,
                "total_calories": total_calories,
                "total_protein": total_protein,
                "total_carbs": total_carbs,
                "total_fats": total_fats,
                "created_at": now,
            }
        ).execute()

        if items:
            self.client.table("meal_items").insert(
                [
                    {
                        "meal_id": meal_id,
                        "original_name": item["original_name"],
                        "quantity": item["quantity"],
                        "unit": item["unit"],
                        "api_food_id": item.get("api_food_id"),
                        "calories": item["calories"],
                        "protein": item["protein"],
                        "carbs": item["carbs"],
                        "fats": item["fats"],
                        "created_at": now,
                    }
                    for item in items
                ]
            ).execute()

        return meal_id

    def get_meal(self, meal_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a single meal by id."""
        res = (
            self.client.table("meals")
            .select("*")
            .eq("id", meal_id)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None

    def update_meal_image(self, meal_id: str, image_path: str) -> None:
        """Set the stored image reference for a meal."""
        self.client.table("meals").update({"image_path": image_path}).eq(
            "id", meal_id
        ).execute()

    def delete_meal(self, meal_id: str) -> None:
        """Delete a meal; meal_items cascade via the foreign key."""
        self.client.table("meals").delete().eq("id", meal_id).execute()

    def update_meal_totals(
        self,
        meal_id: str,
        user_id: str,
        total_calories: float,
        total_protein: float,
        total_carbs: float,
        total_fats: float,
    ) -> bool:
        """Update macro totals for a meal the user owns. Returns True if updated."""
        res = (
            self.client.table("meals")
            .update(
                {
                    "total_calories": total_calories,
                    "total_protein": total_protein,
                    "total_carbs": total_carbs,
                    "total_fats": total_fats,
                }
            )
            .eq("id", meal_id)
            .eq("user_id", user_id)
            .execute()
        )
        return bool(res.data)

    def get_meals_by_date(
        self, user_id: str, target_date: str
    ) -> List[Dict[str, Any]]:
        """Retrieve all meals for a user on a specific date (YYYY-MM-DD), ascending."""
        start = f"{target_date}T00:00:00"
        end = f"{target_date}T23:59:59.999999"
        res = (
            self.client.table("meals")
            .select("*")
            .eq("user_id", user_id)
            .gte("logged_at", start)
            .lte("logged_at", end)
            .order("logged_at", desc=False)
            .execute()
        )
        return res.data or []

    def get_user_history(
        self, user_id: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Retrieve recent meal history for a user, newest first."""
        res = (
            self.client.table("meals")
            .select("*")
            .eq("user_id", user_id)
            .order("logged_at", desc=True)
            .limit(limit)
            .execute()
        )
        return res.data or []

    def get_meal_items(self, meal_id: str) -> List[Dict[str, Any]]:
        """Retrieve all items for a meal, in insertion order."""
        res = (
            self.client.table("meal_items")
            .select("*")
            .eq("meal_id", meal_id)
            .order("created_at", desc=False)
            .execute()
        )
        return res.data or []

    # --- AI SUMMARIES ---

    def add_ai_summary(
        self,
        user_id: str,
        summary_type: str,
        period_date: str,
        ai_generated_text: str,
    ) -> str:
        """Save a daily or weekly AI-generated textual summary."""
        summary_id = str(uuid.uuid4())
        self.client.table("ai_summaries").insert(
            {
                "id": summary_id,
                "user_id": user_id,
                "summary_type": summary_type,
                "period_date": period_date,
                "ai_generated_text": ai_generated_text,
                "created_at": _now_iso(),
            }
        ).execute()
        return summary_id

    def get_latest_ai_summary(
        self, user_id: str, summary_type: str
    ) -> Optional[Dict[str, Any]]:
        """Fetch the most recent AI summary of a type for the user."""
        res = (
            self.client.table("ai_summaries")
            .select("*")
            .eq("user_id", user_id)
            .eq("summary_type", summary_type)
            .order("period_date", desc=True)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None

    # --- STORAGE (meal images) ---

    def upload_meal_image(
        self, file_bytes: bytes, dest_path: str, content_type: str
    ) -> str:
        """Upload an image to the private meal-images bucket; return its object path."""
        self.client.storage.from_(MEAL_IMAGE_BUCKET).upload(
            dest_path,
            file_bytes,
            {"content-type": content_type, "upsert": "true"},
        )
        return dest_path

    def delete_meal_image(self, dest_path: str) -> None:
        """Best-effort removal of a stored meal image."""
        try:
            self.client.storage.from_(MEAL_IMAGE_BUCKET).remove([dest_path])
        except Exception:
            pass
