import './VitalCard.css'

export default function VitalCard({ icon, label, value, unit, status, color }) {
  return (
    <div className={`vital-card card fade-in`} style={{ borderColor: status === 'critical' ? 'var(--accent-red)' : undefined }}>
      <div className="vital-icon" style={{ background: `${color}22`, color }}>
        {icon}
      </div>
      <div className="vital-info">
        <div className="vital-label">{label}</div>
        <div className="vital-value">
          {value} <span className="vital-unit">{unit}</span>
        </div>
      </div>
      {status && (
        <div className={`vital-status badge badge-${status === 'critical' ? 'high' : status === 'warning' ? 'medium' : 'low'}`}>
          {status}
        </div>
      )}
    </div>
  )
}
