import { useState, useRef, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Camera, CameraOff, Activity, AlertCircle } from 'lucide-react'
import api from '../api'
import './LiveMonitor.css'

const EMOTION_COLOR = { happy:'#10b981', sad:'#3b82f6', angry:'#ef4444', surprised:'#f59e0b', fearful:'#8b5cf6', neutral:'#94a3b8', disgusted:'#f97316' }

export default function LiveMonitor() {
  const webcamRef = useRef(null)
  const [active, setActive] = useState(false)
  const [emotion, setEmotion] = useState({ emotion: 'neutral', confidence: 0 })
  const [status, setStatus] = useState('idle')
  const [vitals, setVitals] = useState(null)
  const intervalRef = useRef(null)

  const captureAndAnalyze = useCallback(async () => {
    if (!webcamRef.current) return
    const image = webcamRef.current.getScreenshot()
    if (!image) return
    try {
      setStatus('analyzing')
      const res = await api.post('/analyze-face', { image })
      setEmotion(res.data)
      setStatus('active')
    } catch { setStatus('error') }
  }, [])

  const fetchVitals = useCallback(async () => {
    try {
      const res = await api.get('/vitals/current')
      setVitals(res.data)
    } catch {}
  }, [])

  useEffect(() => {
    if (active) {
      intervalRef.current = setInterval(() => {
        captureAndAnalyze()
        fetchVitals()
      }, 5000)
      captureAndAnalyze()
      fetchVitals()
    } else {
      clearInterval(intervalRef.current)
      setStatus('idle')
    }
    return () => clearInterval(intervalRef.current)
  }, [active, captureAndAnalyze, fetchVitals])

  const statusColor = { idle: '#94a3b8', active: '#10b981', analyzing: '#f59e0b', error: '#ef4444' }

  return (
    <div className="live-monitor fade-in">
      <div className="page-header">
        <div>
          <h1>Live Monitoring</h1>
          <p className="subtitle">Real-time camera & vitals analysis</p>
        </div>
        <button className={`btn ${active ? 'btn-danger' : 'btn-primary'}`} onClick={() => setActive(!active)}>
          {active ? <><CameraOff size={18}/> Stop</> : <><Camera size={18}/> Start Monitoring</>}
        </button>
      </div>

      <div className="monitor-grid">
        {/* Camera Feed */}
        <div className="card camera-card">
          <div className="camera-header">
            <span>Camera Feed</span>
            <div className="status-indicator" style={{ background: statusColor[status] }}>
              <span className={status === 'active' ? 'pulse' : ''}></span>
              {status}
            </div>
          </div>
          {active ? (
            <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="webcam-feed"
              videoConstraints={{ width: 640, height: 480, facingMode: 'user' }} />
          ) : (
            <div className="camera-placeholder">
              <Camera size={48} color="var(--text-muted)" />
              <p>Click "Start Monitoring" to begin</p>
            </div>
          )}
        </div>

        {/* Emotion Panel */}
        <div className="side-panels">
          <div className="card emotion-panel">
            <h3>Detected Emotion</h3>
            <div className="emotion-display" style={{ color: EMOTION_COLOR[emotion.emotion] }}>
              <div className="emotion-big">{emotion.emotion}</div>
              <div className="confidence-bar">
                <div className="confidence-fill" style={{ width: `${emotion.confidence}%`, background: EMOTION_COLOR[emotion.emotion] }} />
              </div>
              <div className="confidence-label">{emotion.confidence?.toFixed(1)}% confidence</div>
            </div>
          </div>

          {vitals && (
            <div className="card vitals-mini">
              <h3>
                <Activity size={16}/> Live Vitals
                {vitals.source === 'fitbit'
                  ? <span className="source-badge fitbit-badge" style={{fontSize:10,marginLeft:6}}>📡 Fitbit</span>
                  : <span className="source-badge sim-badge" style={{fontSize:10,marginLeft:6}}>🔵 Sim</span>
                }
              </h3>
              <div className="mini-vitals">
                <div className="mini-vital"><span>❤️ HR</span><strong>{vitals.heart_rate} bpm</strong></div>
                <div className="mini-vital"><span>💨 SpO2</span><strong>{vitals.spo2}%</strong></div>
                <div className="mini-vital"><span>🌡️ Temp</span><strong>{vitals.temperature}°C</strong></div>
                <div className="mini-vital"><span>🩸 BP</span><strong>{vitals.bp_sys}/{vitals.bp_dia}</strong></div>
                <div className="mini-vital"><span>👟 Steps</span><strong>{vitals.steps}</strong></div>
                <div className="mini-vital"><span>🌙 Sleep</span><strong>{vitals.sleep_hours}h</strong></div>
              </div>
            </div>
          )}

          <div className="card status-legend">
            <h3>Status Indicators</h3>
            {[['active','#10b981','Normal monitoring'],['idle','#94a3b8','Not monitoring'],['analyzing','#f59e0b','Processing frame'],['error','#ef4444','Detection error']].map(([s,c,d]) => (
              <div key={s} className="legend-item">
                <div className="legend-dot" style={{background:c}}/>
                <div><strong>{s}</strong> — {d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
