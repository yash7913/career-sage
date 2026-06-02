'use client'
import { useState } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

const STATUSES = [
  { key: 'ACTIVE', label: 'Actively looking', color: '#10B981', dot: '#10B981' },
  { key: 'OPEN', label: 'Open to opportunities', color: '#F59E0B', dot: '#F59E0B' },
  { key: 'PAUSED', label: 'Not looking', color: 'rgba(255,255,255,0.3)', dot: 'rgba(255,255,255,0.3)' },
]

export default function StatusToggle({
  userId,
  initialStatus = 'ACTIVE',
}: {
  userId: string
  initialStatus?: string
}) {
  const [status, setStatus] = useState(initialStatus)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const current = STATUSES.find(s => s.key === status) || STATUSES[0]

  const handleSelect = async (key: string) => {
    setSaving(true)
    setOpen(false)
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, search_status: key }),
        }
      )
      setStatus(key)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px', borderRadius: '999px',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${current.color}40`,
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: current.dot, flexShrink: 0,
          animation: status === 'ACTIVE' ? 'pulse 2s infinite' : 'none',
        }} />
        <span style={{ fontSize: '12px', fontWeight: 600, color: current.color }}>
          {saving ? 'Saving...' : current.label}
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '36px', left: 0,
          background: '#161b22', border: `1px solid ${BORDER}`,
          borderRadius: '12px', overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 100, minWidth: '200px',
          fontFamily: 'system-ui, sans-serif',
        }}>
          {STATUSES.map(s => (
            <button
              key={s.key}
              onClick={() => handleSelect(s.key)}
              style={{
                width: '100%', padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: '8px',
                background: s.key === status ? 'rgba(255,255,255,0.04)' : 'transparent',
                border: 'none', cursor: 'pointer',
                borderBottom: `1px solid ${BORDER}`,
                textAlign: 'left',
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: s.key === status ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: s.key === status ? 600 : 400 }}>
                {s.label}
              </span>
              {s.key === status && (
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: TEAL }}>✓</span>
              )}
            </button>
          ))}
          <div style={{ padding: '8px 14px' }}>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: 0, lineHeight: 1.5 }}>
              Active = scrape every 12hrs · Open = 24hrs · Paused = off
            </p>
          </div>
        </div>
      )}
    </div>
  )
}