'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

const STAGE_OPTIONS = [
  { value: 'seed', label: 'Seed / Early stage', desc: 'Builder environments, 0-to-1 products' },
  { value: 'growth', label: 'Series B / C — Growth', desc: 'Scaling products, rapid hiring' },
  { value: 'late', label: 'Late stage / Pre-IPO', desc: 'Large org, proven product' },
  { value: 'enterprise', label: 'Enterprise / Public', desc: 'Established company, process-driven' },
  { value: 'any', label: 'No preference', desc: 'Show all stages' },
]

export default function PreferencesPanel({ userId }: { userId: string }) {
  const [salaryTarget, setSalaryTarget] = useState('')
  const [companyStage, setCompanyStage] = useState('any')
  const [impactPattern, setImpactPattern] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/${userId}`)
      .then(r => r.json())
      .then(data => {
        setSalaryTarget(data.salary_target_lpa?.toString() || '')
        setCompanyStage(data.preferred_company_stage || 'any')
        setImpactPattern(data.impact_pattern || '')
      })
      .catch(() => {})
  }, [userId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          salary_target_lpa: salaryTarget ? parseInt(salaryTarget) : null,
          preferred_company_stage: companyStage === 'any' ? null : companyStage,
        }),
      })
      const data = await res.json()
      if (data.impact_pattern) setImpactPattern(data.impact_pattern)
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
  }

  return (
    <div>
      {impactPattern && (
        <div style={{
          padding: '10px 14px', borderRadius: '10px',
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.15)',
          marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '20px' }}>
            {impactPattern === 'Builder' ? '🏗️' :
             impactPattern === 'Scaler' ? '📈' :
             impactPattern === 'Optimizer' ? '⚙️' :
             impactPattern === 'Fixer' ? '🔧' : '🎯'}
          </span>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 700, color: TEAL, margin: '0 0 2px' }}>
              Your impact pattern: {impactPattern}
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              Career Sage uses this to weight company stage fit in your match scores.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
        <div>
          <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '5px', fontWeight: 600, letterSpacing: '0.05em' }}>
            SALARY TARGET (LPA)
          </label>
          <input
            type="number"
            value={salaryTarget}
            onChange={e => setSalaryTarget(e.target.value)}
            placeholder="e.g. 40"
            style={inputStyle}
          />
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: '4px 0 0' }}>
            Roles 30%+ below this get flagged
          </p>
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '5px', fontWeight: 600, letterSpacing: '0.05em' }}>
            PREFERRED COMPANY STAGE
          </label>
          <select
            value={companyStage}
            onChange={e => setCompanyStage(e.target.value)}
            style={{ ...inputStyle, colorScheme: 'dark' }}
          >
            {STAGE_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' }}>
        {STAGE_OPTIONS.filter(s => s.value !== 'any').map(s => (
          <div
            key={s.value}
            onClick={() => setCompanyStage(s.value)}
            style={{
              padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
              background: companyStage === s.value ? 'rgba(16,185,129,0.08)' : 'transparent',
              border: `1px solid ${companyStage === s.value ? 'rgba(16,185,129,0.25)' : BORDER}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              transition: 'all 0.15s',
            }}
          >
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: companyStage === s.value ? TEAL : 'rgba(255,255,255,0.6)', margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{s.desc}</p>
            </div>
            {companyStage === s.value && <span style={{ color: TEAL, fontSize: '14px' }}>✓</span>}
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: '9px 20px', borderRadius: '8px',
          background: saved ? 'rgba(16,185,129,0.3)' : TEAL,
          color: '#fff', border: 'none',
          fontSize: '13px', fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saved ? '✓ Preferences saved' : saving ? 'Saving...' : 'Save preferences'}
      </button>
    </div>
  )
}