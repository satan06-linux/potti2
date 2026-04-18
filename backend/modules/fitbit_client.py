"""
Fitbit OAuth2 integration — fetches real wearable data.
Fitbit API docs: https://dev.fitbit.com/build/reference/web-api/
"""
import os, requests
from datetime import datetime, date
from urllib.parse import urlencode
from typing import Optional
from database.db import get_connection

FITBIT_AUTH_URL   = "https://www.fitbit.com/oauth2/authorize"
FITBIT_TOKEN_URL  = "https://api.fitbit.com/oauth2/token"
FITBIT_API_BASE   = "https://api.fitbit.com/1/user/-"

CLIENT_ID     = os.getenv("FITBIT_CLIENT_ID", "23VFGJ")
CLIENT_SECRET = os.getenv("FITBIT_CLIENT_SECRET", "ac69eeb766f94c842aa7bc37be8b163c")
REDIRECT_URI  = os.getenv("FITBIT_REDIRECT_URI", "http://localhost:5000/api/fitbit/callback")

SCOPES = "heartrate activity sleep profile"


# ── OAuth helpers ─────────────────────────────────────────────────────────────

def get_auth_url(user_id: int) -> str:
    """Return the Fitbit authorization URL for the user to visit."""
    params = {
        "response_type": "code",
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
        "state": str(user_id),          # carry user_id through OAuth flow
        "expires_in": "604800",
    }
    return f"{FITBIT_AUTH_URL}?{urlencode(params)}"


def exchange_code(code: str) -> dict:
    """Exchange authorization code for access + refresh tokens."""
    resp = requests.post(
        FITBIT_TOKEN_URL,
        data={
            "client_id": CLIENT_ID,
            "grant_type": "authorization_code",
            "redirect_uri": REDIRECT_URI,
            "code": code,
        },
        auth=(CLIENT_ID, CLIENT_SECRET),
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def refresh_token(user_id: int) -> Optional[str]:
    """Refresh expired access token; returns new access token or None."""
    conn = get_connection()
    row = conn.execute(
        "SELECT fitbit_refresh_token FROM users WHERE id=?", (user_id,)
    ).fetchone()
    conn.close()
    if not row or not row["fitbit_refresh_token"]:
        return None
    try:
        resp = requests.post(
            FITBIT_TOKEN_URL,
            data={"grant_type": "refresh_token", "refresh_token": row["fitbit_refresh_token"]},
            auth=(CLIENT_ID, CLIENT_SECRET),
            timeout=10,
        )
        resp.raise_for_status()
        tokens = resp.json()
        _save_tokens(user_id, tokens["access_token"], tokens["refresh_token"])
        return tokens["access_token"]
    except Exception as e:
        print(f"[Fitbit] Token refresh failed: {e}")
        return None


def _save_tokens(user_id: int, access: str, refresh: str):
    conn = get_connection()
    conn.execute(
        "UPDATE users SET fitbit_access_token=?, fitbit_refresh_token=? WHERE id=?",
        (access, refresh, user_id),
    )
    conn.commit()
    conn.close()


def save_tokens_from_exchange(user_id: int, token_data: dict):
    _save_tokens(user_id, token_data["access_token"], token_data["refresh_token"])


def get_access_token(user_id: int) -> Optional[str]:
    conn = get_connection()
    row = conn.execute(
        "SELECT fitbit_access_token FROM users WHERE id=?", (user_id,)
    ).fetchone()
    conn.close()
    return row["fitbit_access_token"] if row else None


def is_connected(user_id: int) -> bool:
    return bool(get_access_token(user_id))


# ── Data fetchers ─────────────────────────────────────────────────────────────

def _get(user_id: int, path: str) -> Optional[dict]:
    """Authenticated GET to Fitbit API; auto-refreshes token on 401."""
    token = get_access_token(user_id)
    if not token:
        return None

    def _request(t):
        return requests.get(
            f"{FITBIT_API_BASE}{path}",
            headers={"Authorization": f"Bearer {t}"},
            timeout=10,
        )

    resp = _request(token)
    if resp.status_code == 401:
        token = refresh_token(user_id)
        if not token:
            return None
        resp = _request(token)

    if resp.ok:
        return resp.json()
    print(f"[Fitbit] API error {resp.status_code}: {resp.text[:200]}")
    return None


def fetch_heart_rate(user_id: int) -> dict:
    """Returns latest heart rate (bpm) and resting HR."""
    today = date.today().isoformat()
    data = _get(user_id, f"/activities/heart/date/{today}/1d/1min.json")
    if not data:
        return {}
    try:
        dataset = data["activities-heart-intraday"]["dataset"]
        latest_hr = dataset[-1]["value"] if dataset else None
        resting_hr = data["activities-heart"][0]["value"].get("restingHeartRate")
        return {"heart_rate": latest_hr, "resting_heart_rate": resting_hr}
    except (KeyError, IndexError):
        return {}


def fetch_activity(user_id: int) -> dict:
    """Returns steps, calories, active minutes, distance."""
    today = date.today().isoformat()
    data = _get(user_id, f"/activities/date/{today}.json")
    if not data:
        return {}
    try:
        summary = data["summary"]
        steps = summary.get("steps", 0)
        active_min = summary.get("veryActiveMinutes", 0) + summary.get("fairlyActiveMinutes", 0)
        activity_level = (
            "active" if active_min > 30
            else "resting" if steps < 500
            else "idle"
        )
        return {
            "steps": steps,
            "calories": summary.get("caloriesOut", 0),
            "active_minutes": active_min,
            "activity_level": activity_level,
        }
    except KeyError:
        return {}


def fetch_sleep(user_id: int) -> dict:
    """Returns last night's sleep hours and efficiency."""
    today = date.today().isoformat()
    data = _get(user_id, f"/sleep/date/{today}.json")
    if not data:
        return {}
    try:
        summary = data.get("summary", {})
        total_min = summary.get("totalMinutesAsleep", 0)
        efficiency = data["sleep"][0].get("efficiency", 0) if data.get("sleep") else 0
        return {
            "sleep_hours": round(total_min / 60, 1),
            "sleep_efficiency": efficiency,
        }
    except (KeyError, IndexError):
        return {}


def fetch_spo2(user_id: int) -> dict:
    """Returns SpO2 average for today (requires Fitbit Premium or compatible device)."""
    today = date.today().isoformat()
    data = _get(user_id, f"/spo2/date/{today}.json")
    if not data:
        return {}
    try:
        avg = data.get("value", {}).get("avg")
        return {"spo2": round(avg, 1)} if avg else {}
    except Exception:
        return {}


def fetch_all_vitals(user_id: int) -> Optional[dict]:
    """
    Aggregate all Fitbit data into a single vitals dict.
    Returns None if user is not connected.
    """
    if not is_connected(user_id):
        return None

    vitals = {"source": "fitbit"}
    vitals.update(fetch_heart_rate(user_id))
    vitals.update(fetch_activity(user_id))
    vitals.update(fetch_sleep(user_id))
    vitals.update(fetch_spo2(user_id))

    # Fill missing fields with None so downstream code stays consistent
    for field in ["heart_rate", "spo2", "bp_sys", "bp_dia", "temperature",
                  "steps", "sleep_hours", "activity_level"]:
        vitals.setdefault(field, None)

    return vitals
