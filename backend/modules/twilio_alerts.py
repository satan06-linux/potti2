"""
WhatsApp / SMS alerts via Twilio.
Sends critical alerts to caregiver's phone.
Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, CAREGIVER_PHONE in .env
For WhatsApp: TWILIO_FROM=whatsapp:+14155238886, CAREGIVER_PHONE=whatsapp:+91XXXXXXXXXX
For SMS:      TWILIO_FROM=+1XXXXXXXXXX,           CAREGIVER_PHONE=+91XXXXXXXXXX
"""
import os
from dotenv import load_dotenv

load_dotenv()

def send_whatsapp_alert(message: str, severity: str = "critical") -> bool:
    """Send WhatsApp/SMS alert via Twilio. Returns True on success."""
    sid      = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    token    = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_num = os.getenv("TWILIO_FROM", "").strip()
    to_num   = os.getenv("CAREGIVER_PHONE", "").strip()

    if not all([sid, token, from_num, to_num]):
        print("[Twilio] Credentials not configured — skipping WhatsApp alert")
        return False

    try:
        from twilio.rest import Client
        client = Client(sid, token)
        body = f"🚨 ElderCare Alert [{severity.upper()}]\n{message}\n\nPlease check on your patient immediately."
        client.messages.create(body=body, from_=from_num, to=to_num)
        print(f"[Twilio] Alert sent to {to_num}")
        return True
    except ImportError:
        print("[Twilio] twilio package not installed. Run: pip install twilio")
        return False
    except Exception as e:
        print(f"[Twilio] Failed to send alert: {e}")
        return False
