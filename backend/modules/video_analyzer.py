"""
Video Analysis Module — extracts frames from uploaded video,
runs DeepFace emotion detection on each frame, then uses Groq LLM
to generate a comprehensive health/emotional analysis report.
"""
import os, cv2, base64, tempfile, json
import numpy as np
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

GROQ_MODEL = "llama-3.3-70b-versatile"


def extract_frames(video_path: str, max_frames: int = 12) -> list:
    """Extract evenly spaced frames from video. Returns list of BGR numpy arrays."""
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps   = cap.get(cv2.CAP_PROP_FPS) or 25
    duration = total / fps

    if total == 0:
        cap.release()
        return []

    # Sample evenly across the video
    indices = [int(i * total / max_frames) for i in range(max_frames)]
    frames  = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret and frame is not None:
            frames.append(frame)
    cap.release()
    return frames, duration


def analyze_frame_emotion(frame) -> dict:
    """Run DeepFace on a single frame. Returns emotion dict or None."""
    try:
        from deepface import DeepFace
        result = DeepFace.analyze(frame, actions=["emotion"], enforce_detection=False, silent=True)
        emotions = result[0]["emotion"]
        dominant = result[0]["dominant_emotion"]
        confidence = emotions[dominant]
        return {"dominant": dominant, "confidence": round(confidence, 1), "all": emotions}
    except Exception as e:
        return None


def analyze_video(video_path: str) -> dict:
    """
    Full pipeline:
    1. Extract frames
    2. Run emotion detection on each frame
    3. Aggregate emotion data
    4. Use Groq LLM to generate health analysis report
    Returns comprehensive analysis dict.
    """
    result = {
        "status": "ok",
        "duration_seconds": 0,
        "frames_analyzed": 0,
        "emotion_timeline": [],
        "emotion_summary": {},
        "dominant_emotion": "neutral",
        "health_indicators": [],
        "ai_analysis": "",
        "risk_level": "low",
        "recommendations": []
    }

    # Step 1: Extract frames
    try:
        frames, duration = extract_frames(video_path, max_frames=12)
        result["duration_seconds"] = round(duration, 1)
    except Exception as e:
        result["status"] = "error"
        result["ai_analysis"] = f"Could not read video: {e}"
        return result

    if not frames:
        result["status"] = "error"
        result["ai_analysis"] = "No frames could be extracted from the video."
        return result

    # Step 2: Analyze each frame
    emotion_counts = {}
    timeline = []
    for i, frame in enumerate(frames):
        em = analyze_frame_emotion(frame)
        if em:
            d = em["dominant"]
            emotion_counts[d] = emotion_counts.get(d, 0) + 1
            timeline.append({
                "frame": i + 1,
                "emotion": d,
                "confidence": em["confidence"]
            })

    result["frames_analyzed"] = len(timeline)
    result["emotion_timeline"] = timeline

    if not timeline:
        result["ai_analysis"] = "No face detected in the video. Please ensure the person's face is clearly visible."
        return result

    # Step 3: Aggregate
    total = sum(emotion_counts.values())
    summary = {k: round(v / total * 100, 1) for k, v in emotion_counts.items()}
    result["emotion_summary"] = summary
    result["dominant_emotion"] = max(emotion_counts, key=emotion_counts.get)

    # Step 4: Groq LLM analysis
    try:
        from groq import Groq
        client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))

        prompt = f"""You are an expert AI health analyst specializing in elderly care.

Analyze the following facial emotion data extracted from a {duration:.0f}-second video of an elderly person:

Emotion Distribution:
{json.dumps(summary, indent=2)}

Dominant Emotion: {result['dominant_emotion']}
Frames Analyzed: {len(timeline)}

Based on this emotional pattern, provide:
1. A clear assessment of the person's current emotional and mental state
2. Whether they appear depressed, anxious, in pain, or unwell
3. Specific health concerns to watch for
4. Concrete recommendations for the caregiver
5. Risk level: low / medium / high

Be compassionate but direct. Write in simple language that a caregiver can understand.
Format your response as JSON with keys: assessment, health_concerns (list), recommendations (list), risk_level, summary_for_elderly (a kind message to show the person)."""

        resp = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.4,
            response_format={"type": "json_object"}
        )

        analysis = json.loads(resp.choices[0].message.content)
        result["ai_analysis"]      = analysis.get("assessment", "")
        result["health_indicators"] = analysis.get("health_concerns", [])
        result["recommendations"]   = analysis.get("recommendations", [])
        result["risk_level"]        = analysis.get("risk_level", "low")
        result["summary_for_elderly"] = analysis.get("summary_for_elderly", "")

    except Exception as e:
        # Fallback rule-based analysis
        result["ai_analysis"] = _rule_based_analysis(summary, result["dominant_emotion"])
        result["risk_level"]  = _rule_based_risk(summary)
        result["recommendations"] = _rule_based_recommendations(summary)

    return result


def _rule_based_analysis(summary: dict, dominant: str) -> str:
    neg = summary.get("sad", 0) + summary.get("fearful", 0) + summary.get("angry", 0)
    if dominant == "sad" or neg > 50:
        return "The person appears to be experiencing significant emotional distress. They show signs of sadness or depression. Immediate emotional support and caregiver check-in is recommended."
    if dominant == "fearful":
        return "The person appears anxious or fearful. This could indicate pain, confusion, or emotional distress. A caregiver should check in soon."
    if dominant == "angry":
        return "The person appears frustrated or agitated. This may indicate discomfort, pain, or unmet needs."
    if dominant == "happy":
        return "The person appears to be in a positive emotional state. They seem comfortable and content."
    return "The person appears emotionally neutral. No immediate concerns detected, but continued monitoring is recommended."


def _rule_based_risk(summary: dict) -> str:
    neg = summary.get("sad", 0) + summary.get("fearful", 0) + summary.get("angry", 0)
    if neg > 60: return "high"
    if neg > 30: return "medium"
    return "low"


def _rule_based_recommendations(summary: dict) -> list:
    recs = ["Continue regular monitoring"]
    if summary.get("sad", 0) > 30:
        recs.append("Schedule a social visit or phone call with family")
        recs.append("Consider speaking with a mental health professional")
    if summary.get("fearful", 0) > 20:
        recs.append("Check for sources of anxiety or discomfort")
        recs.append("Ensure the person feels safe and secure")
    if summary.get("angry", 0) > 20:
        recs.append("Check if the person is in physical pain")
        recs.append("Review medication schedule for any missed doses")
    return recs
