from fastapi import APIRouter, Depends, HTTPException, status

from src.api import auth
from src.api.schemas import UserProfile, UserProfileUpdate
from src.services.db_service import DatabaseManager

router = APIRouter(prefix="/users", tags=["Users"])
db = DatabaseManager()


@router.get("/me", response_model=UserProfile)
def get_current_user_profile(current_user: dict = Depends(auth.get_current_user)):
    """
    Get current user's profile.
    """
    user = db.get_user(current_user["user_id"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    # Email lives in Supabase Auth (auth.users), not the profiles row.
    user["email"] = current_user.get("email")
    return user


@router.put("/me", response_model=UserProfile)
def update_current_user_profile(
    profile_data: UserProfileUpdate,
    current_user: dict = Depends(auth.get_current_user)
):
    """
    Update current user's profile settings.
    """
    updated_user = db.update_user_profile(
        current_user["user_id"],
        profile_data.daily_calorie_goal,
        sex=profile_data.sex,
        age=profile_data.age,
        height_cm=profile_data.height_cm,
        weight_kg=profile_data.weight_kg,
        activity_level=profile_data.activity_level,
        goal_direction=profile_data.goal_direction,
        goal_pace=profile_data.goal_pace,
    )
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    updated_user["email"] = current_user.get("email")
    return updated_user