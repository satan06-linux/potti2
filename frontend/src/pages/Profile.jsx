import { useState, useEffect } from 'react'
import { User, Save, Shield, Watch, CheckCircle, XCircle } from 'lucide-react'
import api from '../api'
import './Profile.css'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({})
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fitbitConnected, setFitbitConnected] = useState(false)
  const [fitbitLoading, setFitbitLoading] = useState(false)

  useEffect(() => {
    api.get('/profile').then(r => {
      setProfile(r.data)
      setForm(r.data)
    }).finally(() => setLoading(false))

    api.get('/fitbit/status').then(r => setFitbitConnected(r.data.connected)).catch(() => {})

    const onMessage = (e) => {
      if (e.data === 'fitbit_connected') {
        setFitbitConnected(true)
        setFitbitLoading(false)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const save = async (e) => {
    e.preventDefault()
    await api.put('/profile', form)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const connectFitbit = async () => {
    setFitbitLoading(true)
    try {
      const res = await api.get('/fitbit/connect')
      window.open(res.data.auth_url, 'fitbit_auth', 'width=600,height=700,scrollbars=yes')
    } catch {
      setFitbitLoading(false)
    }
  }

  const disconnectFitbit = async () => {
    await api.post('/fitbit/disconnect')
    setFitbitConnected(false)
  }

  if (loading) return <div className="loading-state">Loading profile...</div>

  return (
    <div className="profile-page fade-in">
      <div className="page-header">
        <div>
          <h1>User Profile</h1>
          <p className="subtitle">Personal info, medical history & preferences</p>
        </div>
      </div>

      {/* ── Fitbit Banner — always visible at top ── */}
      <div className={`card fitbit-banner ${fitbitConnected ? 'fitbit-banner-on' : 'fitbit-banner-off'}`}>
        <div className="fitbit-banner-left">
          <Watch size={28} color={fitbitConnected ? '#10b981' : '#00B0B9'} />
          <div>
            <div className="fitbit-banner-title">Fitbit Wearable Integration</div>
            <div className="fitbit-banner-sub">
              {fitbitConnected
                ? 'Live data active — heart rate, steps, sleep & SpO2 syncing from your device'
                : 'Connect your Fitbit to stream real health data into the dashboard'}
            </div>
          </div>
        </div>
        <div className="fitbit-banner-right">
          {fitbitConnected ? (
            <>
              <span className="fitbit-status-pill connected"><CheckCircle size={14}/> Connected</span>
              <button className="btn btn-ghost fitbit-action-btn" onClick={disconnectFitbit}>
                Disconnect
              </button>
            </>
          ) : (
            <>
              <span className="fitbit-status-pill disconnected"><XCircle size={14}/> Not connected</span>
              <button
                className="btn btn-primary fitbit-action-btn"
                onClick={connectFitbit}
                disabled={fitbitLoading}
              >
                {fitbitLoading ? 'Opening...' : '🔗 Connect Fitbit'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="profile-layout">
        {/* Sidebar */}
        <div className="profile-sidebar">
          <div className="card profile-avatar-card">
            <div className="profile-avatar">{profile?.full_name?.[0] || 'U'}</div>
            <div className="profile-name">{profile?.full_name || 'User'}</div>
            <div className="profile-username">@{profile?.username}</div>
            <div className="profile-since">Member since {new Date(profile?.created_at).toLocaleDateString()}</div>
          </div>
          <div className="card privacy-card">
            <Shield size={20} color="var(--accent-green)"/>
            <div>
              <div className="privacy-title">Privacy Protected</div>
              <div className="privacy-sub">Data processed locally. Encrypted at rest.</div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form className="profile-form" onSubmit={save}>
          <div className="card form-section">
            <h3><User size={16}/> Personal Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name</label>
                <input value={form.full_name || ''} onChange={e => setForm({...form, full_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Age</label>
                <input type="number" value={form.age || ''} onChange={e => setForm({...form, age: e.target.value})} min={18} max={120} />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select value={form.gender || 'male'} onChange={e => setForm({...form, gender: e.target.value})}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Preferred Language</label>
                <select value={form.language || 'en'} onChange={e => setForm({...form, language: e.target.value})}>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="te">Telugu</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card form-section">
            <h3>Medical History</h3>
            <textarea
              rows={4}
              placeholder="Enter any relevant medical conditions, allergies, or history..."
              value={form.medical_history || ''}
              onChange={e => setForm({...form, medical_history: e.target.value})}
            />
          </div>

          <div className="card form-section">
            <h3>Preferences</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Reminder Frequency</label>
                <select>
                  <option>Every 2 hours</option>
                  <option>Every 4 hours</option>
                  <option>Custom</option>
                </select>
              </div>
              <div className="form-group">
                <label>Alert Mode</label>
                <select>
                  <option>Sound + Visual</option>
                  <option>Visual only</option>
                  <option>Email only</option>
                </select>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary save-btn">
            <Save size={18}/> {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
