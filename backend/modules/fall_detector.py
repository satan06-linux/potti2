"""
Fall Detection using MediaPipe Pose.
Analyzes body landmark positions to detect a fall event.
"""
import base64, cv2, numpy as np
from database.db import get_connection

def detect_fall_from_b64(b64_image: str) -> dict:
    """
    Returns { fallen: bool, confidence: float, reason: str }
    Uses MediaPipe Pose to check if the person is horizontal (fallen).
    Falls back gracefully if MediaPipe is unavailable.
    """
    try:
        img_data = base64.b64decode(b64_image.split(",")[-1])
        np_arr   = np.frombuffer(img_data, np.uint8)
        frame    = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"fallen": False, "confidence": 0.0, "reason": "invalid_image"}

        import mediapipe as mp
        mp_pose = mp.solutions.pose

        with mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5) as pose:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(rgb)

            if not results.pose_landmarks:
                return {"fallen": False, "confidence": 0.0, "reason": "no_person_detected"}

            lm = results.pose_landmarks.landmark

            # Key landmarks
            nose        = lm[mp_pose.PoseLandmark.NOSE]
            left_hip    = lm[mp_pose.PoseLandmark.LEFT_HIP]
            right_hip   = lm[mp_pose.PoseLandmark.RIGHT_HIP]
            left_ankle  = lm[mp_pose.PoseLandmark.LEFT_ANKLE]
            right_ankle = lm[mp_pose.PoseLandmark.RIGHT_ANKLE]

            # Average hip and ankle Y positions (normalized 0-1, top=0 bottom=1)
            hip_y    = (left_hip.y + right_hip.y) / 2
            ankle_y  = (left_ankle.y + right_ankle.y) / 2
            nose_y   = nose.y

            # Fall heuristic:
            # 1. Nose Y is close to or below hip Y (person is horizontal)
            # 2. Vertical span (nose to ankle) is small relative to frame
            vertical_span = abs(nose_y - ankle_y)
            nose_near_hip = abs(nose_y - hip_y) < 0.15

            fallen = vertical_span < 0.35 or nose_near_hip
            confidence = round(min(1.0, (0.35 - vertical_span) / 0.35 * 100) if fallen else 0.0, 1)

            return {
                "fallen": fallen,
                "confidence": max(0.0, confidence),
                "reason": "horizontal_body_detected" if fallen else "upright"
            }

    except ImportError:
        return {"fallen": False, "confidence": 0.0, "reason": "mediapipe_not_available"}
    except Exception as e:
        print(f"[FallDetector] Error: {e}")
        return {"fallen": False, "confidence": 0.0, "reason": "detection_error"}


def log_fall_event(user_id: int, confidence: float):
    """Log a fall event to the alerts table."""
    from modules.alert_manager import trigger_alert
    trigger_alert(
        user_id, "fall_detection", "critical",
        f"Possible fall detected with {confidence:.0f}% confidence. Immediate check required."
    )
