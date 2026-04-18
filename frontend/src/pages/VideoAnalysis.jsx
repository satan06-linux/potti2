import { useState, useRef } from 'react'
import { Upload, Video, Brain, AlertTriangle, CheckCircle, RefreshCw, Youtube, Link } from 'lucide-react'
import api from '../api'
import './VideoAnalysis.css'

const EMOTION_EMOJI = { happy:'😊', sad:'😢', angry:'😠', surprised:'😲', fearful:'😨', neutral:'😐', disgusted:'🤢' }
const EMOTION_COLOR = { happy:'#10b981', sad:'#3b82f6', angry:'#ef4444', surprised:'#f59e0b', fearful:'#8b5cf6', neutral:'#94a3b8', disgusted:'#f97316' }
const RISK_COLOR    = { low:'#10b981', medium:'#f59e0b', high:'#ef4444' }
const RISK_LABEL    = { low:'Low Risk', medium:'Needs Attention', high:'High Risk — Act Now' }

export default function VideoAnalysis() {
  const [tab,      setTab]      = useState('upload') // 'upload' | 'youtube'
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

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('video/')) handleFile(f)
  }

  const reset = () => {
    setFile(null); setPreview(null); setResult(null)
    setError(null); setYtUrl('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const runSteps = (steps) => {
    let i = 0
    return setInterval(() => {
      if (i < steps.length) setProgress(steps[i++])
    }, 3000)
  }

  const analyzeUpload = async () => {
    if (!file) return
    setLoading(true); setError(null); setResult(null)
    const timer = runSteps(['Uploading video...','Extracting frames...','Analyzing facial expressions...','Running AI assessment...','Generating report...'])
    try {
      const form = new FormData()
      form.append('video', file)
      const res = await api.post('/analyze-video-upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.error || 'Analysis failed. Please try again.')
    } finally { clearInterval(timer); setLoading(false); setProgress('') }
  }

  const analyzeYoutube = async () => {
    if (!ytUrl.trim()) return
    setLoading(true); setError(null); setResult(null)
    const timer = runSteps(['Fetching YouTube video...','Downloading frames...','Analyzing facial expressions...','Running AI health assessment...','Generating report...'])
    try {
      const res = await api.post('/analyze-youtube', { url: ytUrl.trim() })
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.ai_analysis || e.response?.data?.error || 'Could not analyze YouTube video.')
    } finally { clearInterval(timer); setLoading(false); setProgress('') }
  }

  const canAnalyze = tab === 'upload' ? !!file : !!ytUrl.trim()

  return (
    <div className="video-analysis-page fade-in">
      <div className="page-header">
        <div>
          <h1>Video Health Analysis</h1>
          <p className="subtitle">AI-powered emotional & health assessment from video</p>
        </div>
        {result && <button className="btn btn-ghost" onClick={reset}><RefreshCw size={16}/> New Analysis</button>}
      </div>

      {!result && (
        <>
          {/* Tabs */}
          <div className="va-tabs">
            <button className={`va-tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
              <Upload size={16}/> Upload Video
            </button>
            <button className={`va-tab ${tab === 'youtube' ? 'active' : ''}`} onClick={() => setTab('youtube')}>
              <Youtube size={16}/> YouTube URL
            </button>
          </div>

          {/* Upload tab */}
          {tab === 'upload' && (
            <div
              className={`upload-zone card ${file ? 'has-file' : ''}`}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => !file && inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept="video/*" style={{display:'none'}}
                onChange={e => handleFile(e.target.files[0])} />
              {!file ? (
                <div className="upload-prompt">
                  <Upload size={52} color="var(--accent)" />
                  <h3>Drop a video here or click to upload</h3>
                  <p>Supports MP4, MOV, AVI, WebM — max 100MB</p>
                  <p className="upload-hint">AI will analyze facial expressions frame by frame to assess emotional and physical wellbeing</p>
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
          )}

          {/* YouTube tab */}
          {tab === 'youtube' && (
            <div className="card yt-input-card">
              <div className="yt-icon-row">
                <Youtube size={40} color="#ef4444" />
                <div>
                  <h3>Analyze a YouTube Video</h3>
                  <p>Paste any public YouTube video URL. The AI will download it, extract frames, and analyze the person's emotional state.</p>
                </div>
              </div>
              <div className="yt-input-row">
                <Link size={18} color="var(--text-muted)" />
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={ytUrl}
                  onChange={e => setYtUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && analyzeYoutube()}
                />
              </div>
              <p className="yt-note">⚠️ Only public videos work. Private or age-restricted videos cannot be analyzed.</p>
            </div>
          )}

          {/* Analyze button */}
          {canAnalyze && (
            <button className="btn btn-primary analyze-btn" onClick={tab === 'upload' ? analyzeUpload : analyzeYoutube} disabled={loading}>
              {loading
                ? <><span className="spin">⏳</span> {progress || 'Analyzing...'}</>
                : <><Brain size={20}/> {tab === 'youtube' ? 'Analyze YouTube Video' : 'Analyze Video'}</>
              }
            </button>
          )}
        </>
      )}

      {error && (
        <div className="card error-card">
          <AlertTriangle size={20} color="#ef4444" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="results-grid fade-in">

          {/* Source info for YouTube */}
          {result.source === 'youtube' && result.title && (
            <div className="card yt-source-card">
              <Youtube size={18} color="#ef4444" />
              <div>
                <div className="yt-source-title">{result.title}</div>
                <a href={result.youtube_url} target="_blank" rel="noreferrer" className="yt-source-link">
                  {result.youtube_url}
                </a>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="card result-summary" style={{ borderColor: RISK_COLOR[result.risk_level] }}>
            <div className="summary-top">
              <div className="summary-emotion">
                <span className="emotion-emoji-xl">{EMOTION_EMOJI[result.dominant_emotion] || '😐'}</span>
                <div>
                  <div className="dominant-label">Dominant Emotion</div>
                  <div className="dominant-name" style={{ color: EMOTION_COLOR[result.dominant_emotion] }}>
                    {result.dominant_emotion}
                  </div>
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

          {/* Emotion breakdown */}
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

          {/* AI Assessment */}
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
      )}
    </div>
  )
}
