# 🏥 Agentic ElderCare AI Companion

A full-stack AI-powered web application for proactive health monitoring, emotional intelligence, and elderly companionship.

## Project Structure

```
elder/
├── backend/          # Flask API
│   ├── server.py     # Main Flask app + all API routes
│   ├── database/
│   │   └── db.py     # SQLite schema + helpers
│   ├── modules/
│   │   ├── emotion_detector.py   # Face emotion via DeepFace/OpenCV
│   │   ├── risk_engine.py        # Predictive risk scoring
│   │   ├── digital_twin.py       # Behavior learning + anomaly detection
│   │   ├── loneliness_score.py   # Loneliness computation
│   │   ├── vitals_simulator.py   # Wearable data simulation
│   │   ├── chat_agent.py         # Conversational AI (Groq LLM)
│   │   └── alert_manager.py      # Alert logging + email
│   ├── .env.example
│   └── requirements.txt
└── frontend/         # React.js (Vite)
    └── src/
        ├── pages/
        │   ├── Dashboard.jsx         # Home dashboard
        │   ├── LiveMonitor.jsx       # Camera + real-time vitals
        │   ├── VoiceAssistant.jsx    # Chat + voice UI
        │   ├── HealthAnalytics.jsx   # Charts & trends
        │   ├── EmotionInsights.jsx   # Mood timeline + loneliness
        │   ├── AlertsPage.jsx        # Alerts + medication reminders
        │   ├── CaregiverDashboard.jsx
        │   └── Profile.jsx
        └── components/
            ├── Layout.jsx
            └── VitalCard.jsx
```

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
python server.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — register a new account and start monitoring.

## Features
- Real-time vitals monitoring (simulated wearable data)
- Face emotion detection via webcam (DeepFace)
- Voice assistant with multilingual support (EN/HI/TE)
- Predictive risk engine (vitals + emotion trends)
- Digital Twin behavior model + anomaly detection
- Loneliness score computation
- Medication reminders
- Caregiver remote dashboard
- JWT authentication
- WebSocket real-time updates
- Emergency alert system (email)

## Environment Variables
| Key | Description |
|-----|-------------|
| `GROQ_API_KEY` | Free LLM API (llama3) — get at console.groq.com |
| `SECRET_KEY` | JWT secret |
| `ALERT_EMAIL_SENDER` | Gmail for alerts |
| `ALERT_EMAIL_PASSWORD` | Gmail app password |
| `CAREGIVER_EMAIL` | Caregiver notification email |
