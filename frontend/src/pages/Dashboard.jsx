import { useState, useEffect } from 'react'
import { Heart, Activity, Moon, Thermometer, Wind, Footprints, AlertTriangle, Brain, RefreshCw } from 'lucide-react'
import api from '../api'
import VitalCard from '../components/VitalCard'
import './Dashboard.css'

const EMOTION_EMOJI = { happy:'😊', sad:'😢', angry:'😠', surprised:'😲', fearful:'😨', neutral:'😐', disgusted:'🤢' }
const RISK_COLOR = { low: 'var(--accent-green)', medium: 'var(--accent-yellow)', high: 'var(--accent-red)' }

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard')
      setData(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="loading-state">Loading dashboard...</div>
  if (!data) return <div className="loading-state">Failed to load data</div>

  const { vitals, risk, loneliness, alerts, emotion } = data

  return (
    <div className="dashboard fade-in">
      <div className="page-header">
        <div>
          <h1>Health Dashboard</h1>
          <p className="subtitle">Real-time monitoring & AI insights</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchDashboard}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Status Row */}
      <div className="status-row">
        <div className="card status-card">
          <div className="status-label">Emotion Status</div>
          <div className="status-value">{EMOTION_EMOJI[emotion?.emotion] || '😐'} {emotion?.emotion || 'neutral'}</div>
          <div className="status-sub">{emotion?.confidence?.toFixed(0)}% confidence</div>
        </div>
        <div className="card status-card" style={{ borderColor: RISK_COLOR[risk?.risk_level] }}>
          <div className="status-label">Risk Score</div>
          <div className="status-value" style={{ color: RISK_COLOR[risk?.risk_level] }}>
            {risk?.risk_score?.toFixed(0)}
          </div>
          <div className={`badge badge-${risk?.risk_level}`}>{risk?.risk_level} risk</div>
        </div>
        <div className="card status-card">
          <div className="status-label">Loneliness Score</div>
          <div className="status-value">{loneliness?.loneliness_score}</div>
          <div className={`badge badge-${loneliness?.level}`}>{loneliness?.level}</div>
        </div>
        <div className="card status-card">
          <div className="status-label">Active Alerts</div>
          <div className="status-value" style={{ color: alerts?.length > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
            {alerts?.filter(a => !a.resolved).length || 0}
          </div>
          <div className="status-sub">unresolved</div>
        </div>
      </div>

      {/* Vitals Grid */}
      <h2 className="section-title">
        Live Vitals
        {vitals?.source === 'fitbit'
          ? <span className="source-badge fitbit-badge">📡 Fitbit Live</span>
          : vitals?.source === 'no_device'
          ? <span className="source-badge nodev-badge">⚠️ No Device Connected</span>
          : <span className="source-badge sim-badge">🔵 Simulated</span>
        }
      </h2>
      <div className="vitals-grid">
        <VitalCard icon={<Heart size={22}/>} label="Heart Rate" value={vitals?.heart_rate} unit="bpm" color="#ef4444"
          status={vitals?.heart_rate > 100 || vitals?.heart_rate < 55 ? 'critical' : 'normal'} />
        <VitalCard icon={<Wind size={22}/>} label="SpO2" value={vitals?.spo2} unit="%" color="#3b82f6"
          status={vitals?.spo2 < 94 ? 'critical' : 'normal'} />
        <VitalCard icon={<Activity size={22}/>} label="Blood Pressure"
          value={vitals?.bp_sys != null && vitals?.bp_dia != null ? `${vitals.bp_sys}/${vitals.bp_dia}` : null}
          unit="mmHg" color="#8b5cf6"
          status={vitals?.bp_sys > 140 ? 'warning' : 'normal'} />
        <VitalCard icon={<Thermometer size={22}/>} label="Temperature" value={vitals?.temperature} unit="°C" color="#f59e0b"
          status={vitals?.temperature > 37.8 ? 'warning' : 'normal'} />
        <VitalCard icon={<Footprints size={22}/>} label="Steps Today" value={vitals?.steps} unit="steps" color="#10b981" status="normal" />
        <VitalCard icon={<Moon size={22}/>} label="Sleep" value={vitals?.sleep_hours} unit="hrs" color="#6366f1"
          status={vitals?.sleep_hours < 5 ? 'warning' : 'normal'} />
      </div>

      {/* Risk Factors */}
      {risk?.factors?.length > 0 && (
        <div className="risk-section">
          <h2 className="section-title"><AlertTriangle size={18} color="var(--accent-yellow)" /> Risk Factors</h2>
          <div className="risk-grid">
            {risk.factors.map((f, i) => (
              <div key={i} className="card risk-item">
                <AlertTriangle size={16} color="var(--accent-yellow)" />
                <span>{f}</span>
              </div>
            ))}
          </div>
          <h3 className="section-title" style={{marginTop:16}}><Brain size={16} color="var(--accent)" /> AI Recommendations</h3>
          <div className="recommendations">
            {risk.recommendations.map((r, i) => (
              <div key={i} className="card rec-item">✅ {r}</div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      {alerts?.length > 0 && (
        <div>
          <h2 className="section-title">Recent Alerts</h2>
          <div className="alerts-list">
            {alerts.slice(0,4).map((a, i) => (
              <div key={i} className={`card alert-item alert-${a.severity}`}>
                <div className="alert-dot" />
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
