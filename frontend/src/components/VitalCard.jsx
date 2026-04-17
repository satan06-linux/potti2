import './VitalCard.css'

export default function VitalCard({ icon, label, value, unit, status, color }) {
  const isNull = value === null || value === undefined
  const displayValue = isNull ? '—' : value
  const displayUnit  = isNull ? '' : unit
  const displayStatus = isNull ? 'no-data' : status

  return (
    <div className="vital-card card fade-in" style={{ borderColor: status === 'critical' ? 'var(--accent-red)' : undefined }}>
      <div className="vital-icon" style={{ background: `${color}22`, color }}>
        {icon}
      </div>
      <div className="vital-info">
        <div className="vital-label">{label}</div>
        <div className="vital-value" style={{ color: isNull ? 'var(--text-muted)' : undefined }}>
          {displayValue} <span className="vital-unit">{displayUnit}</span>
        </div>
      </div>
      {displayStatus && (
        <div className={`vital-status badge badge-${
          displayStatus === 'critical' ? 'high'
          : displayStatus === 'warning' ? 'medium'
          : displayStatus === 'no-data' ? 'muted'
          : 'low'
        }`}>
          {isNull ? 'no data' : status}
        </div>
      )}
    </div>
  )
}
