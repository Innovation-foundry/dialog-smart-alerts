"""Admin session auth — single shared admin account, cookie-based sessions.

Credentials come only from ADMIN_USERNAME / ADMIN_PASSWORD (no defaults in
code); sessions are an in-memory token -> expiry map, so they reset on
restart. That's fine here: this gates the admin API, not a multi-user system.
"""
import os
import secrets
import time

SESSION_COOKIE = "sa_session"
SESSION_TTL_S = 7 * 24 * 60 * 60  # 7 days

_sessions: dict[str, float] = {}

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "").strip()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "").strip()


def credentials_configured() -> bool:
    return bool(ADMIN_USERNAME and ADMIN_PASSWORD)


def check_credentials(username: str, password: str) -> bool:
    if not credentials_configured():
        return False
    user_ok = secrets.compare_digest(username.strip(), ADMIN_USERNAME)
    pass_ok = secrets.compare_digest(password, ADMIN_PASSWORD)
    return user_ok and pass_ok


def create_session() -> str:
    token = secrets.token_urlsafe(32)
    _sessions[token] = time.time() + SESSION_TTL_S
    return token


def is_valid(token: str | None) -> bool:
    if not token:
        return False
    expiry = _sessions.get(token)
    if expiry is None:
        return False
    if expiry < time.time():
        _sessions.pop(token, None)
        return False
    return True


def destroy_session(token: str | None) -> None:
    if token:
        _sessions.pop(token, None)
