"""
Video Analysis Module — extracts frames from uploaded video OR YouTube URL,
runs DeepFace emotion detection on each frame, then uses Groq LLM
to generate a comprehensive health/emotional analysis report.
"""
import os, cv2, tempfile, json, re
import numpy as np
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

GROQ_MODEL = "llama-3.3-70b-versatile"


def is_youtube_url(url: str) -> bool:
    return bool(re.search(r'(youtube\.com/watch|youtu\.be/|youtube\.com/shorts)', url))


def download_youtube(url: str, output_dir: str) -> str:
    """
    Download YouTube video using yt-dlp with cookies from browser.
    Uses Chrome/Edge cookies to authenticate and bypass PO token requirement.
    """
    import yt_dlp
    out_path = os.path.join(output_dir, "yt_video.%(ext)s")

    # Try with browser cookies first (most reliable), then fallback options
    configs = [
        # Option 1: Use Chrome cookies (works if Chrome is installed and logged in)
        {
            "cookiesfrombrowser": ("chrome",),
            "extractor_args": {"youtube": {"player_client": ["web"]}},
        },
        # Option 2: Use Edge cookies
        {
            "cookiesfrombrowser": ("edge",),
            "extractor_args": {"youtube": {"player_client": ["web"]}},
        },
        # Option 3: mweb client (mobile web — sometimes works without cookies)
        {
            "extractor_args": {"youtube": {"player_client": ["mweb"]}},
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
            },
        },
    ]

    base_opts = {
        "format": "best[height<=480]/best",
        "outtmpl": out_path,
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "socket_timeout": 30,
    }

    last_error = None
    for extra in configs:
        try:
            opts = {**base_opts, **extra}
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get("title", "Unknown")
                for ext in ["mp4", "mkv", "webm", "avi", "m4v"]:
                    candidate = os.path.join(output_dir, f"yt_video.{ext}")
                    if os.path.exists(candidate):
                        return candidate, title
                for f in os.listdir(output_dir):
                    if f.startswith("yt_video"):
                        return os.path.join(output_dir, f), title
        except Exception as e:
            last_error = str(e)
            # Clean up any partial files before retry
            for f in os.listdir(output_dir):
                try: os.remove(os.path.join(output_dir, f))
                except: pass
            continue

    raise Exception(
        f"YouTube download failed. YouTube now requires browser authentication.\n"
        f"Please use the 'Upload Video' tab instead — record a short video and upload it directly.\n"
        f"(Technical reason: {last_error})"
    )


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


def analyze_video(video_path: str, title: str = "") -> dict:
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
        "title": title,
        "duration_seconds": 0,
        "frames_analyzed": 0,
        "emotion_timeline": [],
        "emotion_summary": {},
        "dominant_emotion": "neutral",
        "health_indicators": [],
        "ai_analysis": "",
        "risk_level": "low",
        "recommendations": [],
        "summary_for_elderly": ""
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


def analyze_from_url(url: str) -> dict:
    """
    Download a YouTube video and analyze it.
    Returns same dict as analyze_video().
    """
    if not is_youtube_url(url):
        return {"status": "error", "ai_analysis": "Only YouTube URLs are supported (youtube.com or youtu.be)"}

    tmp_dir = tempfile.mkdtemp()
    try:
        print(f"[VideoAnalyzer] Downloading YouTube video: {url}")
        video_path, title = download_youtube(url, tmp_dir)
        print(f"[VideoAnalyzer] Downloaded: {title} → {video_path}")
        result = analyze_video(video_path, title=title)
        result["source"] = "youtube"
        result["youtube_url"] = url
        return result
    except Exception as e:
        print(f"[VideoAnalyzer] YouTube download failed: {e}")
        return {
            "status": "error",
            "ai_analysis": f"Could not download video: {str(e)}. Make sure the URL is a valid public YouTube video."
        }
    finally:
        # Cleanup temp files
        import shutil
        try: shutil.rmtree(tmp_dir)
        except: pass
