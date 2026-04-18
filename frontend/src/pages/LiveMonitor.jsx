import { useState, useRef, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Camera, CameraOff, Activity, ShieldAlert } from 'lucide-react'
import api from '../api'
import './LiveMonitor.css'

const EMOTION_COLOR = {
  happy:'#10b981', sad:'#3b82f6', angry:'#ef4444',
  surprised:'#f59e0b', fearful:'#8b5cf6', neutral:'#94a3b8',
  disgusted:'#f97316', undetected:'#475569'
}
const EMOTION_EMOJI = {
  happy:'😊', sad:'😢', angry:'😠', surprised:'😲',
  fearful:'😨', neutral:'😐', disgusted:'🤢', undetected:'🔍'
}

export default function LiveMonitor() {
  const webcamRef   = useRef(null)
  const intervalRef = useRef(null)

  const [active,   setActive]   = useState(false)
  const [emotion,  setEmotion]  = useState({ emotion: 'neutral', confidence: 0 })
  const [status,   setStatus]   = useState('idle')
  const [vitals,   setVitals]   = useState(null)
  const [fallAlert, setFallAlert] = useState(null) // { confidence, time }
  const [iAmOk,    setIAmOk]    = useState(false)

  const captureAndAnalyze = useCallback(async () => {
    if (!webcamRef.current) return
    const image = webcamRef.current.getScreenshot()
    if (!image) return
    try {
      setStatus('analyzing')

      // Run emotion + fall detection in parallel
      const [emotionRes, fallRes] = await Promise.allSettled([
        api.post('/analyze-face', { image }),
        api.post('/detect-fall',  { image }),
      ])

      if (emotionRes.status === 'fulfilled') setEmotion(emotionRes.value.data)

      if (fallRes.status === 'fulfilled') {
        const fall = fallRes.value.data
        if (fall.fallen && fall.confidence > 60) {
          setFallAlert({ confidence: fall.confidence, time: new Date() })
          setIAmOk(false)
          // Play alert sound
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain); gain.connect(ctx.destination)
            osc.frequency.value = 880
            gain.gain.setValueAtTime(0.3, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
            osc.start(); osc.stop(ctx.currentTime + 0.8)
          } catch {}
        }
      }

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

  const statusColor = { idle:'#94a3b8', active:'#10b981', analyzing:'#f59e0b', error:'#ef4444' }

  return (
    <div className="live-monitor fade-in">
      <div className="page-header">
        <div>
          <h1>Live Monitoring</h1>
          <p className="subtitle">Real-time camera, emotion & fall detection</p>
        </div>
        <button
          className={`btn monitor-toggle-btn ${active ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => setActive(!active)}
        >
          {active ? <><CameraOff size={20}/> Stop Monitoring</> : <><Camera size={20}/> Start Monitoring</>}
        </button>
      </div>

      {/* Fall Alert Banner */}
      {fallAlert && !iAmOk && (
        <div className="fall-alert-banner">
          <ShieldAlert size={28} />
          <div className="fall-alert-text">
            <strong>⚠️ Possible Fall Detected!</strong>
            <span>Detected at {fallAlert.time.toLocaleTimeString()} — {fallAlert.confidence.toFixed(0)}% confidence. Your caregiver has been notified.</span>
          </div>
          <button className="btn fall-ok-btn" onClick={() => setIAmOk(true)}>
            ✅ I'm Okay
          </button>
        </div>
      )}

      <div className="monitor-grid">
        {/* Camera Feed */}
        <div className="card camera-card">
          <div className="camera-header">
            <span>Camera Feed</span>
            <div className="status-indicator" style={{ color: statusColor[status] }}>
              <span className={`status-dot ${status === 'active' ? 'pulse' : ''}`}
                style={{ background: statusColor[status] }}/>
              {status}
            </div>
          </div>
          {active ? (
            <div className="webcam-wrapper">
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="webcam-feed"
                videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
              />
              {fallAlert && !iAmOk && (
                <div className="fall-overlay-badge">⚠️ FALL DETECTED</div>
              )}
            </div>
          ) : (
            <div className="camera-placeholder">
              <Camera size={56} color="var(--text-muted)" />
              <p>Click "Start Monitoring" to begin</p>
              <p className="camera-hint">Camera will detect emotions and falls automatically</p>
            </div>
          )}
        </div>

        {/* Right panels */}
        <div className="side-panels">
          {/* Emotion */}
          <div className="card emotion-panel">
            <h3>Detected Emotion</h3>
            <div className="emotion-display" style={{ color: EMOTION_COLOR[emotion.emotion] }}>
              <div className="emotion-emoji-big">{EMOTION_EMOJI[emotion.emotion] || '😐'}</div>
              <div className="emotion-big">{emotion.emotion}</div>
              {emotion.confidence > 0 && (
                <>
                  <div className="confidence-bar">
                    <div className="confidence-fill"
                      style={{ width: `${emotion.confidence}%`, background: EMOTION_COLOR[emotion.emotion] }} />
                  </div>
                  <div className="confidence-label">{emotion.confidence?.toFixed(1)}% confidence</div>
                </>
              )}
              {emotion.emotion === 'undetected' && (
                <div className="confidence-label">Position your face in the camera</div>
              )}
            </div>
          </div>

          {/* Fall Detection Status */}
          <div className={`card fall-status-card ${fallAlert && !iAmOk ? 'fall-active' : ''}`}>
            <h3><ShieldAlert size={16}/> Fall Detection</h3>
            {!active ? (
              <div className="fall-status-idle">Start monitoring to enable fall detection</div>
            ) : fallAlert && !iAmOk ? (
              <div className="fall-status-alert">
                <div className="fall-status-icon">🚨</div>
                <div>Fall detected! Caregiver notified.</div>
                <button className="btn fall-ok-btn-sm" onClick={() => setIAmOk(true)}>✅ I'm Okay</button>
              </div>
            ) : (
              <div className="fall-status-ok">
                <div className="fall-status-icon">🛡️</div>
                <div>Monitoring — no fall detected</div>
              </div>
            )}
          </div>

          {/* Live Vitals */}
          {vitals && (
            <div className="card vitals-mini">
              <h3>
                <Activity size={16}/> Live Vitals
                {vitals.source === 'fitbit'
                  ? <span className="source-badge fitbit-badge">📡 Fitbit</span>
                  : vitals.source === 'no_device'
                  ? <span className="source-badge nodev-badge">No Device</span>
                  : null
                }
              </h3>
              <div className="mini-vitals">
                <div className="mini-vital"><span>❤️ Heart Rate</span><strong>{vitals.heart_rate ?? '—'}{vitals.heart_rate ? ' bpm' : ''}</strong></div>
                <div className="mini-vital"><span>💨 SpO2</span><strong>{vitals.spo2 ?? '—'}{vitals.spo2 ? '%' : ''}</strong></div>
                <div className="mini-vital"><span>🌡️ Temp</span><strong>{vitals.temperature ?? '—'}{vitals.temperature ? '°C' : ''}</strong></div>
                <div className="mini-vital"><span>🩸 Blood Pressure</span><strong>{vitals.bp_sys && vitals.bp_dia ? `${vitals.bp_sys}/${vitals.bp_dia}` : '—'}</strong></div>
                <div className="mini-vital"><span>👟 Steps Today</span><strong>{vitals.steps?.toLocaleString() ?? '—'}</strong></div>
                <div className="mini-vital"><span>🌙 Sleep</span><strong>{vitals.sleep_hours ? `${vitals.sleep_hours}h` : '—'}</strong></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
