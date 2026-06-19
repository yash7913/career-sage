'use client'
import { useState } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

const TRACK_COLORS = [
  { name: 'teal',   hex: '#10B981' },
  { name: 'purple', hex: '#7F77DD' },
  { name: 'blue',   hex: '#3B82F6' },
  { name: 'amber',  hex: '#F59E0B' },
  { name: 'coral',  hex: '#F97316' },
]

const FUNCTIONS = [
  { value: 'Product Management',         label: '📦 Product Management' },
  { value: 'Program Management',         label: '📋 Program Management' },
  { value: 'Data Science',               label: '📊 Data Science' },
  { value: 'Machine Learning',           label: '🤖 Machine Learning / AI' },
  { value: 'Analytics Engineering',      label: '🔧 Analytics Engineering' },
  { value: 'Software Engineering',       label: '💻 Software Engineering' },
  { value: 'Data Engineering',           label: '🗄️ Data Engineering' },
  { value: 'Engineering Management',     label: '👥 Engineering Management' },
  { value: 'Design',                     label: '🎨 Design / UX' },
  { value: 'Growth',                     label: '📈 Growth' },
  { value: 'Sales Engineering',          label: '🤝 Sales Engineering' },
  { value: 'Solutions Architecture',     label: '🏗️ Solutions Architecture' },
]

const IC_LEVELS = ['Junior', 'Mid-level', 'Senior', 'Staff', 'Principal', 'Distinguished']
const MGMT_LEVELS = ['Team Lead', 'Manager', 'Senior Manager', 'Director', 'Senior Director', 'VP', 'SVP / C-Suite']

const WORK_MODES = [
  { value: 'REMOTE',    label: '🌐 Remote' },
  { value: 'HYBRID',    label: '🏠 Hybrid' },
  { value: 'IN_OFFICE', label: '🏢 On-site' },
]

const MARKETS = [
  { value: 'India',     label: '🇮🇳 India' },
  { value: 'US',        label: '🇺🇸 US' },
  { value: 'UK',        label: '🇬🇧 UK' },
  { value: 'Singapore', label: '🇸🇬 Singapore' },
  { value: 'Canada',    label: '🇨🇦 Canada' },
  { value: 'Australia', label: '🇦🇺 Australia' },
  { value: 'UAE',       label: '🇦🇪 UAE' },
]

const COMPANY_STAGES = [
  { value: 'any',       label: 'Any stage' },
  { value: 'seed',      label: '🌱 Seed / Early' },
  { value: 'growth',    label: '📈 Series B/C' },
  { value: 'late',      label: '🦄 Late stage' },
  { value: 'enterprise',label: '🏢 Enterprise' },
]

interface TrackSetupProps {
  userId: string
  onComplete?: () => void
}

