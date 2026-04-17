"""
Vitals module — fetches REAL data from Fitbit when connected.
If not connected, returns null values (no fake simulation).
BP and temperature are not provided by Fitbit — shown as null.
"""
from database.db import get_connection

THRESHOLDS = {
    "heart_rate": (50, 110),
    "spo2":       (92.0, 100.0),
    "bp_sys":     (90, 140),
    "bp_dia":     (60, 90),
    "temperature":(36.0, 37.8),
}

def simulate_vitals(user_id: int = 1) -> dict:
    """
    Returns real Fitbit vitals if connected.
    Returns a no-data dict if not connected — never invents values.
    """
    try:
        from modules.fitbit_client import fetch_all_vitals, is_connected
        if is_connected(user_id):
            data = fetch_all_vitals(user_id)
            if data:
                # BP and temperature are NOT available from Fitbit — keep as null
                data.setdefault("bp_sys", None)
                data.setdefault("bp_dia", None)
                data.setdefault("temperature", None)
                log_vitals(user_id, data)
                return data
    except Exception as e:
        print(f"[Vitals] Fitbit fetch error: {e}")

    # Not connected — return empty/null vitals, no fake numbers
    return {
        "heart_rate":    None,
        "spo2":          None,
        "bp_sys":        None,
        "bp_dia":        None,
        "temperature":   None,
        "steps":         None,
        "sleep_hours":   None,
        "activity_level": None,
        "source":        "no_device",
    }


def log_vitals(user_id: int, data: dict):
    conn = get_connection()
    conn.execute(
        """INSERT INTO health_logs
           (user_id, heart_rate, spo2, bp_sys, bp_dia, temperature, steps, sleep_hours, activity_level)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (user_id, data.get("heart_rate"), data.get("spo2"),
         data.get("bp_sys"), data.get("bp_dia"), data.get("temperature"),
         data.get("steps"), data.get("sleep_hours"), data.get("activity_level"))
    )
    conn.commit()
    conn.close()


def get_vitals_history(user_id: int, limit: int = 50) -> list:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM health_logs WHERE user_id=? ORDER BY timestamp DESC LIMIT ?",
        (user_id, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def check_anomalies(data: dict) -> list:
    alerts = []
    checks = {
        "heart_rate": data.get("heart_rate"),
        "spo2":       data.get("spo2"),
        "bp_sys":     data.get("bp_sys"),
        "bp_dia":     data.get("bp_dia"),
        "temperature":data.get("temperature"),
    }
    for key, value in checks.items():
        if value is None:
            continue
        low, high = THRESHOLDS[key]
        if value < low or value > high:
            alerts.append({
                "type": "vitals",
                "severity": "critical" if (value < low * 0.9 or value > high * 1.1) else "warning",
                "message": f"{key.replace('_',' ').title()} out of range: {value} (normal: {low}–{high})"
            })
    return alerts
