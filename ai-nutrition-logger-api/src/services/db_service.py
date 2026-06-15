import sqlite3
import uuid
from typing import List, Dict, Optional, Any
from datetime import datetime

from src.config.constants import DB_PATH


class DatabaseManager:
    """
    Manages all interactions with the local SQLite database for the AI Nutrition Logger.
    
    This class handles the creation and management of users, meals, individual meal items, 
    and AI-generated summaries. It ensures data persistence across sessions.

    Attributes:
        db_path (str): The file path to the SQLite database.
    """

    def __init__(self, db_path: str = DB_PATH):
        """
        Initializes the DatabaseManager and sets up the database schema.

        Args:
            db_path (str): Path where the SQLite database file should be stored.
        """
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        """
        Returns a configured database connection.
        
        Enables row factories for dictionary-like access and foreign key constraints.

        Returns:
            sqlite3.Connection: A connection object to the SQLite database.
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = 1")
        return conn

    def _init_db(self):
        """
        Initializes the database schema if it doesn't exist yet.
        
        Creates tables for:
        - users: Profile and goal information.
        - meals: High-level meal entry (totals + metadata).
        - meal_items: Individual food items linked to a meal.
        - ai_summaries: Cached AI reports.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Users Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE,
                    password_hash TEXT,
                    daily_calorie_goal INTEGER,
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL
                )
            """)

            # Meals Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS meals (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    meal_type TEXT NOT NULL,
                    logged_at TIMESTAMP NOT NULL,
                    raw_input_text TEXT,
                    meal_title TEXT,
                    image_path TEXT,
                    total_calories REAL DEFAULT 0,
                    total_protein REAL DEFAULT 0,
                    total_carbs REAL DEFAULT 0,
                    total_fats REAL DEFAULT 0,
                    created_at TIMESTAMP NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)

            # Meal Items Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS meal_items (
                    id TEXT PRIMARY KEY,
                    meal_id TEXT,
                    original_name TEXT NOT NULL,
                    quantity REAL NOT NULL,
                    unit TEXT NOT NULL,
                    api_food_id TEXT,
                    calories REAL NOT NULL,
                    protein REAL NOT NULL,
                    carbs REAL NOT NULL,
                    fats REAL NOT NULL,
                    created_at TIMESTAMP NOT NULL,
                    FOREIGN KEY(meal_id) REFERENCES meals(id) ON DELETE CASCADE
                )
            """)

            # AI Summaries Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ai_summaries (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    summary_type TEXT NOT NULL,
                    period_date DATE NOT NULL,
                    ai_generated_text TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            conn.commit()

            # Migrations - Ensure new columns exist in existing databases
            cursor.execute("PRAGMA table_info(meals)")
            columns = [col[1] for col in cursor.fetchall()]
            if 'meal_title' not in columns:
                cursor.execute("ALTER TABLE meals ADD COLUMN meal_title TEXT")
                conn.commit()

            # Migrations - Ensure biometric columns exist on users
            cursor.execute("PRAGMA table_info(users)")
            user_columns = [col[1] for col in cursor.fetchall()]
            for col_name, col_type in [
                ("sex", "TEXT"),
                ("age", "INTEGER"),
                ("height_cm", "REAL"),
                ("weight_kg", "REAL"),
                ("activity_level", "TEXT"),
                ("goal_direction", "TEXT"),
                ("goal_pace", "TEXT"),
            ]:
                if col_name not in user_columns:
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            conn.commit()

    # --- AUTHENTICATION ---

    def create_user_with_password(
        self,
        email: str,
        password_hash: str,
        daily_calorie_goal: Optional[int] = 2000
    ) -> str:
        """
        Creates a new user with password hash.

        Args:
            email (str): The user's email address.
            password_hash (str): The hashed password.
            daily_calorie_goal (int, optional): The user's target daily calories. Defaults to 2000.

        Returns:
            str: The generated UUID for the new user.
        """
        user_id = str(uuid.uuid4())
        now = datetime.now()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (id, email, password_hash, daily_calorie_goal, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (user_id, email, password_hash, daily_calorie_goal, now, now))
            conn.commit()

        return user_id

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves user data by email.

        Args:
            email (str): The email address to search for.

        Returns:
            Optional[Dict[str, Any]]: Dictionary containing user fields, or None if not found.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()
            return dict(row) if row else None

    # --- USER MANAGEMENT ---

    def create_user(self, daily_calorie_goal: Optional[int] = 2000, email: Optional[str] = None) -> str:
        """
        Creates a new user in the database.

        Args:
            daily_calorie_goal (int, optional): The user's target daily calories. Defaults to 2000.
            email (str, optional): The user's email address.

        Returns:
            str: The generated UUID for the new user.
        """
        user_id = str(uuid.uuid4())
        now = datetime.now()
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (id, email, daily_calorie_goal, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, email, daily_calorie_goal, now, now))
            conn.commit()
            
        return user_id

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves user data by UUID.

        Args:
            user_id (str): The UUID of the user to fetch.

        Returns:
            Optional[Dict[str, Any]]: Dictionary containing user fields, or None if not found.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

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
        """
        Updates the user's profile settings.

        Always updates daily_calorie_goal. Biometric fields are only overwritten
        when a non-None value is provided (COALESCE), so a goal-only manual
        override preserves previously saved biometrics.

        Args:
            user_id (str): UUID of the user.
            daily_calorie_goal (int): The new daily calorie budget.
            sex (str, optional): Biological sex used for BMR calculation.
            age (int, optional): Age in years.
            height_cm (float, optional): Height in centimeters.
            weight_kg (float, optional): Weight in kilograms.
            activity_level (str, optional): Activity level enum value.
            goal_direction (str, optional): LOSE, MAINTAIN, or GAIN.
            goal_pace (str, optional): Pace of the goal (e.g. MODERATE).

        Returns:
            Optional[Dict[str, Any]]: Processed user profile, or None if update failed.
        """
        now = datetime.now()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users
                SET daily_calorie_goal = ?,
                    sex = COALESCE(?, sex),
                    age = COALESCE(?, age),
                    height_cm = COALESCE(?, height_cm),
                    weight_kg = COALESCE(?, weight_kg),
                    activity_level = COALESCE(?, activity_level),
                    goal_direction = COALESCE(?, goal_direction),
                    goal_pace = CASE WHEN ? IS NOT NULL THEN ? ELSE COALESCE(?, goal_pace) END,
                    updated_at = ?
                WHERE id = ?
            """, (
                daily_calorie_goal, sex, age, height_cm, weight_kg,
                activity_level, goal_direction, goal_direction, goal_pace, goal_pace, now, user_id,
            ))
            conn.commit()

            if cursor.rowcount == 0:
                return None

        return self.get_user(user_id)

    # --- MEAL LOGGING ---

    def log_meal(self, user_id: str, meal_type: str, items: List[Dict[str, Any]], 
                 raw_input_text: Optional[str] = None, image_path: Optional[str] = None,
                 meal_title: Optional[str] = None) -> str:
        """
        Logs a completely new meal with all its associated food items.
        
        Automatically tallies up the total macros from the provided items before saving 
        the meal header.

        Args:
            user_id (str): The UUID of the user logging the meal.
            meal_type (str): The category (e.g., Breakfast, Lunch, Dinner).
            items (List[Dict[str, Any]]): List of food items. Each must contain:
                'original_name', 'quantity', 'unit', 'calories', 'protein', 'carbs', 'fats'.
            raw_input_text (str, optional): The natural language string describing the meal.
            image_path (str, optional): Path to the uploaded meal photo.

        Returns:
            str: The UUID of the created meal.
        """
        meal_id = str(uuid.uuid4())
        now = datetime.now()
        
        # Pre-calculate totals
        total_calories = sum(item.get('calories', 0) for item in items)
        total_protein = sum(item.get('protein', 0) for item in items)
        total_carbs = sum(item.get('carbs', 0) for item in items)
        total_fats = sum(item.get('fats', 0) for item in items)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Insert Meal Header
            cursor.execute("""
                INSERT INTO meals 
                (id, user_id, meal_type, logged_at, raw_input_text, meal_title, image_path, 
                 total_calories, total_protein, total_carbs, total_fats, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (meal_id, user_id, meal_type, now, raw_input_text, meal_title, image_path,
                  total_calories, total_protein, total_carbs, total_fats, now))

            # 2. Insert Multiple Meal Items
            for item in items:
                item_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO meal_items 
                    (id, meal_id, original_name, quantity, unit, api_food_id, 
                     calories, protein, carbs, fats, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (item_id, meal_id, item['original_name'], item['quantity'], 
                      item['unit'], item.get('api_food_id'), item['calories'], 
                      item['protein'], item['carbs'], item['fats'], now))
                      
            conn.commit()
            
        return meal_id

    def get_meal(self, meal_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a single meal by its UUID.

        Args:
            meal_id (str): UUID of the meal.

        Returns:
            Optional[Dict[str, Any]]: The meal record or None.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM meals WHERE id = ?", (meal_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def delete_meal(self, meal_id: str):
        """
        Deletes a meal and all its associated items.

        Args:
            meal_id (str): UUID of the meal to delete.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Note: PRAGMA foreign_keys = 1 is enabled in _get_connection,
            # so this will cascade-delete meal_items.
            cursor.execute("DELETE FROM meals WHERE id = ?", (meal_id,))
            conn.commit()

    def update_meal_totals(self, meal_id: str, user_id: str, total_calories: float, total_protein: float, total_carbs: float, total_fats: float) -> bool:
        """
        Updates the macro totals for a given meal, ensuring the user owns the meal.

        Args:
            meal_id (str): UUID of the meal to update.
            user_id (str): UUID of the user who owns the meal.
            total_calories (float): New total calories.
            total_protein (float): New total protein.
            total_carbs (float): New total carbs.
            total_fats (float): New total fats.
            
        Returns:
            bool: True if a row was updated, False otherwise (e.g. not found or wrong user).
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE meals 
                SET total_calories = ?, total_protein = ?, total_carbs = ?, total_fats = ?
                WHERE id = ? AND user_id = ?
            """, (total_calories, total_protein, total_carbs, total_fats, meal_id, user_id))
            conn.commit()
            return cursor.rowcount > 0

    def get_meals_by_date(self, user_id: str, target_date: str) -> List[Dict[str, Any]]:
        """
        Retrieves all meals for a user on a specific date.

        Args:
            user_id (str): UUID of the user.
            target_date (str): Date in 'YYYY-MM-DD' format.

        Returns:
            List[Dict[str, Any]]: List of meals, ordered by time.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM meals 
                WHERE user_id = ? AND date(logged_at) = ?
                ORDER BY logged_at ASC
            """, (user_id, target_date))
            
            return [dict(row) for row in cursor.fetchall()]

    def get_user_history(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Retrieves recent meal history for a user, ordered by date descending.

        Args:
            user_id (str): UUID of the user.
            limit (int): Max number of meals to return.

        Returns:
            List[Dict[str, Any]]: List of meals.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM meals 
                WHERE user_id = ?
                ORDER BY logged_at DESC
                LIMIT ?
            """, (user_id, limit))
            
            return [dict(row) for row in cursor.fetchall()]

    def get_meal_items(self, meal_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves all items for a specific meal.

        Args:
            meal_id (str): UUID of the meal.

        Returns:
            List[Dict[str, Any]]: List of meal item records.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM meal_items WHERE meal_id = ? ORDER BY rowid ASC",
                (meal_id,),
            )
            return [dict(row) for row in cursor.fetchall()]

    # --- AI SUMMARIES ---

    def add_ai_summary(self, user_id: str, summary_type: str, period_date: str, ai_generated_text: str) -> str:
        """
        Saves a daily or weekly AI-generated textual summary.

        Args:
            user_id (str): UUID of the user.
            summary_type (str): "DAILY" or "WEEKLY".
            period_date (str): Date formatting "YYYY-MM-DD".
            ai_generated_text (str): The content of the AI report.

        Returns:
            str: UUID of the summary entry.
        """
        summary_id = str(uuid.uuid4())
        now = datetime.now()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO ai_summaries (id, user_id, summary_type, period_date, ai_generated_text, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (summary_id, user_id, summary_type, period_date, ai_generated_text, now))
            conn.commit()
            
        return summary_id

    def get_latest_ai_summary(self, user_id: str, summary_type: str) -> Optional[Dict[str, Any]]:
        """
        Fetches the most recent AI summary of a specific type for the user.

        Args:
            user_id (str): UUID of the user.
            summary_type (str): "DAILY" or "WEEKLY".

        Returns:
            Optional[Dict[str, Any]]: The latest summary object, or None if not found.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM ai_summaries 
                WHERE user_id = ? AND summary_type = ?
                ORDER BY period_date DESC, created_at DESC 
                LIMIT 1
            """, (user_id, summary_type))
            
            row = cursor.fetchone()
            return dict(row) if row else None

    # --- DATABASE MAINTENANCE ---

    def clear_all_data(self):
        """
        Deletes all rows from all tables in the database and reclaims space.
        
        USE WITH EXTREME CAUTION: This operation deletes all users, meals, 
        items, and summaries. It cannot be undone.
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Disable foreign keys temporarily to ensure no-fuss cleanup
            cursor.execute("PRAGMA foreign_keys = 0")
            
            tables = ["meal_items", "meals", "ai_summaries", "users"]
            for table in tables:
                cursor.execute(f"DELETE FROM {table}")
            
            cursor.execute("PRAGMA foreign_keys = 1")
            conn.commit()
            
            # Reclaim space and defragment the DB file
            conn.execute("VACUUM")
