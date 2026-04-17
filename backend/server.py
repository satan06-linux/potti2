"""
Agentic ElderCare AI Companion — Flask Backend
Run: python server.py
"""
import os, sys, json, random
from datetime import datetime, timedelta
from functools import wraps

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import jwt
from dotenv import load_dotenv

from database.db import init_db, get_connection, hash_pw
from modules.vitals_simulator import simulate_vitals, get_vitals_history, check_anomalies
from modules.emotion_detector import detect_emotion_from_b64, analyze_sentiment
from modules.risk_engine import compute_risk
from modules.chat_agent import chat, get_history
from modules.alert_manager import trigger_alert, get_alerts, resolve_alert
from modules.digital_twin import update_twin, get_twin_summary
from modules.loneliness_score import compute_loneliness

load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "eldercare-secret-2024")
CORS(app, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# ── JWT helpers ───────────────────────────────────────────────────────────────
def make_token(user_id: int) -> str:
    payload = {"user_id": user_id, "exp": datetime.utcnow() + timedelta(days=7)}
    return jwt.encode(payload, app.config["SECRET_KEY"], algorithm="HS256")

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Missing token"}), 401
        try:
            data = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
            g.user_id = data["user_id"]
        except Exception:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated

# ── Auth ──────────────────────────────────────────────────────────────────────
@app.route("/api/auth/register", methods=["POST"])
def register():
    d = request.json
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO users (username, password, full_name, age, gender, language) VALUES (?,?,?,?,?,?)",
            (d["username"], hash_pw(d["password"]), d.get("full_name",""), d.get("age", 70),
             d.get("gender","male"), d.get("language","en"))
        )
        conn.commit()
        user = conn.execute("SELECT id FROM users WHERE username=?", (d["username"],)).fetchone()
        return jsonify({"token": make_token(user["id"]), "user_id": user["id"]}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        conn.close()

@app.route("/api/auth/login", methods=["POST"])
def login():
    d = request.json
    conn = get_connection()
    user = conn.execute(
        "SELECT * FROM users WHERE username=? AND password=?",
        (d["username"], hash_pw(d["password"]))
    ).fetchone()
    conn.close()
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    return jsonify({"token": make_token(user["id"]), "user_id": user["id"],
                    "full_name": user["full_name"], "language": user["language"]})

# ── User Profile ──────────────────────────────────────────────────────────────
@app.route("/api/profile", methods=["GET"])
@require_auth
def get_profile():
    conn = get_connection()
    user = conn.execute("SELECT * FROM users WHERE id=?", (g.user_id,)).fetchone()
    conn.close()
    if not user:
        return jsonify({"error": "Not found"}), 404
    u = dict(user)
    u.pop("password", None)
    return jsonify(u)

@app.route("/api/profile", methods=["PUT"])
@require_auth
def update_profile():
    d = request.json
    conn = get_connection()
    conn.execute(
        "UPDATE users SET full_name=?, age=?, language=?, medical_history=?, preferences=? WHERE id=?",
        (d.get("full_name"), d.get("age"), d.get("language","en"),
         d.get("medical_history"), json.dumps(d.get("preferences",{})), g.user_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "updated"})

# ── Vitals ────────────────────────────────────────────────────────────────────
@app.route("/api/vitals/current", methods=["GET"])
@require_auth
def current_vitals():
    data = simulate_vitals(g.user_id)
    anomalies = check_anomalies(data)
    for a in anomalies:
        trigger_alert(g.user_id, a["type"], a["severity"], a["message"])
        socketio.emit("alert", a)
    socketio.emit("vitals_update", data)
    return jsonify(data)

@app.route("/api/vitals/history", methods=["GET"])
@require_auth
def vitals_history():
    limit = int(request.args.get("limit", 50))
    return jsonify(get_vitals_history(g.user_id, limit))

# ── Emotion ───────────────────────────────────────────────────────────────────
@app.route("/api/analyze-face", methods=["POST"])
@require_auth
def analyze_face():
    d = request.json
    image_b64 = d.get("image", "")
    emotion, confidence = detect_emotion_from_b64(image_b64)
    sentiment = -0.5 if emotion in ["sad","angry","fearful"] else 0.5 if emotion == "happy" else 0.0
    conn = get_connection()
    conn.execute(
        "INSERT INTO emotion_logs (user_id, emotion, confidence, sentiment_score, source) VALUES (?,?,?,?,?)",
        (g.user_id, emotion, confidence, sentiment, "camera")
    )
    conn.commit()
    conn.close()
    socketio.emit("emotion_update", {"emotion": emotion, "confidence": confidence})
    return jsonify({"emotion": emotion, "confidence": confidence, "sentiment": sentiment})

@app.route("/api/analyze-voice", methods=["POST"])
@require_auth
def analyze_voice():
    d = request.json
    text = d.get("text", "")
    sentiment = analyze_sentiment(text)
    emotion = "happy" if sentiment > 0.3 else "sad" if sentiment < -0.3 else "neutral"
    conn = get_connection()
    conn.execute(
        "INSERT INTO emotion_logs (user_id, emotion, confidence, sentiment_score, source) VALUES (?,?,?,?,?)",
        (g.user_id, emotion, 80.0, sentiment, "voice")
    )
    conn.commit()
    conn.close()
    return jsonify({"emotion": emotion, "sentiment": sentiment, "text": text})

# ── Chat ──────────────────────────────────────────────────────────────────────
@app.route("/api/chat", methods=["POST"])
@require_auth
def chat_endpoint():
    d = request.json
    result = chat(g.user_id, d.get("message",""), d.get("language","en"))
    return jsonify(result)

@app.route("/api/chat/history", methods=["GET"])
@require_auth
def chat_history():
    return jsonify(get_history(g.user_id, limit=30))

# ── Risk ──────────────────────────────────────────────────────────────────────
@app.route("/api/predict-risk", methods=["GET"])
@require_auth
def predict_risk():
    result = compute_risk(g.user_id)
    if result["risk_level"] == "high":
        trigger_alert(g.user_id, "risk", "critical", f"High risk score: {result['risk_score']}")
        socketio.emit("alert", {"type": "risk", "level": "high", "score": result["risk_score"]})
    return jsonify(result)

# ── Alerts ────────────────────────────────────────────────────────────────────
@app.route("/api/alerts", methods=["GET"])
@require_auth
def alerts():
    return jsonify(get_alerts(g.user_id))

@app.route("/api/alerts/<int:alert_id>/resolve", methods=["POST"])
@require_auth
def resolve(alert_id):
    resolve_alert(alert_id)
    return jsonify({"status": "resolved"})

# ── Digital Twin ──────────────────────────────────────────────────────────────
@app.route("/api/digital-twin", methods=["GET"])
@require_auth
def twin_summary():
    return jsonify(get_twin_summary(g.user_id))

@app.route("/api/digital-twin/update", methods=["POST"])
@require_auth
def twin_update():
    d = request.json
    anomaly = update_twin(g.user_id, d.get("activity","idle"), d.get("emotion","neutral"), d.get("vitals",{}))
    return jsonify({"anomaly_detected": anomaly})

# ── Loneliness ────────────────────────────────────────────────────────────────
@app.route("/api/loneliness", methods=["GET"])
@require_auth
def loneliness():
    return jsonify(compute_loneliness(g.user_id))

# ── Dashboard Summary ─────────────────────────────────────────────────────────
@app.route("/api/dashboard", methods=["GET"])
@require_auth
def dashboard():
    vitals = simulate_vitals(g.user_id)
    risk = compute_risk(g.user_id)
    loneliness_data = compute_loneliness(g.user_id)
    alerts_data = get_alerts(g.user_id, limit=5)
    conn = get_connection()
    last_emotion = conn.execute(
        "SELECT emotion, confidence FROM emotion_logs WHERE user_id=? ORDER BY timestamp DESC LIMIT 1",
        (g.user_id,)
    ).fetchone()
    conn.close()
    return jsonify({
        "vitals": vitals,
        "risk": risk,
        "loneliness": loneliness_data,
        "alerts": alerts_data,
        "emotion": dict(last_emotion) if last_emotion else {"emotion": "neutral", "confidence": 0},
        "timestamp": datetime.now().isoformat()
    })

# ── Caregiver ─────────────────────────────────────────────────────────────────
@app.route("/api/caregiver/patients", methods=["GET"])
@require_auth
def caregiver_patients():
    conn = get_connection()
    users = conn.execute("SELECT id, full_name, age, gender FROM users").fetchall()
    conn.close()
    result = []
    for u in users:
        risk = compute_risk(u["id"])
        result.append({**dict(u), "risk_level": risk["risk_level"], "risk_score": risk["risk_score"]})
    return jsonify(result)

# ── Medication ────────────────────────────────────────────────────────────────
@app.route("/api/medications", methods=["GET"])
@require_auth
def get_medications():
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM medication_logs WHERE user_id=? ORDER BY scheduled_time", (g.user_id,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/medications", methods=["POST"])
@require_auth
def add_medication():
    d = request.json
    conn = get_connection()
    conn.execute(
        "INSERT INTO medication_logs (user_id, medication_name, scheduled_time) VALUES (?,?,?)",
        (g.user_id, d["name"], d["time"])
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "added"}), 201

@app.route("/api/medications/<int:med_id>/take", methods=["POST"])
@require_auth
def take_medication(med_id):
    conn = get_connection()
    conn.execute("UPDATE medication_logs SET taken=1 WHERE id=? AND user_id=?", (med_id, g.user_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "taken"})

# ── WebSocket ─────────────────────────────────────────────────────────────────
@socketio.on("connect")
def on_connect():
    print(f"[WS] Client connected: {request.sid}")
    emit("connected", {"status": "ok"})

@socketio.on("disconnect")
def on_disconnect():
    print(f"[WS] Client disconnected: {request.sid}")

# ── Entry ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    print("=" * 50)
    print("  🏥  ElderCare AI Backend — http://localhost:5000")
    print("=" * 50)
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
