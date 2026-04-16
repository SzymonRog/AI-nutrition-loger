import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from src.config.constants import SECRET_KEY_ENV_VAR, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

# Configuration
SECRET_KEY = os.getenv(SECRET_KEY_ENV_VAR)
if not SECRET_KEY:
    raise RuntimeError(
        f"JWT_SECRET_KEY environment variable is not set. "
        f"Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
    )

# Password hashing (sha256_crypt avoids bcrypt initialization bugs on Python 3.13)
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash."""
    # Bcrypt has a 72-byte limit and throws ValueError if exceeded in some environments.
    # We identify the scheme and truncate for legacy bcrypt hashes.
    try:
        if pwd_context.identify(hashed_password) == "bcrypt":
            # Truncate to 72 bytes to avoid ValueError from bcrypt
            plain_password = plain_password[:72]
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        # Fallback in case of unexpected errors during verification
        return False


def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """Decode and verify JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Dependency to get current authenticated user."""
    payload = decode_token(token)
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"user_id": user_id, "email": payload.get("email")}
