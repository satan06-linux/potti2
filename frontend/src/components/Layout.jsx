import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useEffect } from 'react'
import {
  LayoutDashboard, Activity, Mic, BarChart2, Brain,
  Bell, Users, User, LogOut, Heart, Languages, Video
} from 'lucide-react'
import { useParticles, useAutoTilt } from '../hooks/use3D'
import SOSButton from './SOSButton'
import MedReminder from './MedReminder'
import './Layout.css'

const nav = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/monitor',   icon: Activity,        label: 'Live Monitor' },
  { to: '/voice',     icon: Mic,             label: 'Voice Assistant' },
  { to: '/analytics', icon: BarChart2,       label: 'Health Analytics' },
  { to: '/emotions',  icon: Brain,           label: 'Emotion Insights' },
  { to: '/video',     icon: Video,           label: 'Video Analysis' },
  { to: '/alerts',    icon: Bell,            label: 'Alerts' },
  { to: '/caregiver', icon: Users,           label: 'Caregiver' },
  { to: '/profile',   icon: User,            label: 'Profile' },
]

function useGoogleTranslate() {
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: 'en,hi,te,ta,kn,ml,bn,gu,mr,pa,ur,fr,de,es,zh-CN,ja,ar',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        'google_translate_element'
      )
    }
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script')
      script.id  = 'google-translate-script'
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  useGoogleTranslate()
  useParticles()
  useAutoTilt()

  const handleLogout = () => { logout(); navigate('/login') }

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Heart size={28} color="#3b82f6" />
          <span>ElderCare AI</span>
        </div>

        <div className="theme-row">
          <span className="theme-label">{theme === 'dark' ? '🌙 Dark' : '☀️ Light'}</span>
          <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
            <div className="theme-toggle-thumb">{theme === 'dark' ? '🌙' : '☀️'}</div>
          </button>
        </div>

        {/* Google Translate */}
        <div className="translate-row">
          <Languages size={15} color="var(--text-muted)" />
          <span className="translate-label">Translate</span>
          <div id="google_translate_element" className="translate-widget" />
        </div>

        <nav className="sidebar-nav">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">{user?.full_name?.[0] || 'U'}</div>
            <div>
              <div className="user-name">{user?.full_name || 'User'}</div>
              <div className="user-role">Patient</div>
            </div>
          </div>
          <button className="btn btn-ghost logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      <SOSButton />
      <MedReminder />
    </div>
  )
}
