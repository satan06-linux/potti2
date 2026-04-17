import { useState, useEffect } from 'react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../api'
import './HealthAnalytics.css'

const TOOLTIP_STYLE = { backgroundColor: '#1a2235', border: '1px solid #2a3a55', borderRadius: 10, color: '#f1f5f9' }

export default function HealthAnalytics() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/vitals/history?limit=30').then(r => {
      const data = r.data.reverse().map((v, i) => ({
        ...v,
        time: new Date(v.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
        index: i + 1
      }))
      setHistory(data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-state">Loading analytics...</div>

  return (
    <div className="analytics-page fade-in">
      <div className="page-header">
        <div>
          <h1>Health Analytics</h1>
          <p className="subtitle">Trends, patterns & insights</p>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card chart-card">
          <h3>Heart Rate Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3a55" />
              <XAxis dataKey="time" stroke="#64748b" tick={{fontSize:11}} />
              <YAxis stroke="#64748b" tick={{fontSize:11}} domain={[40,130]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="heart_rate" stroke="#ef4444" fill="url(#hrGrad)" name="Heart Rate (bpm)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3>SpO2 Levels</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="spo2Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3a55" />
              <XAxis dataKey="time" stroke="#64748b" tick={{fontSize:11}} />
              <YAxis stroke="#64748b" tick={{fontSize:11}} domain={[85,100]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="spo2" stroke="#3b82f6" fill="url(#spo2Grad)" name="SpO2 (%)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3>Blood Pressure</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3a55" />
              <XAxis dataKey="time" stroke="#64748b" tick={{fontSize:11}} />
              <YAxis stroke="#64748b" tick={{fontSize:11}} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Line type="monotone" dataKey="bp_sys" stroke="#8b5cf6" name="Systolic" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="bp_dia" stroke="#a78bfa" name="Diastolic" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3>Sleep Pattern</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3a55" />
              <XAxis dataKey="time" stroke="#64748b" tick={{fontSize:11}} />
              <YAxis stroke="#64748b" tick={{fontSize:11}} domain={[0,12]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="sleep_hours" fill="#6366f1" name="Sleep (hrs)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3>Daily Steps</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3a55" />
              <XAxis dataKey="time" stroke="#64748b" tick={{fontSize:11}} />
              <YAxis stroke="#64748b" tick={{fontSize:11}} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="steps" fill="#10b981" name="Steps" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3>Temperature</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3a55" />
              <XAxis dataKey="time" stroke="#64748b" tick={{fontSize:11}} />
              <YAxis stroke="#64748b" tick={{fontSize:11}} domain={[35,40]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="temperature" stroke="#f59e0b" name="Temp (°C)" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
