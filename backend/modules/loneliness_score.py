"""Loneliness Score Engine — based on conversation frequency, emotion trends, voice tone."""
from database.db import get_connection
from datetime import datetime, timedelta

def compute_loneliness(user_id: int) -> dict:
    conn = get_connection()
    since = (datetime.now() - timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")

    convs = conn.execute(
        "SELECT COUNT(*) as cnt FROM conversations WHERE user_id=? AND timestamp>=? AND role='user'",
        (user_id, since)
    ).fetchone()

    emotions = conn.execute(
        "SELECT emotion, sentiment_score FROM emotion_logs WHERE user_id=? AND timestamp>=?",
        (user_id, since)
    ).fetchall()
    conn.close()

    score = 50  # baseline
    reasons = []

    # Low conversation = lonely
    conv_count = convs["cnt"] if convs else 0
    if conv_count == 0:
        score += 30
        reasons.append("No conversations in last 24 hours")
    elif conv_count < 3:
        score += 15
        reasons.append("Very few conversations today")

    # Negative emotions
    if emotions:
        neg = sum(1 for e in emotions if e["sentiment_score"] < -0.2)
        ratio = neg / len(emotions)
        if ratio > 0.5:
            score += 20
            reasons.append("Predominantly negative emotions")
        sad = sum(1 for e in emotions if e["emotion"] in ["sad", "fearful"])
        if sad > len(emotions) * 0.4:
            score += 10
            reasons.append("Frequent sadness detected")

    score = min(score, 100)
    level = "high" if score >= 70 else "medium" if score >= 40 else "low"

    return {
        "loneliness_score": score,
        "level": level,
        "reasons": reasons,
        "conversation_count_24h": conv_count
    }
