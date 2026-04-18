"""
SMS alerts via Twilio for critical ElderCare events.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Always load from backend root .env regardless of where this module is called from
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

def send_sms_alert(message: str, severity: str = "critical") -> bool:
    """Send SMS alert via Twilio. Returns True on success."""
    sid      = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    token    = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_num = os.getenv("TWILIO_FROM", "").strip()
    to_num   = os.getenv("CAREGIVER_PHONE", "").strip()

    print(f"[Twilio] Attempting SMS → SID={sid[:8]}... FROM={from_num} TO={to_num}")

    if not all([sid, token, from_num, to_num]):
        print("[Twilio] Missing credentials — check .env for TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, CAREGIVER_PHONE")
        return False

    if "xxxxxxxxxx" in to_num.lower():
        print("[Twilio] CAREGIVER_PHONE still has placeholder — update .env with real number")
        return False

    try:
        from twilio.rest import Client
        client = Client(sid, token)
        emoji  = "🆘" if "SOS" in message else "🚨"
        body   = (
            f"{emoji} ElderCare ALERT [{severity.upper()}]\n"
            f"{message}\n\n"
            f"Please check on your patient immediately."
        )
        msg = client.messages.create(body=body, from_=from_num, to=to_num)
        print(f"[Twilio] ✅ SMS sent — SID: {msg.sid} Status: {msg.status}")
        return True
    except ImportError:
        print("[Twilio] twilio package not installed. Run: pip install twilio")
        return False
    except Exception as e:
        print(f"[Twilio] ❌ Failed: {e}")
        return False

# Keep old name as alias so nothing breaks
send_whatsapp_alert = send_sms_alert
