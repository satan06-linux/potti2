import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Activity, Mic, BarChart2, Brain,
  Bell, Users, User, LogOut, Heart, Languages
} from 'lucide-react'
import SOSButton from './SOSButton'
import MedReminder from './MedReminder'
import './Layout.css'

const nav = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/monitor',   icon: Activity,        label: 'Live Monitor' },
  { to: '/voice',     icon: Mic,             label: 'Voice Assistant' },
  { to: '/analytics', icon: BarChart2,       label: 'Health Analytics' },
  { to: '/emotions',  icon: Brain,           label: 'Emotion Insights' },
  { to: '/alerts',    icon: Bell,            label: 'Alerts' },
  { to: '/caregiver', icon: Users,           label: 'Caregiver' },
  { to: '/profile',   icon: User,            label: 'Profile' },
]

// Inject Google Translate script once
function useGoogleTranslate() {
  useEffect(() => {
    // Add the callback function Google Translate calls
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

    // Only inject script once
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

  const handleLogout = () => { logout(); navigate('/login') }

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return (
    <div className="layout">
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <Heart size={28} color="#3b82f6" />
          <span>ElderCare AI</span>
        </div>

        {/* Theme toggle row */}
        <div className="theme-row">
          <span className="theme-label">{theme === 'dark' ? '🌙 Dark' : '☀️ Light'}</span>
          <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
            <div className="theme-toggle-thumb">
              {theme === 'dark' ? '🌙' : '☀️'}
            </div>
          </button>
        </div>

        {/* Google Translate widget */}
        <div className="translate-row">
          <Languages size={15} color="var(--text-muted)" />
          <span className="translate-label">Translate</span>
          <div id="google_translate_element" className="translate-widget" />
        </div>

        {/* Nav links */}
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

        {/* Footer */}
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

      {/* Global overlays — visible on every page */}
      <SOSButton />
      <MedReminder />
    </div>
  )
}

const nav = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/monitor',   icon: Activity,        label: 'Live Monitor' },
  { to: '/voice',     icon: Mic,             label: 'Voice Assistant' },
  { to: '/analytics', icon: BarChart2,       label: 'Health Analytics' },
  { to: '/emotions',  icon: Brain,           label: 'Emotion Insights' },
  { to: '/alerts',    icon: Bell,            label: 'Alerts' },
  { to: '/caregiver', icon: Users,           label: 'Caregiver' },
  { to: '/profile',   icon: User,            label: 'Profile' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [notifGranted, setNotifGranted] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(p => setNotifGranted(p === 'granted'))
    } else if (Notification.permission === 'granted') {
      setNotifGranted(true)
    }
  }, [])

  return (
    <div className="layout">
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <Heart size={28} color="#3b82f6" />
          <span>ElderCare AI</span>
        </div>

        {/* Theme toggle row */}
        <div className="theme-row">
          <span className="theme-label">{theme === 'dark' ? '🌙 Dark' : '☀️ Light'}</span>
          <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
            <div className="theme-toggle-thumb">
              {theme === 'dark' ? '🌙' : '☀️'}
            </div>
          </button>
        </div>

        {/* Nav links */}
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

        {/* Footer */}
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

      {/* Global overlays — visible on every page */}
      <SOSButton />
      <MedReminder />
    </div>
  )
}
