/**
 * SOS Button — always visible floating button.
 * One tap → sends SMS to caregiver + logs critical alert.
 * Designed for elderly users: huge, red, impossible to miss.
 */
import { useState } from 'react'
import api from '../api'
import './SOSButton.css'

export default function SOSButton() {
  const [state, setState] = useState('idle') // idle | confirming | sending | sent | error

  const handlePress = () => {
    if (state === 'idle') {
      setState('confirming')
      // Auto-confirm after 3 seconds if no cancel
      setTimeout(() => {
        setState(s => s === 'confirming' ? 'auto-send' : s)
      }, 3000)
    }
  }

  const confirm = async () => {
    setState('sending')
    try {
      await api.post('/sos')
      setState('sent')
      setTimeout(() => setState('idle'), 5000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const cancel = () => setState('idle')

  // Auto-send triggered
  if (state === 'auto-send') {
    confirm()
    return null
  }

  return (
    <>
      {/* Main SOS button — always visible bottom-right */}
      {state === 'idle' && (
        <button className="sos-float" onClick={handlePress} aria-label="SOS Emergency">
          <span className="sos-icon">🆘</span>
          <span className="sos-label">SOS</span>
        </button>
      )}

      {/* Confirmation overlay */}
      {state === 'confirming' && (
        <div className="sos-overlay">
          <div className="sos-confirm-card">
            <div className="sos-confirm-icon">🚨</div>
            <h2>Send Emergency Alert?</h2>
            <p>Your caregiver will be notified immediately by SMS.</p>
            <p className="sos-auto-note">Sending automatically in 3 seconds...</p>
            <div className="sos-confirm-btns">
              <button className="btn sos-yes-btn" onClick={confirm}>
                ✅ Yes, Send Alert
              </button>
              <button className="btn sos-no-btn" onClick={cancel}>
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sending state */}
      {state === 'sending' && (
        <div className="sos-overlay">
          <div className="sos-confirm-card">
            <div className="sos-confirm-icon spin">📡</div>
            <h2>Sending Alert...</h2>
            <p>Notifying your caregiver now.</p>
          </div>
        </div>
      )}

      {/* Sent confirmation */}
      {state === 'sent' && (
        <div className="sos-overlay">
          <div className="sos-confirm-card sos-success">
            <div className="sos-confirm-icon">✅</div>
            <h2>Alert Sent!</h2>
            <p>Your caregiver has been notified. Help is on the way.</p>
            <p className="sos-auto-note">This will close automatically.</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {state === 'error' && (
        <div className="sos-overlay">
          <div className="sos-confirm-card sos-error">
            <div className="sos-confirm-icon">⚠️</div>
            <h2>Could Not Send</h2>
            <p>Please call your caregiver directly.</p>
            <button className="btn sos-no-btn" onClick={cancel}>Close</button>
          </div>
        </div>
      )}
    </>
  )
}
