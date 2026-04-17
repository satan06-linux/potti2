"""Digital Twin — learns daily routines and detects behavioral anomalies."""
import json
from datetime import datetime
from database.db import get_connection

def update_twin(user_id: int, activity: str, emotion: str, vitals: dict):
    conn = get_connection()
    row = conn.execute("SELECT * FROM digital_twin WHERE user_id=?", (user_id,)).fetchone()

    hour = datetime.now().hour
    new_entry = {"hour": hour, "activity": activity, "emotion": emotion, "vitals": vitals}

    if row:
        routine = json.loads(row["routine_data"] or "[]")
        baseline = json.loads(row["behavior_baseline"] or "{}")
        routine.append(new_entry)
        if len(routine) > 200:
            routine = routine[-200:]

        anomaly = _detect_anomaly(new_entry, baseline)
        anomaly_count = row["anomaly_count"] + (1 if anomaly else 0)

        _update_baseline(baseline, new_entry)

        conn.execute(
            """UPDATE digital_twin SET routine_data=?, behavior_baseline=?,
               anomaly_count=?, last_updated=CURRENT_TIMESTAMP WHERE user_id=?""",
            (json.dumps(routine), json.dumps(baseline), anomaly_count, user_id)
        )
    else:
        routine = [new_entry]
        baseline = {str(hour): {"activity": activity, "emotion": emotion}}
        conn.execute(
            "INSERT INTO digital_twin (user_id, routine_data, behavior_baseline) VALUES (?,?,?)",
            (user_id, json.dumps(routine), json.dumps(baseline))
        )
        anomaly = False

    conn.commit()
    conn.close()
    return anomaly

def _detect_anomaly(entry: dict, baseline: dict) -> bool:
    hour_key = str(entry["hour"])
    if hour_key not in baseline:
        return False
    expected = baseline[hour_key]
    if expected.get("activity") != entry["activity"]:
        return True
    return False

def _update_baseline(baseline: dict, entry: dict):
    hour_key = str(entry["hour"])
    baseline[hour_key] = {"activity": entry["activity"], "emotion": entry["emotion"]}

def get_twin_summary(user_id: int) -> dict:
    conn = get_connection()
    row = conn.execute("SELECT * FROM digital_twin WHERE user_id=?", (user_id,)).fetchone()
    conn.close()
    if not row:
        return {"status": "no_data", "anomaly_count": 0, "routine": []}
    return {
        "anomaly_count": row["anomaly_count"],
        "last_updated": row["last_updated"],
        "routine": json.loads(row["routine_data"] or "[]")[-10:],
        "baseline": json.loads(row["behavior_baseline"] or "{}")
    }
