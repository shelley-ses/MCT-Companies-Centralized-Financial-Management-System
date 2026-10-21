"""
Thread-safe in-memory TTL cache for high-frequency database lookups
(companies, categories, aliases). Eliminates redundant Supabase network round-trips.
"""

import time
import threading
from typing import Dict, Any, Optional

_lock = threading.Lock()
_CACHE: Dict[str, Dict[str, Any]] = {}
DEFAULT_TTL_SECONDS = 300  # 5 minutes


def get_cached(key: str) -> Optional[Any]:
    with _lock:
        entry = _CACHE.get(key)
        if not entry:
            return None
        if time.time() > entry["expires_at"]:
            del _CACHE[key]
            return None
        return entry["value"]


def set_cached(key: str, value: Any, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> None:
    with _lock:
        _CACHE[key] = {
            "value": value,
            "expires_at": time.time() + ttl_seconds,
        }


def invalidate_cache(key_prefix: Optional[str] = None) -> None:
    with _lock:
        if not key_prefix:
            _CACHE.clear()
            return
        keys_to_delete = [k for k in _CACHE if k.startswith(key_prefix)]
        for k in keys_to_delete:
            del _CACHE[k]
