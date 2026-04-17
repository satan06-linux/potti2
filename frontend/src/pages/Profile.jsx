import { useState, useEffect } from 'react'
import { User, Save, Shield } from 'lucide-react'
import api from '../api'
import './Profile.css'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({})
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/profile').then(r => {
      setProfile(r.data)
      setForm(r.data)
    }).finally(() => setLoading(false))
  }, [])

  const save = async (e) => {
    e.preventDefault()
    await api.put('/profile', form)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
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

      <div className="profile-layout">
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
