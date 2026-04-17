import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Brain, Heart, AlertTriangle } from 'lucide-react'
import api from '../api'
import './EmotionInsights.css'

const EMOTION_COLORS = { happy:'#10b981', sad:'#3b82f6', angry:'#ef4444', surprised:'#f59e0b', fearful:'#8b5cf6', neutral:'#94a3b8', disgusted:'#f97316' }
const TOOLTIP_STYLE = { backgroundColor: '#1a2235', border: '1px solid #2a3a55', borderRadius: 10, color: '#f1f5f9' }

export default function EmotionInsights() {
  const [loneliness, setLoneliness] = useState(null)
  const [twin, setTwin] = useState(null)
  const [loading, setLoading] = useState(true)

  // Mock emotion timeline for demo
  const moodTimeline = [
    { time: '6am', emotion: 'neutral', score: 0 },
    { time: '8am', emotion: 'happy', score: 0.7 },
    { time: '10am', emotion: 'happy', score: 0.8 },
    { time: '12pm', emotion: 'neutral', score: 0.1 },
    { time: '2pm', emotion: 'sad', score: -0.4 },
    { time: '4pm', emotion: 'neutral', score: 0.0 },
    { time: '6pm', emotion: 'happy', score: 0.5 },
    { time: '8pm', emotion: 'neutral', score: 0.2 },
  ]

  const emotionDist = [
    { name: 'Happy', value: 35, color: '#10b981' },
    { name: 'Neutral', value: 30, color: '#94a3b8' },
    { name: 'Sad', value: 20, color: '#3b82f6' },
    { name: 'Angry', value: 8, color: '#ef4444' },
    { name: 'Fearful', value: 7, color: '#8b5cf6' },
  ]

  useEffect(() => {
    Promise.all([
      api.get('/loneliness'),
      api.get('/digital-twin')
    ]).then(([l, t]) => {
      setLoneliness(l.data)
      setTwin(t.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-state">Loading insights...</div>

  const lonelinessColor = loneliness?.level === 'high' ? '#ef4444' : loneliness?.level === 'medium' ? '#f59e0b' : '#10b981'

  return (
    <div className="emotion-page fade-in">
      <div className="page-header">
        <div>
          <h1>Emotion & Behavior Insights</h1>
          <p className="subtitle">AI-powered emotional intelligence</p>
        </div>
      </div>

      <div className="insights-grid">
        {/* Loneliness Score */}
        <div className="card loneliness-card">
          <div className="card-header"><Heart size={18} color={lonelinessColor}/> Loneliness Score</div>
          <div className="loneliness-score" style={{ color: lonelinessColor }}>
            {loneliness?.loneliness_score}
            <span>/100</span>
          </div>
          <div className={`badge badge-${loneliness?.level}`}>{loneliness?.level} loneliness</div>
          <div className="loneliness-bar">
            <div className="loneliness-fill" style={{ width: `${loneliness?.loneliness_score}%`, background: lonelinessColor }} />
          </div>
          {loneliness?.reasons?.length > 0 && (
            <div className="reasons">
              {loneliness.reasons.map((r, i) => <div key={i} className="reason-item">⚠️ {r}</div>)}
            </div>
          )}
          <div className="conv-count">
            💬 {loneliness?.conversation_count_24h} conversations in last 24h
          </div>
        </div>

        {/* Emotion Distribution */}
        <div className="card">
          <div className="card-header"><Brain size={18} color="var(--accent-purple)"/> Emotion Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={emotionDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                {emotionDist.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="emotion-legend">
            {emotionDist.map(e => (
              <div key={e.name} className="emo-legend-item">
                <div className="emo-dot" style={{ background: e.color }} />
                <span>{e.name}</span>
                <strong>{e.value}%</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Mood Timeline */}
        <div className="card chart-card-wide">
          <div className="card-header">📅 Daily Mood Timeline</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={moodTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3a55" />
              <XAxis dataKey="time" stroke="#64748b" tick={{fontSize:12}} />
              <YAxis stroke="#64748b" tick={{fontSize:12}} domain={[-1,1]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v.toFixed(2), 'Sentiment']} />
              <Bar dataKey="score" name="Mood Score" radius={[4,4,0,0]}
                fill="#3b82f6"
                label={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Digital Twin */}
        <div className="card">
          <div className="card-header"><AlertTriangle size={18} color="var(--accent-yellow)"/> Digital Twin Anomalies</div>
          <div className="anomaly-count" style={{ color: twin?.anomaly_count > 5 ? '#ef4444' : '#10b981' }}>
            {twin?.anomaly_count || 0}
          </div>
          <div className="anomaly-label">behavioral anomalies detected</div>
          {twin?.last_updated && (
            <div className="twin-updated">Last updated: {new Date(twin.last_updated).toLocaleString()}</div>
          )}
          <div className="routine-list">
            <strong>Recent Routine:</strong>
            {(twin?.routine || []).slice(-5).map((r, i) => (
              <div key={i} className="routine-item">
                <span className="routine-hour">{r.hour}:00</span>
                <span>{r.activity}</span>
                <span className="routine-emotion">{r.emotion}</span>
              </div>
            ))}
            {(!twin?.routine || twin.routine.length === 0) && <div className="no-data">No routine data yet</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
