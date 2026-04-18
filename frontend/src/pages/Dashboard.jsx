import { useState, useEffect } from 'react'
import { Heart, Activity, Moon, Thermometer, Wind, Footprints, AlertTriangle, Brain, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import VitalCard from '../components/VitalCard'
import './Dashboard.css'

const EMOTION_EMOJI = { happy:'😊', sad:'😢', angry:'😠', surprised:'😲', fearful:'😨', neutral:'😐', disgusted:'🤢', undetected:'🔍' }
const RISK_COLOR    = { low: 'var(--accent-green)', medium: 'var(--accent-yellow)', high: 'var(--accent-red)' }

// Friendly human-readable labels for elderly users
const RISK_LABEL    = { low: 'You are doing well', medium: 'Some attention needed', high: 'Please see a doctor' }
const LONELY_LABEL  = { low: 'Feeling connected', medium: 'Could use some company', high: 'Feeling lonely' }

export default function Dashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [time, setTime]       = useState(new Date())
  const navigate = useNavigate()

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard')
      setData(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchDashboard()
    const dataInterval = setInterval(fetchDashboard, 30000)
    const clockInterval = setInterval(() => setTime(new Date()), 1000)
    return () => { clearInterval(dataInterval); clearInterval(clockInterval) }
  }, [])

  if (loading) return <div className="loading-state">Loading your health dashboard...</div>
  if (!data)   return <div className="loading-state">Could not load data. Please refresh.</div>

  const { vitals, risk, loneliness, alerts, emotion } = data
  const greeting = time.getHours() < 12 ? 'Good Morning' : time.getHours() < 17 ? 'Good Afternoon' : 'Good Evening'

  return (
    <div className="dashboard fade-in">

      {/* Greeting header */}
      <div className="dashboard-greeting">
        <div>
          <h1>{greeting} 👋</h1>
          <p className="greeting-time">
            {time.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}
            &nbsp;·&nbsp;
            {time.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
          </p>
        </div>
        <button className="btn btn-ghost refresh-btn" onClick={fetchDashboard}>
          <RefreshCw size={16}/> Refresh
        </button>
      </div>

      {/* Quick action row — big buttons for elderly */}
      <div className="quick-actions">
        <button className="quick-btn quick-monitor" onClick={() => navigate('/monitor')}>
          <span className="quick-icon">📷</span>
          <span>Start Camera</span>
        </button>
        <button className="quick-btn quick-voice" onClick={() => navigate('/voice')}>
          <span className="quick-icon">🎙️</span>
          <span>Talk to AI</span>
        </button>
        <button className="quick-btn quick-alerts" onClick={() => navigate('/alerts')}>
          <span className="quick-icon">💊</span>
          <span>My Medicines</span>
        </button>
        <button className="quick-btn quick-caregiver" onClick={() => navigate('/caregiver')}>
          <span className="quick-icon">👨‍⚕️</span>
          <span>My Caregiver</span>
        </button>
      </div>

      {/* Status Row */}
      <div className="status-row">
        <div className="card status-card">
          <div className="status-label">How I Feel</div>
          <div className="status-value">{EMOTION_EMOJI[emotion?.emotion] || '😐'}</div>
          <div className="status-emotion-name">{emotion?.emotion || 'neutral'}</div>
        </div>
        <div className="card status-card" style={{ borderColor: RISK_COLOR[risk?.risk_level] }}>
          <div className="status-label">Health Risk</div>
          <div className="status-value" style={{ color: RISK_COLOR[risk?.risk_level] }}>
            {risk?.risk_score?.toFixed(0)}
          </div>
          <div className="status-desc" style={{ color: RISK_COLOR[risk?.risk_level] }}>
            {RISK_LABEL[risk?.risk_level] || '—'}
          </div>
        </div>
        <div className="card status-card">
          <div className="status-label">Social Wellbeing</div>
          <div className="status-value">{loneliness?.loneliness_score}</div>
          <div className="status-desc">{LONELY_LABEL[loneliness?.level] || '—'}</div>
        </div>
        <div className="card status-card">
          <div className="status-label">Active Alerts</div>
          <div className="status-value" style={{ color: alerts?.filter(a=>!a.resolved).length > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
            {alerts?.filter(a => !a.resolved).length || 0}
          </div>
          <div className="status-desc">{alerts?.filter(a=>!a.resolved).length > 0 ? 'Need attention' : 'All clear!'}</div>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="section-header">
        <h2 className="section-title">My Health Numbers</h2>
        {vitals?.source === 'fitbit'
          ? <span className="source-badge fitbit-badge">📡 Fitbit Live</span>
          : vitals?.source === 'no_device'
          ? <span className="source-badge nodev-badge">⚠️ Connect Fitbit for live data</span>
          : null
        }
      </div>
      <div className="vitals-grid">
        <VitalCard icon={<Heart size={24}/>} label="Heart Rate" value={vitals?.heart_rate} unit="bpm" color="#ef4444"
          status={vitals?.heart_rate > 100 || vitals?.heart_rate < 55 ? 'critical' : 'normal'} />
        <VitalCard icon={<Wind size={24}/>} label="Oxygen Level" value={vitals?.spo2} unit="%" color="#3b82f6"
          status={vitals?.spo2 < 94 ? 'critical' : 'normal'} />
        <VitalCard icon={<Activity size={24}/>} label="Blood Pressure"
          value={vitals?.bp_sys != null && vitals?.bp_dia != null ? `${vitals.bp_sys}/${vitals.bp_dia}` : null}
          unit="mmHg" color="#8b5cf6"
          status={vitals?.bp_sys > 140 ? 'warning' : 'normal'} />
        <VitalCard icon={<Thermometer size={24}/>} label="Body Temperature" value={vitals?.temperature} unit="°C" color="#f59e0b"
          status={vitals?.temperature > 37.8 ? 'warning' : 'normal'} />
        <VitalCard icon={<Footprints size={24}/>} label="Steps Today" value={vitals?.steps} unit="steps" color="#10b981" status="normal" />
        <VitalCard icon={<Moon size={24}/>} label="Last Night Sleep" value={vitals?.sleep_hours} unit="hrs" color="#6366f1"
          status={vitals?.sleep_hours < 5 ? 'warning' : 'normal'} />
      </div>

      {/* Risk Factors */}
      {risk?.factors?.length > 0 && (
        <div className="risk-section">
          <h2 className="section-title"><AlertTriangle size={18} color="var(--accent-yellow)"/> Things to Watch</h2>
          <div className="risk-grid">
            {risk.factors.map((f, i) => (
              <div key={i} className="card risk-item">
                <AlertTriangle size={16} color="var(--accent-yellow)"/>
                <span>{f}</span>
              </div>
            ))}
          </div>
          <h2 className="section-title" style={{marginTop:20}}><Brain size={18} color="var(--accent)"/> AI Suggestions for You</h2>
          <div className="recommendations">
            {risk.recommendations.map((r, i) => (
              <div key={i} className="card rec-item">✅ {r}</div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      {alerts?.filter(a => !a.resolved).length > 0 && (
        <div>
          <h2 className="section-title">Recent Alerts</h2>
          <div className="alerts-list">
            {alerts.filter(a=>!a.resolved).slice(0,4).map((a, i) => (
              <div key={i} className={`card alert-item alert-${a.severity}`}>
                <div className="alert-dot"/>
                <div>
                  <div className="alert-type">{a.alert_type}</div>
                  <div className="alert-msg">{a.message}</div>
                </div>
                <span className={`badge badge-${a.severity === 'critical' ? 'high' : 'medium'}`}>{a.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
