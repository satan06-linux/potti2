import { useState, useRef } from 'react'
import { Upload, Video, Brain, AlertTriangle, CheckCircle, RefreshCw, Link, Monitor, Circle, Square } from 'lucide-react'
import api from '../api'
import './VideoAnalysis.css'

const EMOTION_EMOJI = { happy:'😊', sad:'😢', angry:'😠', surprised:'😲', fearful:'😨', neutral:'😐', disgusted:'🤢' }
const EMOTION_COLOR = { happy:'#10b981', sad:'#3b82f6', angry:'#ef4444', surprised:'#f59e0b', fearful:'#8b5cf6', neutral:'#94a3b8', disgusted:'#f97316' }
const RISK_COLOR    = { low:'#10b981', medium:'#f59e0b', high:'#ef4444' }
const RISK_LABEL    = { low:'Low Risk', medium:'Needs Attention', high:'High Risk — Act Now' }

function YTIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#ef4444" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8z"/>
      <polygon fill="white" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
    </svg>
  )
}

// ── Screen Recorder ───────────────────────────────────────────
function ScreenRecorder({ onRecorded }) {
  const mediaRef  = useRef(null)
  const chunksRef = useRef([])
  const timerRef  = useRef(null)
  const [phase,   setPhase]   = useState('idle')
  const [seconds, setSeconds] = useState(0)
  const [videoUrl,setVideoUrl]= useState(null)
  const [blob,    setBlob]    = useState(null)

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15, width: 1280 },
        audio: false
      })
      chunksRef.current = []
      const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' })
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        clearInterval(timerRef.current)
        const b = new Blob(chunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(b)
        setBlob(b); setVideoUrl(url); setPhase('done')
      }
      // Auto-stop if user stops sharing via browser UI
      stream.getVideoTracks()[0].onended = () => mr.state === 'recording' && mr.stop()
      mr.start()
      mediaRef.current = mr
      setPhase('recording'); setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch (e) {
      if (e.name !== 'NotAllowedError') alert('Screen capture failed: ' + e.message)
    }
  }

  const stop = () => { mediaRef.current?.stop(); clearInterval(timerRef.current) }
  const retake = () => { setPhase('idle'); setVideoUrl(null); setBlob(null); setSeconds(0) }
  const useVideo = () => {
    const file = new File([blob], 'screen_recording.webm', { type: 'video/webm' })
    onRecorded(file, videoUrl)
  }

  return (
    <div className="card screen-rec-card">
      <div className="screen-rec-header">
        <Monitor size={24} color="var(--accent)" />
        <div>
          <h3>Record Your Screen</h3>
          <p>Open YouTube in another tab, play the video, then record your screen here. The AI will analyze the face in the recording.</p>
        </div>
      </div>

      {phase === 'idle' && (
        <div className="screen-steps">
          <div className="screen-step"><span>1</span> Open YouTube in a new tab and find your video</div>
          <div className="screen-step"><span>2</span> Come back here and click "Start Screen Recording"</div>
          <div className="screen-step"><span>3</span> Select the YouTube tab when the browser asks</div>
          <div className="screen-step"><span>4</span> Play the video, then click "Stop" when done</div>
        </div>
      )}

      {phase === 'recording' && (
        <div className="screen-rec-active">
          <div className="rec-badge-large">
            <span className="rec-dot" /> Recording screen — {seconds}s
          </div>
          <p>Switch to your YouTube tab and play the video now</p>
        </div>
      )}

      {phase === 'done' && videoUrl && (
        <video src={videoUrl} className="recorder-feed" controls />
      )}

      <div className="recorder-controls">
        {phase === 'idle' && (
          <button className="btn btn-primary rec-btn" onClick={start}>
            <Monitor size={18}/> Start Screen Recording
          </button>
        )}
        {phase === 'recording' && (
          <button className="btn btn-danger rec-btn" onClick={stop}>
            <Square size={18}/> Stop Recording
          </button>
        )}
        {phase === 'done' && (
          <div className="recorder-done-btns">
            <button className="btn btn-ghost" onClick={retake}>↩ Record Again</button>
            <button className="btn btn-primary" onClick={useVideo}>
              <Brain size={18}/> Analyze This Recording
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Results component ─────────────────────────────────────────
function Results({ result }) {
  return (
    <div className="results-grid fade-in">
      {result.source === 'youtube' && result.title && (
        <div className="card yt-source-card">
          <YTIcon size={20} />
          <div>
            <div className="yt-source-title">{result.title}</div>
            <a href={result.youtube_url} target="_blank" rel="noreferrer" className="yt-source-link">{result.youtube_url}</a>
          </div>
        </div>
      )}

      <div className="card result-summary" style={{ borderColor: RISK_COLOR[result.risk_level] }}>
        <div className="summary-top">
          <div className="summary-emotion">
            <span className="emotion-emoji-xl">{EMOTION_EMOJI[result.dominant_emotion] || '😐'}</span>
            <div>
              <div className="dominant-label">Dominant Emotion</div>
              <div className="dominant-name" style={{ color: EMOTION_COLOR[result.dominant_emotion] }}>{result.dominant_emotion}</div>
            </div>
          </div>
          <div className="risk-pill" style={{ background:`${RISK_COLOR[result.risk_level]}22`, color:RISK_COLOR[result.risk_level], border:`1px solid ${RISK_COLOR[result.risk_level]}` }}>
            {RISK_LABEL[result.risk_level]}
          </div>
        </div>
        <div className="summary-stats">
          <div className="stat"><span>Duration</span><strong>{result.duration_seconds}s</strong></div>
          <div className="stat"><span>Frames</span><strong>{result.frames_analyzed}</strong></div>
        </div>
      </div>

      <div className="card">
        <h3>Emotion Breakdown</h3>
        <div className="emotion-bars">
          {Object.entries(result.emotion_summary || {}).sort((a,b) => b[1]-a[1]).map(([emotion, pct]) => (
            <div key={emotion} className="emotion-bar-row">
              <span className="emo-label">{EMOTION_EMOJI[emotion]} {emotion}</span>
              <div className="emo-bar-track">
                <div className="emo-bar-fill" style={{ width:`${pct}%`, background:EMOTION_COLOR[emotion]||'#94a3b8' }} />
              </div>
              <span className="emo-pct">{pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card ai-assessment-card">
        <h3><Brain size={16} color="var(--accent)"/> AI Health Assessment</h3>
        <p className="assessment-text">{result.ai_analysis}</p>
        {result.summary_for_elderly && (
          <div className="elderly-message">
            <span>💙</span>
            <p>{result.summary_for_elderly}</p>
          </div>
        )}
      </div>

      {result.health_indicators?.length > 0 && (
        <div className="card">
          <h3><AlertTriangle size={16} color="var(--accent-yellow)"/> Health Concerns</h3>
          <div className="concern-list">
            {result.health_indicators.map((c,i) => <div key={i} className="concern-item">⚠️ {c}</div>)}
          </div>
        </div>
      )}

      {result.recommendations?.length > 0 && (
        <div className="card">
          <h3><CheckCircle size={16} color="var(--accent-green)"/> Recommendations</h3>
          <div className="rec-list">
            {result.recommendations.map((r,i) => <div key={i} className="rec-item-v">✅ {r}</div>)}
          </div>
        </div>
      )}

      {result.emotion_timeline?.length > 0 && (
        <div className="card timeline-card">
          <h3>Emotion Timeline</h3>
          <div className="timeline-dots">
            {result.emotion_timeline.map((t,i) => (
              <div key={i} className="timeline-dot" title={`Frame ${t.frame}: ${t.emotion} (${t.confidence}%)`}>
                <div className="dot" style={{ background:EMOTION_COLOR[t.emotion]||'#94a3b8' }} />
                <span>{EMOTION_EMOJI[t.emotion]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function VideoAnalysis() {
  const [tab,      setTab]      = useState('screen')  // screen | upload | youtube
  const [file,     setFile]     = useState(null)
  const [preview,  setPreview]  = useState(null)
  const [ytUrl,    setYtUrl]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState(null)
  const [progress, setProgress] = useState('')
  const inputRef = useRef(null)

  const handleFile = (f) => {
    if (!f) return
    setFile(f); setResult(null); setError(null)
    setPreview(URL.createObjectURL(f))
  }

  const reset = () => {
    setFile(null); setPreview(null); setResult(null)
    setError(null); setYtUrl('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const runSteps = (steps) => {
    let i = 0
    return setInterval(() => { if (i < steps.length) setProgress(steps[i++]) }, 3000)
  }

  const analyzeFile = async (f) => {
    setLoading(true); setError(null); setResult(null)
    const timer = runSteps(['Uploading...','Extracting frames...','Analyzing expressions...','Running AI assessment...','Generating report...'])
    try {
      const form = new FormData()
      form.append('video', f)
      const res = await api.post('/analyze-video-upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.error || 'Analysis failed. Please try again.')
    } finally { clearInterval(timer); setLoading(false); setProgress('') }
  }

  const analyzeYoutube = async () => {
    if (!ytUrl.trim()) return
    setLoading(true); setError(null); setResult(null)
    const timer = runSteps(['Fetching video...','Downloading frames...','Analyzing expressions...','Running AI assessment...','Generating report...'])
    try {
      const res = await api.post('/analyze-youtube', { url: ytUrl.trim() })
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.ai_analysis || e.response?.data?.error || 'Could not analyze. Try closing Edge browser first.')
    } finally { clearInterval(timer); setLoading(false); setProgress('') }
  }

  // Called when screen recorder or upload finishes
  const onRecorded = (f, url) => {
    setFile(f); setPreview(url); setTab('upload')
    // Auto-analyze immediately
    analyzeFile(f)
  }

  return (
    <div className="video-analysis-page fade-in">
      <div className="page-header">
        <div>
          <h1>Video Health Analysis</h1>
          <p className="subtitle">AI-powered emotional & health assessment from video</p>
        </div>
        {(result || loading) && <button className="btn btn-ghost" onClick={reset}><RefreshCw size={16}/> New Analysis</button>}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="card analyzing-card">
          <div className="analyzing-spinner">⏳</div>
          <div>
            <div className="analyzing-title">Analyzing video...</div>
            <div className="analyzing-step">{progress}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="card error-card">
          <AlertTriangle size={20} color="#ef4444" />
          <span>{error}</span>
        </div>
      )}

      {result && <Results result={result} />}

      {!result && !loading && (
        <>
          {/* Tabs */}
          <div className="va-tabs">
            <button className={`va-tab ${tab === 'screen' ? 'active' : ''}`} onClick={() => setTab('screen')}>
              <Monitor size={16}/> Record Screen
            </button>
            <button className={`va-tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
              <Upload size={16}/> Upload File
            </button>
            <button className={`va-tab ${tab === 'youtube' ? 'active' : ''}`} onClick={() => setTab('youtube')}>
              <YTIcon size={16}/> YouTube URL
            </button>
          </div>

          {/* Screen Record tab — default */}
          {tab === 'screen' && <ScreenRecorder onRecorded={onRecorded} />}

          {/* Upload tab */}
          {tab === 'upload' && (
            <>
              <div
                className={`upload-zone card ${file ? 'has-file' : ''}`}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('video/')) handleFile(f) }}
                onDragOver={e => e.preventDefault()}
                onClick={() => !file && inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" accept="video/*" style={{display:'none'}}
                  onChange={e => handleFile(e.target.files[0])} />
                {!file ? (
                  <div className="upload-prompt">
                    <Upload size={52} color="var(--accent)" />
                    <h3>Drop a video here or click to upload</h3>
                    <p>MP4, MOV, AVI, WebM — max 100MB</p>
                  </div>
                ) : (
                  <div className="file-preview">
                    <video src={preview} className="video-preview" controls />
                    <div className="file-info">
                      <Video size={20} color="var(--accent)" />
                      <div>
                        <div className="file-name">{file.name}</div>
                        <div className="file-size">{(file.size/1024/1024).toFixed(1)} MB</div>
                      </div>
                      <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); reset() }}>Remove</button>
                    </div>
                  </div>
                )}
              </div>
              {file && (
                <button className="btn btn-primary analyze-btn" onClick={() => analyzeFile(file)}>
                  <Brain size={20}/> Analyze Video
                </button>
              )}
            </>
          )}

          {/* YouTube URL tab */}
          {tab === 'youtube' && (
            <div className="card yt-input-card">
              <div className="yt-icon-row">
                <YTIcon size={40} />
                <div>
                  <h3>YouTube URL</h3>
                  <p>Paste a YouTube URL. Requires Edge to be fully closed first.</p>
                </div>
              </div>
              <div className="yt-input-row">
                <Link size={18} color="var(--text-muted)" />
                <input type="url" placeholder="https://www.youtube.com/watch?v=..."
                  value={ytUrl} onChange={e => setYtUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && analyzeYoutube()} />
              </div>
              <div className="yt-tips">
                <p>💡 Recommended: Use <strong>Record Screen</strong> tab instead — open YouTube in another tab, record it here, instant analysis.</p>
              </div>
              {ytUrl.trim() && (
                <button className="btn btn-primary analyze-btn" onClick={analyzeYoutube}>
                  <Brain size={20}/> Analyze YouTube Video
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
