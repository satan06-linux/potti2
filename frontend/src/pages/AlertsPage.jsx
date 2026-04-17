import { useState, useEffect } from 'react'
import { Bell, CheckCircle, AlertTriangle, Plus, Pill, Droplets } from 'lucide-react'
import api from '../api'
import './AlertsPage.css'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [meds, setMeds] = useState([])
  const [newMed, setNewMed] = useState({ name: '', time: '' })
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    const [a, m] = await Promise.all([api.get('/alerts'), api.get('/medications')])
    setAlerts(a.data)
    setMeds(m.data)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const resolve = async (id) => {
    await api.post(`/alerts/${id}/resolve`)
    setAlerts(prev => prev.map(a => a.id === id ? {...a, resolved: 1} : a))
  }

  const addMed = async (e) => {
    e.preventDefault()
    await api.post('/medications', newMed)
    setNewMed({ name: '', time: '' })
    fetchData()
  }

  const takeMed = async (id) => {
    await api.post(`/medications/${id}/take`)
    setMeds(prev => prev.map(m => m.id === id ? {...m, taken: 1} : m))
  }

  if (loading) return <div className="loading-state">Loading alerts...</div>

  const unresolved = alerts.filter(a => !a.resolved)
  const resolved = alerts.filter(a => a.resolved)

  return (
    <div className="alerts-page fade-in">
      <div className="page-header">
        <div>
          <h1>Alerts & Notifications</h1>
          <p className="subtitle">Emergency alerts and smart reminders</p>
        </div>
        <div className="alert-counts">
          <span className="badge badge-high">{unresolved.length} active</span>
          <span className="badge badge-low">{resolved.length} resolved</span>
        </div>
      </div>

      <div className="alerts-layout">
        <div className="alerts-main">
          <h2 className="section-title"><Bell size={16}/> Active Alerts</h2>
          {unresolved.length === 0 ? (
            <div className="card empty-state">
              <CheckCircle size={40} color="var(--accent-green)" />
              <p>No active alerts — all clear!</p>
            </div>
          ) : (
            <div className="alerts-list">
              {unresolved.map(a => (
                <div key={a.id} className={`card alert-row alert-${a.severity}`}>
                  <div className="alert-icon">
                    {a.severity === 'critical' ? <AlertTriangle size={20} color="#ef4444"/> : <Bell size={20} color="#f59e0b"/>}
                  </div>
                  <div className="alert-body">
                    <div className="alert-type-label">{a.alert_type}</div>
                    <div className="alert-message">{a.message}</div>
                    <div className="alert-time">{new Date(a.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="alert-actions">
                    <span className={`badge badge-${a.severity === 'critical' ? 'high' : 'medium'}`}>{a.severity}</span>
                    <button className="btn btn-success" onClick={() => resolve(a.id)}>
                      <CheckCircle size={14}/> Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {resolved.length > 0 && (
            <>
              <h2 className="section-title" style={{marginTop:28}}>Resolved Alerts</h2>
              <div className="alerts-list resolved">
                {resolved.slice(0,5).map(a => (
                  <div key={a.id} className="card alert-row resolved-row">
                    <CheckCircle size={18} color="var(--accent-green)"/>
                    <div className="alert-body">
                      <div className="alert-type-label">{a.alert_type}</div>
                      <div className="alert-message">{a.message}</div>
                    </div>
                    <span className="badge badge-low">resolved</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="meds-panel">
          <h2 className="section-title"><Pill size={16}/> Medication Reminders</h2>
          <form className="card add-med-form" onSubmit={addMed}>
            <input placeholder="Medication name" value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})} required />
            <input type="time" value={newMed.time} onChange={e => setNewMed({...newMed, time: e.target.value})} required />
            <button type="submit" className="btn btn-primary"><Plus size={16}/> Add</button>
          </form>

          <div className="meds-list">
            {meds.map(m => (
              <div key={m.id} className={`card med-item ${m.taken ? 'taken' : ''}`}>
                <Pill size={18} color={m.taken ? 'var(--accent-green)' : 'var(--accent)'}/>
                <div className="med-info">
                  <div className="med-name">{m.medication_name}</div>
                  <div className="med-time">⏰ {m.scheduled_time}</div>
                </div>
                {!m.taken ? (
                  <button className="btn btn-success" onClick={() => takeMed(m.id)}>Taken</button>
                ) : (
                  <span className="badge badge-low">✓ Done</span>
                )}
              </div>
            ))}
            {meds.length === 0 && <div className="empty-meds">No medications scheduled</div>}
          </div>

          <div className="card hydration-reminder">
            <Droplets size={20} color="#3b82f6"/>
            <div>
              <div className="hydration-title">Hydration Reminder</div>
              <div className="hydration-sub">Drink water every 2 hours</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
