import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Heart, Eye, EyeOff } from 'lucide-react'
import './Login.css'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', password: '', full_name: '', age: 70, gender: 'male', language: 'en' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const handle = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      if (mode === 'login') await login(form.username, form.password)
      else await register(form)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <div className="login-page">
      {/* Theme toggle top-right */}
      <button className="theme-toggle login-theme-btn" onClick={toggle} aria-label="Toggle theme">
        <div className="theme-toggle-thumb">{theme === 'dark' ? '🌙' : '☀️'}</div>
      </button>

      <div className="login-card card fade-in">
        <div className="login-logo">
          <Heart size={40} color="#3b82f6" />
          <h1>ElderCare AI</h1>
          <p>Your intelligent health companion</p>
        </div>

        <div className="login-tabs">
          <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Sign In</button>
          <button className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Register</button>
        </div>

        <form onSubmit={handle} className="login-form">
          {mode === 'register' && (
            <>
              <input placeholder="Full Name" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
              <div className="row-2">
                <input type="number" placeholder="Age" value={form.age} onChange={e => setForm({...form, age: e.target.value})} min={18} max={120} />
                <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <select value={form.language} onChange={e => setForm({...form, language: e.target.value})}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="te">Telugu</option>
              </select>
            </>
          )}
          <input placeholder="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
          <div className="pw-wrap">
            <input type={showPw ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{width:'100%',justifyContent:'center'}}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
