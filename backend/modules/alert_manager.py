"""Alert Manager — logs alerts, sends email/mock SMS."""
import os, smtplib, sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
from database.db import get_connection

load_dotenv()

def trigger_alert(user_id: int, alert_type: str, severity: str, message: str):
    _log_alert(user_id, alert_type, severity, message)
    _console_alert(severity, alert_type, message)
    _email_alert(severity, alert_type, message)
    return {"alert_type": alert_type, "severity": severity, "message": message}

def _log_alert(user_id, alert_type, severity, message):
    conn = get_connection()
    conn.execute(
        "INSERT INTO alerts (user_id, alert_type, severity, message) VALUES (?,?,?,?)",
        (user_id, alert_type, severity, message)
    )
    conn.commit()
    conn.close()

def _console_alert(severity, alert_type, message):
    if severity == "critical":
        sys.stdout.write("\a")
    tag = "🔴" if severity == "critical" else "🟡"
    print(f"\n{tag} [{severity.upper()}] {alert_type}: {message}\n")

def _email_alert(severity, alert_type, message):
    sender = os.getenv("ALERT_EMAIL_SENDER", "").strip()
    password = os.getenv("ALERT_EMAIL_PASSWORD", "").strip()
    receiver = os.getenv("CAREGIVER_EMAIL", "").strip()
    if not (sender and password and receiver):
        return
    try:
        msg = MIMEMultipart()
        msg["From"] = sender
        msg["To"] = receiver
        msg["Subject"] = f"[ElderCare {severity.upper()}] {alert_type} Alert"
        msg.attach(MIMEText(f"Severity: {severity}\nType: {alert_type}\nMessage: {message}", "plain"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
            s.login(sender, password)
            s.sendmail(sender, receiver, msg.as_string())
    except Exception as e:
        print(f"[AlertManager] Email failed: {e}")

def get_alerts(user_id: int, limit: int = 20) -> list:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM alerts WHERE user_id=? ORDER BY timestamp DESC LIMIT ?",
        (user_id, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def resolve_alert(alert_id: int):
    conn = get_connection()
    conn.execute("UPDATE alerts SET resolved=1 WHERE id=?", (alert_id,))
    conn.commit()
    conn.close()
