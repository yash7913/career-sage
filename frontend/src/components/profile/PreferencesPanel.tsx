'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

const STAGE_OPTIONS = [
  { value: 'seed', label: '🌱 Seed / Early stage', desc: '0-to-1, builder environment' },
  { value: 'growth', label: '📈 Series B / C — Growth', desc: 'Scaling fast, rapid hiring' },
  { value: 'late', label: '🦄 Late stage / Pre-IPO', desc: 'Large org, proven product' },
  { value: 'enterprise', label: '🏢 Enterprise / Public', desc: 'Established, process-driven' },
  { value: 'any', label: '🔀 No preference', desc: 'Show all company stages' },
]

const WORK_MODE_OPTIONS = [
  { value: 'remote', label: '🌐 Remote', desc: 'Fully remote' },
  { value: 'hybrid', label: '🏠 Hybrid', desc: '2-3 days in office' },
  { value: 'onsite', label: '🏢 On-site', desc: 'Full time in office' },
  { value: 'any', label: '🔀 No preference', desc: 'Open to all' },
]

export default function PreferencesPanel({ userId }: { userId: string }) {
  const [salaryTarget, setSalaryTarget] = useState('')
  const [companyStage, setCompanyStage] = useState('any')
  const [workMode, setWorkMode] = useState('any')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/${userId}`)
      .then(r => r.json())
      .then(data => {
        setSalaryTarget(data.salary_target_lpa?.toString() || '')
        setCompanyStage(data.preferred_company_stage || 'any')
        setWorkMode(data.preferred_work_mode || 'any')
        setLocation(data.location || '')
      })
      .catch(() => {})
  }, [userId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          salary_target_lpa: salaryTarget ? parseInt(salaryTarget) : null,
          preferred_company_stage: companyStage === 'any' ? null : companyStage,
          preferred_work_mode: workMode === 'any' ? null : workMode,
          location: location || null,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${BORDER}`,
    color: '#fff', fontSize: '13px',
    boxSizing: 'border-box' as const, outline: 'none',
    fontFamily: 'system-ui',
  }

  const SectionLabel = ({ label }: { label: string }) => (
    <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 8px' }}>
      {label}
    </p>
  )

  const OptionGrid = ({ options, value, onChange }: {
    options: typeof STAGE_OPTIONS
    value: string
    onChange: (v: string) => void
  }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '1.25rem' }}>
      {options.map(o => (
        <div key={o.value} onClick={() => onChange(o.value)} style={{
          padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
          background: value === o.value ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${value === o.value ? 'rgba(16,185,129,0.3)' : BORDER}`,
          transition: 'all 0.15s',
        }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: value === o.value ? TEAL : 'rgba(255,255,255,0.6)', margin: '0 0 2px' }}>
            {o.label} {value === o.value && '✓'}
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{o.desc}</p>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      {/* Salary + Location */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.25rem' }}>
        <div>
          <SectionLabel label="SALARY TARGET (LPA)" />
          <input
            type="number" value={salaryTarget}
            onChange={e => setSalaryTarget(e.target.value)}
            placeholder="e.g. 40" style={inputStyle}
          />
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: '4px 0 0' }}>
            Roles 30%+ below this get flagged
          </p>
        </div>
        <div>
          <SectionLabel label="PREFERRED LOCATION" />
          <input
            type="text" value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Bengaluru, Mumbai, Remote"
            style={inputStyle}
          />
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: '4px 0 0' }}>
            Affects job ranking and feed sorting
          </p>
        </div>
      </div>

      {/* Company stage */}
      <SectionLabel label="PREFERRED COMPANY STAGE" />
      <OptionGrid options={STAGE_OPTIONS} value={companyStage} onChange={setCompanyStage} />

      {/* Work mode */}
      <SectionLabel label="WORK MODE" />
      <OptionGrid options={WORK_MODE_OPTIONS} value={workMode} onChange={setWorkMode} />

      <button
        onClick={handleSave} disabled={saving}
        style={{
          padding: '10px', borderRadius: '9px',
          background: saved ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg, #10B981, #059669)',
          color: '#fff', border: 'none',
          fontSize: '13px', fontWeight: 700,
          cursor: saving ? 'not-allowed' : 'pointer',
          boxShadow: saved ? 'none' : '0 4px 16px rgba(16,185,129,0.25)',
        }}
      >
        {saved ? '✓ Preferences saved' : saving ? 'Saving...' : 'Save preferences'}
      </button>
    </div>
  )
}