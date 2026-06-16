"""Authentication via Supabase Auth.

The frontend signs in directly with Supabase and sends the resulting JWT as a
Bearer token. This module verifies that token against Supabase and exposes the
authenticated user to the routes. There are no passwords or JWTs minted here —
Supabase Auth owns all of that.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.services.supabase_client import get_supabase

bearer_scheme = HTTPBearer(auto_error=False)

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """Validate the Supabase access token and return the authenticated user.

    Returns a dict shaped like the rest of the app expects:
    ``{"user_id": <uuid>, "email": <str>}``.
    """
    if credentials is None or not credentials.credentials:
        raise _CREDENTIALS_EXCEPTION

    token = credentials.credentials
    try:
        response = get_supabase().auth.get_user(token)
    except Exception:
        raise _CREDENTIALS_EXCEPTION

    user = getattr(response, "user", None)
    if user is None or not getattr(user, "id", None):
        raise _CREDENTIALS_EXCEPTION

    return {"user_id": user.id, "email": user.email}
