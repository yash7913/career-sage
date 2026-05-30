'use client'
import { useState } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

const TRACK_COLORS = [
  { name: 'teal', hex: '#10B981' },
  { name: 'purple', hex: '#7F77DD' },
  { name: 'blue', hex: '#3B82F6' },
  { name: 'amber', hex: '#F59E0B' },
  { name: 'coral', hex: '#F97316' },
]

const SENIORITY_OPTIONS = [
  'Junior', 'Mid-level', 'Senior', 'Staff / Principal', 'Director+',
]

const WORK_MODES = ['REMOTE', 'HYBRID', 'IN_OFFICE']

interface TrackSetupProps {
  userId: string
  onComplete?: () => void
}

export default function TrackSetup({ userId, onComplete }: TrackSetupProps) {
  const [trackName, setTrackName] = useState('')
  const [color, setColor] = useState('teal')
  const [targetRoles, setTargetRoles] = useState('')
  const [seniority, setSeniority] = useState('Senior')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryTarget, setSalaryTarget] = useState('')
  const [workMode, setWorkMode] = useState<string[]>(['REMOTE', 'HYBRID'])
  const [aspirations, setAspirations] = useState('')
  const [personalNotes, setPersonalNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const toggleWorkMode = (mode: string) => {
    setWorkMode(prev =>
      prev.includes(mode)
        ? prev.filter(m => m !== mode)
        : [...prev, mode]
    )
  }

  const handleSave = async () => {
    if (!trackName.trim()) {
      setError('Track name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tracks/create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            track_name: trackName.trim(),
            track_color: color,
            target_roles: targetRoles
              .split(',')
              .map(r => r.trim())
              .filter(Boolean),
            target_seniority: seniority,
            salary_min_lpa: salaryMin ? parseInt(salaryMin) : null,
            salary_target_lpa: salaryTarget ? parseInt(salaryTarget) : null,
            work_mode_preference: workMode,
            aspiration_skills: aspirations
              .split(',')
              .map(s => s.trim())
              .filter(Boolean),
            personal_notes: personalNotes,
            is_default: true,
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to create track')
      }
      setDone(true)
      onComplete?.()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (done) return (
    <div style={{
      padding: '1.5rem',
      background: 'rgba(16,185,129,0.08)',
      border: '1px solid rgba(16,185,129,0.25)',
      borderRadius: '12px',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '15px', fontWeight: 600, color: TEAL, margin: '0 0 4px' }}>
        ✓ Career track created
      </p>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
        Your {trackName} track is ready. You can add more tracks from settings.
      </p>
    </div>
  )

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${BORDER}`,
    color: '#fff',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    outline: 'none',
  }

  const labelStyle = {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    display: 'block' as const,
    marginBottom: '6px',
  }

  return (
    <div style={{ color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Track name */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Track name *</label>
        <input
          value={trackName}
          onChange={e => setTrackName(e.target.value)}
          placeholder="e.g. Product Management, Analytics, Engineering"
          style={inputStyle}
        />
      </div>

      {/* Color picker */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Track color</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          {TRACK_COLORS.map(c => (
            <button
              key={c.name}
              onClick={() => setColor(c.name)}
              style={{
                width: '28px', height: '28px',
                borderRadius: '50%',
                background: c.hex,
                border: color === c.name
                  ? '3px solid #fff'
                  : '3px solid transparent',
                cursor: 'pointer',
                transition: 'border 0.15s',
              }}
            />
          ))}
        </div>
      </div>

      {/* Target roles */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Target roles (comma separated)</label>
        <input
          value={targetRoles}
          onChange={e => setTargetRoles(e.target.value)}
          placeholder="e.g. Senior PM, Lead PM, Director of Product"
          style={inputStyle}
        />
      </div>

      {/* Seniority + Work mode */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div>
          <label style={labelStyle}>Seniority target</label>
          <select
            value={seniority}
            onChange={e => setSeniority(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {SENIORITY_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Work mode</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '4px' }}>
            {WORK_MODES.map(m => (
              <button
                key={m}
                onClick={() => toggleWorkMode(m)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${workMode.includes(m) ? 'rgba(16,185,129,0.4)' : BORDER}`,
                  background: workMode.includes(m) ? 'rgba(16,185,129,0.1)' : 'transparent',
                  color: workMode.includes(m) ? TEAL : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.15s',
                }}
              >
                {m.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Salary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div>
          <label style={labelStyle}>Minimum salary (LPA)</label>
          <input
            type="number"
            value={salaryMin}
            onChange={e => setSalaryMin(e.target.value)}
            placeholder="e.g. 30"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Target salary (LPA)</label>
          <input
            type="number"
            value={salaryTarget}
            onChange={e => setSalaryTarget(e.target.value)}
            placeholder="e.g. 50"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Aspiration skills */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Skills you want to grow into (comma separated)</label>
        <input
          value={aspirations}
          onChange={e => setAspirations(e.target.value)}
          placeholder="e.g. MLOps, RAG pipelines, stakeholder management"
          style={inputStyle}
        />
      </div>

      {/* Personal notes */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Anything else the AI should know for this track</label>
        <textarea
          value={personalNotes}
          onChange={e => setPersonalNotes(e.target.value)}
          rows={3}
          placeholder="e.g. I prefer high-ownership roles at Series B+ startups. Not interested in service companies."
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {error && (
        <p style={{ fontSize: '13px', color: 'rgba(239,68,68,0.85)', margin: '0 0 12px' }}>
          {error}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '10px',
          background: saving ? 'rgba(16,185,129,0.4)' : TEAL,
          color: '#fff',
          border: 'none',
          fontSize: '14px',
          fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {saving ? 'Creating track...' : 'Create career track →'}
      </button>
    </div>
  )
}