export default function TrackSetup({ userId, onComplete }: TrackSetupProps) {
  const [fn,            setFn]           = useState('Product Management')
  const [path,          setPath]         = useState<'IC' | 'Management'>('IC')
  const [level,         setLevel]        = useState('Senior')
  const [color,         setColor]        = useState('teal')
  const [targetMarkets, setTargetMarkets] = useState<string[]>(['India'])
  const [workMode,      setWorkMode]     = useState<string[]>(['REMOTE', 'HYBRID'])
  const [companyStage,  setCompanyStage] = useState('any')
  const [salaryMin,     setSalaryMin]    = useState('')
  const [salaryTarget,  setSalaryTarget] = useState('')
  const [aspirations,   setAspirations]  = useState('')
  const [personalNotes, setPersonalNotes] = useState('')
  const [saving,        setSaving]       = useState(false)
  const [done,          setDone]         = useState(false)
  const [error,         setError]        = useState('')

  // Auto-generate track name
  const trackName = `${level} ${fn}`

  const levels = path === 'IC' ? IC_LEVELS : MGMT_LEVELS

  const toggleWorkMode = (mode: string) => {
    setWorkMode(prev => prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode])
  }

  const toggleMarket = (market: string) => {
    setTargetMarkets(prev => prev.includes(market) ? prev.filter(m => m !== market) : [...prev, market])
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tracks/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:              userId,
          track_name:           trackName,
          track_color:          color,
          target_roles:         [`${level} ${fn}`, fn],
          target_seniority:     level,
          salary_min_lpa:       salaryMin ? parseInt(salaryMin) : null,
          salary_target_lpa:    salaryTarget ? parseInt(salaryTarget) : null,
          work_mode_preference: workMode,
          aspiration_skills:    aspirations.split(',').map(s => s.trim()).filter(Boolean),
          personal_notes:       personalNotes || null,
          is_default:           true,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to create track')
      }

      // Save target markets to user preferences
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:               userId,
          target_market:         targetMarkets,
          preferred_work_mode:   workMode[0]?.toLowerCase() || 'hybrid',
          preferred_company_stage: companyStage === 'any' ? null : companyStage,
          salary_target_lpa:     salaryTarget ? parseInt(salaryTarget) : null,
        }),
      })

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
      padding: '1.5rem', borderRadius: '12px', textAlign: 'center',
      background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
    }}>
      <p style={{ fontSize: '15px', fontWeight: 600, color: TEAL, margin: '0 0 4px' }}>✓ Track created</p>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '0 0 16px' }}>{trackName} is ready.</p>
      <button onClick={() => window.location.reload()} style={{
        padding: '10px 28px', borderRadius: '8px', background: TEAL,
        color: '#fff', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
      }}>
        Go to Discovery →
      </button>
    </div>
  )

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    background: '#1c2128', border: `1px solid ${BORDER}`,
    color: '#fff', fontSize: '13px', boxSizing: 'border-box' as const,
    outline: 'none', fontFamily: 'system-ui', colorScheme: 'dark' as const,
  }

  const Label = ({ text }: { text: string }) => (
    <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 7px' }}>{text}</p>
  )

  return (
    <div style={{ color: '#fff', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Track name preview */}
      <div style={{
        padding: '12px 16px', borderRadius: '10px',
        background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: '0 0 3px', letterSpacing: '0.07em' }}>TRACK NAME</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>{trackName}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {TRACK_COLORS.map(c => (
            <div key={c.name} onClick={() => setColor(c.name)} style={{
              width: '20px', height: '20px', borderRadius: '50%', background: c.hex,
              cursor: 'pointer',
              border: color === c.name ? '2px solid #fff' : '2px solid transparent',
            }} />
          ))}
        </div>
      </div>

      {/* Function */}
      <div>
        <Label text="FUNCTION" />
        <select value={fn} onChange={e => setFn(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          {FUNCTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {/* Path + Level */}
      <div>
        <Label text="CAREER PATH" />
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          {(['IC', 'Management'] as const).map(p => (
            <div key={p} onClick={() => { setPath(p); setLevel(p === 'IC' ? 'Senior' : 'Manager') }} style={{
              flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
              background: path === p ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${path === p ? TEAL : BORDER}`,
              fontSize: '12px', fontWeight: 600,
              color: path === p ? TEAL : 'rgba(255,255,255,0.5)',
            }}>
              {p === 'IC' ? '⚡ Individual Contributor' : '👥 Management'}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {levels.map(l => (
            <div key={l} onClick={() => setLevel(l)} style={{
              padding: '5px 12px', borderRadius: '999px', cursor: 'pointer',
              background: level === l ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${level === l ? 'rgba(16,185,129,0.35)' : BORDER}`,
              fontSize: '11px', fontWeight: 500,
              color: level === l ? TEAL : 'rgba(255,255,255,0.5)',
            }}>
              {l}
            </div>
          ))}
        </div>
      </div>

      {/* Target markets */}
      <div>
        <Label text="TARGET MARKETS" />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {MARKETS.map(m => (
            <div key={m.value} onClick={() => toggleMarket(m.value)} style={{
              padding: '5px 12px', borderRadius: '999px', cursor: 'pointer',
              background: targetMarkets.includes(m.value) ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${targetMarkets.includes(m.value) ? 'rgba(16,185,129,0.35)' : BORDER}`,
              fontSize: '11px', fontWeight: 500,
              color: targetMarkets.includes(m.value) ? TEAL : 'rgba(255,255,255,0.5)',
            }}>
              {m.label} {targetMarkets.includes(m.value) && '✓'}
            </div>
          ))}
        </div>
      </div>

      {/* Work mode */}
      <div>
        <Label text="WORK MODE" />
        <div style={{ display: 'flex', gap: '8px' }}>
          {WORK_MODES.map(m => (
            <div key={m.value} onClick={() => toggleWorkMode(m.value)} style={{
              flex: 1, padding: '8px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
              background: workMode.includes(m.value) ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${workMode.includes(m.value) ? TEAL : BORDER}`,
              fontSize: '11px', fontWeight: 600,
              color: workMode.includes(m.value) ? TEAL : 'rgba(255,255,255,0.5)',
            }}>
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* Company stage + Salary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <Label text="COMPANY STAGE" />
          <select value={companyStage} onChange={e => setCompanyStage(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {COMPANY_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <Label text="SALARY TARGET (LPA)" />
          <input type="number" value={salaryTarget} onChange={e => setSalaryTarget(e.target.value)}
            placeholder="e.g. 80" style={inputStyle} />
        </div>
      </div>

      {/* Aspiration skills */}
      <div>
        <Label text="SKILLS YOU WANT TO GROW INTO" />
        <input value={aspirations} onChange={e => setAspirations(e.target.value)}
          placeholder="e.g. AI product strategy, system design, executive presence"
          style={inputStyle} />
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: '4px 0 0' }}>Comma separated</p>
      </div>

      {/* Personal notes */}
      <div>
        <Label text="ANYTHING ELSE FOR THIS TRACK" />
        <textarea value={personalNotes} onChange={e => setPersonalNotes(e.target.value)}
          rows={2} placeholder="e.g. Prefer high-ownership roles. Not interested in service companies."
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {error && (
        <p style={{ fontSize: '13px', color: '#EF4444', margin: 0 }}>{error}</p>
      )}

      <button onClick={handleSave} disabled={saving} style={{
        width: '100%', padding: '12px', borderRadius: '10px',
        background: saving ? 'rgba(16,185,129,0.4)' : TEAL,
        color: '#fff', border: 'none', fontSize: '14px', fontWeight: 600,
        cursor: saving ? 'not-allowed' : 'pointer',
      }}>
        {saving ? 'Creating...' : `Create "${trackName}" track →`}
      </button>
    </div>
  )
}