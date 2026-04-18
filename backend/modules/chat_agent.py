"""Context-aware conversational AI with memory and sentiment tracking."""
import os, json
from database.db import get_connection
from modules.emotion_detector import analyze_sentiment
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = (
    "You are a warm, patient AI companion for an elderly person. "
    "Speak simply and clearly. Offer reminders, emotional support, and health tips. "
    "Never be dismissive. If the user seems distressed, acknowledge their feelings first. "
    "Keep responses to 2-3 sentences unless asked for more. "
    "You remember previous conversations and refer to them naturally."
)

def get_history(user_id: int, limit: int = 10) -> list:
    conn = get_connection()
    rows = conn.execute(
        "SELECT role, message FROM conversations WHERE user_id=? ORDER BY timestamp DESC LIMIT ?",
        (user_id, limit)
    ).fetchall()
    conn.close()
    return [{"role": r["role"], "content": r["message"]} for r in reversed(rows)]

def save_message(user_id: int, role: str, message: str, sentiment: float = 0.0):
    conn = get_connection()
    conn.execute(
        "INSERT INTO conversations (user_id, role, message, sentiment) VALUES (?,?,?,?)",
        (user_id, role, message, sentiment)
    )
    conn.commit()
    conn.close()

def chat(user_id: int, user_message: str, language: str = "en") -> dict:
    sentiment = analyze_sentiment(user_message)
    save_message(user_id, "user", user_message, sentiment)

    history = get_history(user_id, limit=8)

    # Try Groq LLM
    try:
        from groq import Groq
        client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
        messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history + \
                   [{"role": "user", "content": user_message}]
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=200,
            temperature=0.8
        )
        reply = resp.choices[0].message.content.strip()
    except Exception:
        reply = _fallback_reply(user_message, sentiment)

    save_message(user_id, "assistant", reply)
    return {"reply": reply, "sentiment": sentiment, "language": language}

def _fallback_reply(text: str, sentiment: float) -> str:
    if sentiment < -0.5:
        return "I hear you, and I'm here for you. Would you like to talk more about how you're feeling?"
    if "medication" in text.lower() or "medicine" in text.lower():
        return "It's important to take your medications on time. Would you like me to set a reminder?"
    if "pain" in text.lower() or "hurt" in text.lower():
        return "I'm sorry you're in pain. Please let your caregiver know, and I'll alert them for you."
    return "I'm here with you. How can I help you today?"
