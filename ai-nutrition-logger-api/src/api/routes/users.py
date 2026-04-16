from fastapi import APIRouter, Depends, HTTPException, status

from src.api import auth
from src.api.schemas import UserProfile
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
    return user