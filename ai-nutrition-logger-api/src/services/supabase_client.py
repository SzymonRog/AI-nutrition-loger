"""Shared Supabase client.

Provides a single service-role client used for all server-side database and
storage access. The service-role key bypasses Row Level Security, so this client
must never be exposed to the frontend — it is only ever used inside the API.
"""

import os
from functools import lru_cache

from supabase import Client, create_client

SUPABASE_URL_ENV_VAR = "SUPABASE_URL"
SUPABASE_SERVICE_ROLE_KEY_ENV_VAR = "SUPABASE_SERVICE_ROLE_KEY"


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Return a cached service-role Supabase client.

    Lazily created on first use (after environment variables are loaded) so the
    process can import this module without the credentials being present yet.
    """
    url = os.getenv(SUPABASE_URL_ENV_VAR)
    key = os.getenv(SUPABASE_SERVICE_ROLE_KEY_ENV_VAR)
    if not url or not key:
        raise RuntimeError(
            f"{SUPABASE_URL_ENV_VAR} and {SUPABASE_SERVICE_ROLE_KEY_ENV_VAR} "
            f"environment variables must be set."
        )
    return create_client(url, key)
