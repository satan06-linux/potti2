"""Predictive Risk Engine — analyzes vitals + emotion trends to score risk."""
import json
from database.db import get_connection

def compute_risk(user_id: int) -> dict:
    conn = get_connection()

    vitals = conn.execute(
        "SELECT * FROM health_logs WHERE user_id=? ORDER BY timestamp DESC LIMIT 10", (user_id,)
    ).fetchall()

    emotions = conn.execute(
        "SELECT emotion, sentiment_score FROM emotion_logs WHERE user_id=? ORDER BY timestamp DESC LIMIT 20",
        (user_id,)
    ).fetchall()

    conn.close()

    score = 0
    factors = []
    recommendations = []

    # Vitals analysis
    if vitals:
        avg_hr = sum(v["heart_rate"] for v in vitals if v["heart_rate"]) / max(len(vitals), 1)
        avg_spo2 = sum(v["spo2"] for v in vitals if v["spo2"]) / max(len(vitals), 1)
        avg_sleep = sum(v["sleep_hours"] for v in vitals if v["sleep_hours"]) / max(len(vitals), 1)

        if avg_hr > 100 or avg_hr < 55:
            score += 25
            factors.append(f"Abnormal heart rate avg: {avg_hr:.0f} bpm")
            recommendations.append("Consult cardiologist for heart rate irregularity")

        if avg_spo2 < 94:
            score += 30
            factors.append(f"Low SpO2 avg: {avg_spo2:.1f}%")
            recommendations.append("Check oxygen levels and breathing")

        if avg_sleep < 5:
            score += 15
            factors.append(f"Poor sleep avg: {avg_sleep:.1f} hrs")
            recommendations.append("Improve sleep hygiene and schedule")
    else:
        score += 10
        factors.append("No recent vitals data")

    # Emotion analysis
    if emotions:
        neg_count = sum(1 for e in emotions if e["sentiment_score"] < -0.3)
        neg_ratio = neg_count / len(emotions)
        sad_count = sum(1 for e in emotions if e["emotion"] in ["sad", "fearful", "angry"])

        if neg_ratio > 0.6:
            score += 20
            factors.append(f"High negative emotion ratio: {neg_ratio:.0%}")
            recommendations.append("Schedule social interaction and emotional support")

        if sad_count > len(emotions) * 0.5:
            score += 15
            factors.append("Frequent sadness/fear detected")
            recommendations.append("Consider mental health check-in")
    else:
        score += 5
        factors.append("No recent emotion data")

    # Determine level
    if score >= 60:
        level = "high"
    elif score >= 30:
        level = "medium"
    else:
        level = "low"

    if not recommendations:
        recommendations.append("Continue current healthy routine")

    # Save to DB
    conn = get_connection()
    conn.execute(
        "INSERT INTO risk_scores (user_id, risk_level, risk_score, factors, recommendations) VALUES (?,?,?,?,?)",
        (user_id, level, score, json.dumps(factors), json.dumps(recommendations))
    )
    conn.commit()
    conn.close()

    return {
        "risk_level": level,
        "risk_score": score,
        "factors": factors,
        "recommendations": recommendations
    }
