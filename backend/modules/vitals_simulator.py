"""Simulates wearable vitals data for demo/testing."""
import random
from database.db import get_connection
from datetime import datetime

THRESHOLDS = {
    "heart_rate": (50, 110),
    "spo2": (92.0, 100.0),
    "bp_sys": (90, 140),
    "bp_dia": (60, 90),
    "temperature": (36.0, 37.8),
}

def simulate_vitals(user_id: int = 1) -> dict:
    data = {
        "heart_rate": random.randint(60, 100),
        "spo2": round(random.uniform(95.0, 99.5), 1),
        "bp_sys": random.randint(110, 135),
        "bp_dia": random.randint(70, 85),
        "temperature": round(random.uniform(36.2, 37.2), 1),
        "steps": random.randint(200, 800),
        "sleep_hours": round(random.uniform(5.5, 8.5), 1),
        "activity_level": random.choice(["active", "idle", "sleeping", "resting"])
    }
    log_vitals(user_id, data)
    return data

def log_vitals(user_id: int, data: dict):
    conn = get_connection()
    conn.execute(
        """INSERT INTO health_logs
           (user_id, heart_rate, spo2, bp_sys, bp_dia, temperature, steps, sleep_hours, activity_level)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (user_id, data["heart_rate"], data["spo2"], data["bp_sys"], data["bp_dia"],
         data["temperature"], data["steps"], data["sleep_hours"], data["activity_level"])
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
        "spo2": data.get("spo2"),
        "bp_sys": data.get("bp_sys"),
        "bp_dia": data.get("bp_dia"),
        "temperature": data.get("temperature"),
    }
    for key, value in checks.items():
        if value is None:
            continue
        low, high = THRESHOLDS[key]
        if value < low or value > high:
            alerts.append({
                "type": "vitals",
                "severity": "critical" if (value < low * 0.9 or value > high * 1.1) else "warning",
                "message": f"{key.replace('_',' ').title()} out of range: {value} (normal: {low}-{high})"
            })
    return alerts
