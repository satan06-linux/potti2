"""
Emotion Detector — uses DeepFace for real facial analysis, VADER for text sentiment.
Never returns random/fake emotions. Returns 'undetected' if analysis fails.
"""
import base64, cv2, numpy as np
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

analyzer = SentimentIntensityAnalyzer()


def analyze_sentiment(text: str) -> float:
    """Real VADER sentiment score: -1.0 (negative) to +1.0 (positive)."""
    return analyzer.polarity_scores(text)["compound"]


def detect_emotion_from_b64(b64_image: str):
    """
    Decode base64 image and detect emotion using DeepFace.
    Returns ('undetected', 0.0) if DeepFace is unavailable or detection fails.
    Never returns random values.
    """
    try:
        img_data = base64.b64decode(b64_image.split(",")[-1])
        np_arr   = np.frombuffer(img_data, np.uint8)
        frame    = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            return "undetected", 0.0

        from deepface import DeepFace
        result   = DeepFace.analyze(frame, actions=["emotion"], enforce_detection=False)
        dominant = result[0]["dominant_emotion"]
        confidence = result[0]["emotion"][dominant]
        return dominant, round(confidence, 2)

    except ImportError:
        print("[EmotionDetector] DeepFace not installed — cannot detect emotion.")
        return "undetected", 0.0
    except Exception as e:
        print(f"[EmotionDetector] Detection failed: {e}")
        return "undetected", 0.0
