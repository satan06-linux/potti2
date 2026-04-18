import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import LiveMonitor from './pages/LiveMonitor'
import VoiceAssistant from './pages/VoiceAssistant'
import HealthAnalytics from './pages/HealthAnalytics'
import EmotionInsights from './pages/EmotionInsights'
import AlertsPage from './pages/AlertsPage'
import CaregiverDashboard from './pages/CaregiverDashboard'
import Profile from './pages/Profile'
import VideoAnalysis from './pages/VideoAnalysis'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#94a3b8',fontSize:18}}>
      Loading...
    </div>
  )
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <canvas id="particles-canvas" />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="monitor" element={<LiveMonitor />} />
              <Route path="voice" element={<VoiceAssistant />} />
              <Route path="analytics" element={<HealthAnalytics />} />
              <Route path="emotions" element={<EmotionInsights />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="caregiver" element={<CaregiverDashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="video" element={<VideoAnalysis />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
