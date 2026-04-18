/**
 * Medication Reminder — checks every minute if any medication is due.
 * Shows a large, unmissable popup for elderly users.
 * Also fires a browser push notification.
 */
import { useState, useEffect, useRef } from 'react'
import api from '../api'
import './MedReminder.css'

export default function MedReminder() {
  const [dueMeds, setDueMeds] = useState([])
  const [dismissed, setDismissed] = useState(false)
  const notifiedRef = useRef(new Set())

  const checkMeds = async () => {
    try {
      const res = await api.get('/medications')
      const now = new Date()
      const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

      const due = res.data.filter(m => {
        if (m.taken) return false
        // Check if scheduled time matches current time (within 5 min window)
        const [mh, mm] = m.scheduled_time.split(':').map(Number)
        const medMinutes = mh * 60 + mm
        const nowMinutes = now.getHours() * 60 + now.getMinutes()
        return Math.abs(medMinutes - nowMinutes) <= 5
      })

      if (due.length > 0) {
        setDueMeds(due)
        setDismissed(false)

        // Browser push notification for each new due med
        due.forEach(m => {
          if (!notifiedRef.current.has(m.id) && Notification.permission === 'granted') {
            new Notification('💊 Medication Reminder', {
              body: `Time to take ${m.medication_name}`,
              icon: '/favicon.svg',
              tag: `med-${m.id}`,
            })
            notifiedRef.current.add(m.id)
          }
        })
      }
    } catch {}
  }

  useEffect(() => {
    checkMeds()
    const interval = setInterval(checkMeds, 60000) // check every minute
    return () => clearInterval(interval)
  }, [])

  const takeMed = async (id) => {
    await api.post(`/medications/${id}/take`)
    setDueMeds(prev => prev.filter(m => m.id !== id))
    notifiedRef.current.delete(id)
  }

  const dismiss = () => setDismissed(true)

  if (dueMeds.length === 0 || dismissed) return null

  return (
    <div className="med-reminder-overlay">
      <div className="med-reminder-card">
        <div className="med-reminder-icon">💊</div>
        <h2>Time for Your Medicine!</h2>
        <p>Please take the following medication{dueMeds.length > 1 ? 's' : ''} now:</p>

        <div className="med-reminder-list">
          {dueMeds.map(m => (
            <div key={m.id} className="med-reminder-item">
              <div className="med-reminder-name">{m.medication_name}</div>
              <div className="med-reminder-time">⏰ {m.scheduled_time}</div>
              <button className="btn med-taken-btn" onClick={() => takeMed(m.id)}>
                ✅ I Took It
              </button>
            </div>
          ))}
        </div>

        <button className="btn med-dismiss-btn" onClick={dismiss}>
          Remind Me Later
        </button>
      </div>
    </div>
  )
}
