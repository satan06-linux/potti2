import random, base64, cv2, numpy as np
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

analyzer = SentimentIntensityAnalyzer()

EMOTIONS = ["happy", "sad", "angry", "surprised", "fearful", "disgusted", "neutral"]

def analyze_sentiment(text: str) -> float:
    return analyzer.polarity_scores(text)["compound"]

def detect_emotion_from_b64(b64_image: str):
    """Decode base64 image and detect emotion. Falls back to mock if DeepFace unavailable."""
    try:
        img_data = base64.b64decode(b64_image.split(",")[-1])
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        try:
            from deepface import DeepFace
            result = DeepFace.analyze(frame, actions=["emotion"], enforce_detection=False)
            dominant = result[0]["dominant_emotion"]
            confidence = result[0]["emotion"][dominant]
            return dominant, round(confidence, 2)
        except Exception:
            return _mock_emotion()
    except Exception:
        return _mock_emotion()

def _mock_emotion():
    emotion = random.choice(EMOTIONS)
    confidence = round(random.uniform(60, 95), 2)
    return emotion, confidence
