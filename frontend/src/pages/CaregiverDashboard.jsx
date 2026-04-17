import { useState, useEffect } from 'react'
import { Users, TrendingUp, FileText, RefreshCw } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import api from '../api'
import './CaregiverDashboard.css'

const TOOLTIP_STYLE = { backgroundColor: '#1a2235', border: '1px solid #2a3a55', borderRadius: 10, color: '#f1f5f9' }
const RISK_COLOR = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' }

export default function CaregiverDashboard() {
  const [patients, setPatients] = useState([])
  const [selected, setSelected] = useState(null)
  const [risk, setRisk] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchPatients = async () => {
    try {
      const res = await api.get('/caregiver/patients')
      setPatients(res.data)
      if (res.data.length > 0) selectPatient(res.data[0])
    } finally { setLoading(false) }
  }

  const selectPatient = async (patient) => {
    setSelected(patient)
    try {
      const res = await api.get('/predict-risk')
      setRisk(res.data)
    } catch {}
  }

  useEffect(() => { fetchPatients() }, [])

  const radarData = risk ? [
    { subject: 'Heart', value: risk.risk_score > 50 ? 70 : 30 },
    { subject: 'Sleep', value: risk.risk_score > 40 ? 60 : 20 },
    { subject: 'Emotion', value: risk.risk_score > 30 ? 50 : 15 },
    { subject: 'Activity', value: risk.risk_score > 60 ? 80 : 25 },
    { subject: 'Vitals', value: risk.risk_score },
  ] : []

  if (loading) return <div className="loading-state">Loading caregiver view...</div>

  return (
    <div className="caregiver-page fade-in">
      <div className="page-header">
        <div>
          <h1>Caregiver Dashboard</h1>
          <p className="subtitle">Remote patient monitoring & risk management</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchPatients}><RefreshCw size={16}/> Refresh</button>
      </div>

      <div className="caregiver-layout">
        {/* Patient List */}
        <div className="patients-panel">
          <h2 className="section-title"><Users size={16}/> Patients</h2>
          {patients.map(p => (
            <div key={p.id} className={`card patient-card ${selected?.id === p.id ? 'selected' : ''}`}
              onClick={() => selectPatient(p)}>
              <div className="patient-avatar">{p.full_name?.[0] || 'P'}</div>
              <div className="patient-info">
                <div className="patient-name">{p.full_name || 'Patient'}</div>
                <div className="patient-meta">Age {p.age} · {p.gender}</div>
              </div>
              <div className={`badge badge-${p.risk_level}`}>{p.risk_level}</div>
            </div>
          ))}
          {patients.length === 0 && <div className="empty-state card">No patients found</div>}
        </div>

        {/* Patient Detail */}
        {selected && (
          <div className="patient-detail">
            <div className="card detail-header">
              <div className="detail-avatar">{selected.full_name?.[0] || 'P'}</div>
              <div>
                <h2>{selected.full_name}</h2>
                <p>Age {selected.age} · {selected.gender}</p>
              </div>
              <div className={`risk-badge-large badge-${selected.risk_level}`} style={{ color: RISK_COLOR[selected.risk_level] }}>
                Risk: {selected.risk_score?.toFixed(0)}
              </div>
            </div>

            {risk && (
              <div className="detail-grid">
                <div className="card">
                  <h3><TrendingUp size={16}/> Risk Analysis</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#2a3a55" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Radar dataKey="value" stroke={RISK_COLOR[risk.risk_level]} fill={RISK_COLOR[risk.risk_level]} fillOpacity={0.2} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="card">
                  <h3>Risk Factors</h3>
                  {risk.factors.map((f, i) => (
                    <div key={i} className="factor-item">⚠️ {f}</div>
                  ))}
                  <h3 style={{marginTop:16}}>Recommendations</h3>
                  {risk.recommendations.map((r, i) => (
                    <div key={i} className="rec-item">✅ {r}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="card report-card">
              <FileText size={20} color="var(--accent)"/>
              <div>
                <div className="report-title">Weekly Report</div>
                <div className="report-sub">Auto-generated health summary</div>
              </div>
              <button className="btn btn-primary">Download PDF</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
