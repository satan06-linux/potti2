import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Brain, Heart, AlertTriangle, RefreshCw } from 'lucide-react'
import api from '../api'
import './EmotionInsights.css'

const EMOTION_COLORS = { happy:'#10b981', sad:'#3b82f6', angry:'#ef4444', surprised:'#f59e0b', fearful:'#8b5cf6', neutral:'#94a3b8', disgusted:'#f97316', undetected:'#475569' }
const TOOLTIP_STYLE = { backgroundColor: '#1a2235', border: '1px solid #2a3a55', borderRadius: 10, color: '#f1f5f9' }

export default function EmotionInsights() {
  const [loneliness, setLoneliness]   = useState(null)
  const [twin, setTwin]               = useState(null)
  const [emotionDist, setEmotionDist] = useState([])
  const [moodTimeline, setMoodTimeline] = useState([])
  const [loading, setLoading]         = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [l, t, hist] = await Promise.all([
        api.get('/loneliness'),
        api.get('/digital-twin'),
        api.get('/vitals/history?limit=50'),   // reuse history endpoint for timeline
      ])
      setLoneliness(l.data)
      setTwin(t.data)

      // Build real emotion distribution from chat/voice history via loneliness reasons
      // We'll fetch emotion logs via a dedicated call if available, else derive from twin routine
      const routine = t.data?.routine || []
      const counts = {}
      routine.forEach(r => { counts[r.emotion] = (counts[r.emotion] || 0) + 1 })
      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
      const dist = Object.entries(counts).map(([name, val]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Math.round((val / total) * 100),
        color: EMOTION_COLORS[name] || '#94a3b8'
      }))
      setEmotionDist(dist.length > 0 ? dist : [{ name: 'No data', value: 100, color: '#475569' }])

      // Build mood timeline from routine hours
      const timeline = routine.slice(-8).map(r => ({
        time: `${r.hour}:00`,
        score: r.emotion === 'happy' ? 0.7 : r.emotion === 'sad' ? -0.5 : r.emotion === 'angry' ? -0.7 : r.emotion === 'fearful' ? -0.4 : 0.1,
        emotion: r.emotion
      }))
      setMoodTimeline(timeline)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  if (loading) return <div className="loading-state">Loading insights...</div>

  const lonelinessColor = loneliness?.level === 'high' ? '#ef4444' : loneliness?.level === 'medium' ? '#f59e0b' : '#10b981'

  return (
    <div className="emotion-page fade-in">
      <div className="page-header">
        <div>
          <h1>Emotion & Behavior Insights</h1>
          <p className="subtitle">AI-powered emotional intelligence</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchAll}><RefreshCw size={16}/> Refresh</button>
      </div>

      <div className="insights-grid">
        {/* Loneliness Score */}
        <div className="card loneliness-card">
          <div className="card-header"><Heart size={18} color={lonelinessColor}/> Loneliness Score</div>
          <div className="loneliness-score" style={{ color: lonelinessColor }}>
            {loneliness?.loneliness_score}<span>/100</span>
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

        {/* Emotion Distribution — real data from digital twin routine */}
        <div className="card">
          <div className="card-header"><Brain size={18} color="var(--accent-purple)"/> Emotion Distribution</div>
          {emotionDist[0]?.name === 'No data' ? (
            <div className="no-data-msg">Start using Live Monitor or Voice Assistant to build emotion history</div>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Mood Timeline — real from routine */}
        <div className="card chart-card-wide">
          <div className="card-header">📅 Daily Mood Timeline</div>
          {moodTimeline.length === 0 ? (
            <div className="no-data-msg">No mood data yet — use Live Monitor to start tracking</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={moodTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3a55" />
                <XAxis dataKey="time" stroke="#64748b" tick={{fontSize:12}} />
                <YAxis stroke="#64748b" tick={{fontSize:12}} domain={[-1,1]} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v.toFixed(2), 'Sentiment']} />
                <Bar dataKey="score" name="Mood Score" radius={[4,4,0,0]} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
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
            {(!twin?.routine || twin.routine.length === 0) && (
              <div className="no-data">No routine data yet — digital twin learns over time</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
