from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status

from src.api import auth
from src.api.schemas import Token, UserLogin, UserProfile, UserRegister
from src.services.db_service import DatabaseManager
from src.config.constants import DEFAULT_DAILY_CALORIE_GOAL

router = APIRouter(prefix="/auth", tags=["Authentication"])
db = DatabaseManager()


@router.post("/register", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister):
    """
    Register a new user with email and password.
    """
    # Check if user already exists
    existing_user = db.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Hash password and create user
    password_hash = auth.get_password_hash(user_data.password)
    user_id = db.create_user_with_password(
        email=user_data.email,
        password_hash=password_hash,
        daily_calorie_goal=user_data.daily_calorie_goal or DEFAULT_DAILY_CALORIE_GOAL
    )

    # Get created user
    user = db.get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

    return user


@router.post("/login", response_model=Token)
def login(credentials: UserLogin):
    """
    Authenticate user and return access token.
    """
    # Find user by email
    user = db.get_user_by_email(credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not user.get("password_hash") or not auth.verify_password(
        credentials.password, user["password_hash"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token = auth.create_access_token(
        data={"sub": user["id"], "email": user["email"]},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {"access_token": access_token, "token_type": "bearer"}
