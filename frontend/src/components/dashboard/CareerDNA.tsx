'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface CareerDNAProps { userId: string }

interface Action { action: string; points: number; effort: string; gap_axis: string }
interface Benchmark { axis: string; user: number; avg: number; top: number; delta: number; position: string; color: string; context: string }
interface CareerPath { path: string; probability: number; timeline: string; key_requirement: string }
interface Gap { axis: string; gap: number; user: number; top_decile: number }

interface DNAData {
  full_name: string
  cohort: string
  impact_pattern: string
  seniority_level: string
  years_of_experience: number
  next_role: string
  trajectory: { trajectory: string; description: string; color: string; icon: string }
  pentagram: { scores: Record<string, number>; composite: number; cohort_avg: Record<string, number>; top_decile: Record<string, number> }
  promotion_readiness: { score: number; verdict: string; verdict_color: string; timeline: string; top_gaps: Gap[] }
  recommended_actions: Action[]
  market_position: { percentile: number; label: string }
  market_benchmarks: Benchmark[]
  career_paths: CareerPath[]
  compensation: { current_range: { low: number; high: number }; current_mid: number; next_level_range: { low: number; high: number }; currency: string; note: string }
  top_strengths: { axis: string; score: number; vs_avg: number }[]
  share_text: string
}

const IMPACT_ICONS: Record<string, string> = {
  Optimizer: '⚙️', Builder: '🏗️', Scaler: '📈', Fixer: '🔧', Strategist: '🎯',
}

const EFFORT_COLOR: Record<string, string> = {
  Low: '#10B981', Medium: '#F59E0B', High: '#EF4444',
}

const DECISION_OPTIONS = [
  { key: 'mba',                  label: 'MBA',                   icon: '🎓' },
  { key: 'startup_vs_enterprise', label: 'Startup vs Enterprise', icon: '🏢' },
  { key: 'management_path',      label: 'Management Path',       icon: '👥' },
  { key: 'ic_path',              label: 'IC Path',               icon: '⚡' },
  { key: 'move_abroad',          label: 'Move Abroad',           icon: '✈️' },
  { key: 'job_change',           label: 'Job Change',            icon: '🔄' },
]

function SectionHeader({ label }: { label: string }) {
  return (
    <p style={{
      fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)',
      letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 14px',
    }}>{label}</p>
  )
}

function RadarMini({ scores, cohortAvg }: { scores: Record<string, number>; cohortAvg: Record<string, number> }) {
  const axes = ['technical_depth', 'domain_expertise', 'impact_magnitude', 'leadership_signals', 'learning_velocity']
  const cx = 80, cy = 80, r = 60
  const angleStep = (2 * Math.PI) / axes.length
  const toXY = (val: number, i: number) => {
    const angle = i * angleStep - Math.PI / 2
    const scaled = (val / 100) * r
    return { x: cx + scaled * Math.cos(angle), y: cy + scaled * Math.sin(angle) }
  }
  const userPts = axes.map((ax, i) => toXY(scores[ax] ?? 0, i))
  const avgPts  = axes.map((ax, i) => toXY(cohortAvg[ax] ?? 50, i))
  const toPath  = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      {[25, 50, 75, 100].map(pct => (
        <polygon key={pct}
          points={axes.map((_, i) => { const p = toXY(pct, i); return `${p.x},${p.y}` }).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      {axes.map((_, i) => { const o = toXY(100, i); return <line key={i} x1={cx} y1={cy} x2={o.x} y2={o.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" /> })}
      <path d={toPath(avgPts)} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <path d={toPath(userPts)} fill="rgba(16,185,129,0.15)" stroke={TEAL} strokeWidth="1.5" />
      {userPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={TEAL} />)}
    </svg>
  )
}

function ReadinessMeter({ score, color }: { score: number; color: string }) {
  const c = 2 * Math.PI * 36
  return (
    <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${(score / 100) * c} ${c}`}
          strokeLinecap="round" transform="rotate(-90 40 40)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>/100</span>
      </div>
    </div>
  )
}

function DecisionResult({ result, onClose }: { result: Record<string, unknown>; onClose: () => void }) {
  const rec     = result.recommendation as string
  const conf    = result.confidence as number
  const summary = result.summary as string

  const recColor = ['Yes', 'Startup', 'Management', 'Change now'].includes(rec) ? TEAL
    : ['No', 'Stay 12+ months'].includes(rec) ? '#EF4444' : '#F59E0B'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem',
    }}>
      <div style={{
        background: '#1a2030', border: `1px solid ${BORDER}`, borderRadius: '16px',
        padding: '2rem', maxWidth: '720px', width: '100%', maxHeight: '85vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', margin: '0 0 6px' }}>
              CAREER DECISION ANALYSIS
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: recColor }}>{rec}</span>
              <span style={{
                fontSize: '11px', padding: '3px 8px', borderRadius: '999px',
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
              }}>{conf}% confidence</span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
            fontSize: '18px', cursor: 'pointer', padding: '4px',
          }}>✕</button>
        </div>

        {/* Summary */}
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: '0 0 20px' }}>
          {summary}
        </p>

        {/* Detail grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {Object.entries(result).map(([key, val]) => {
            if (['recommendation', 'confidence', 'summary', 'decision_type'].includes(key)) return null

            if (typeof val === 'string') return (
              <div key={key} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 4px' }}>
                  {key.replace(/_/g, ' ').toUpperCase()}
                </p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>{val}</p>
              </div>
            )

            if (Array.isArray(val)) return (
              <div key={key} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                  {key.replace(/_/g, ' ').toUpperCase()}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(val as string[]).map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                      <span style={{ color: TEAL, flexShrink: 0 }}>→</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )

            if (typeof val === 'number') return (
              <div key={key} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 4px' }}>
                  {key.replace(/_/g, ' ').toUpperCase()}
                </p>
                <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', marginTop: '4px' }}>
                  <div style={{ height: '4px', borderRadius: '999px', width: `${val}%`, background: TEAL }} />
                </div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '3px 0 0' }}>{val}/100</p>
              </div>
            )

            return null
          })}
        </div>
      </div>
    </div>
  )
}

export default function CareerDNA({ userId }: CareerDNAProps) {
  const [data, setData]             = useState<DNAData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [copied, setCopied]         = useState(false)
  const [decisionLoading, setDecisionLoading] = useState<string | null>(null)
  const [decisionResult, setDecisionResult]   = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/career-dna/${userId}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const handleShare = () => {
    if (!data) return
    navigator.clipboard.writeText(data.share_text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleDecision = async (key: string) => {
    setDecisionLoading(key)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/career-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, decision_type: key }),
      })
      const result = await res.json()
      setDecisionResult(result)
    } catch {}
    setDecisionLoading(null)
  }

  if (loading) return (
    <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
      Loading your Career DNA...
    </div>
  )

  if (!data) return (
    <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
      Could not load Career DNA. Make sure your profile is complete.
    </div>
  )

  return (
    <>
      {decisionResult && (
        <DecisionResult result={decisionResult} onClose={() => setDecisionResult(null)} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* ── Section 1: Identity ── */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 6px' }}>
                CAREER DNA
              </p>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
                {data.full_name || 'Your Career Identity'}
              </h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '999px', background: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.25)' }}>
                  {data.cohort}
                </span>
                {data.impact_pattern && (
                  <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '999px', background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>
                    {IMPACT_ICONS[data.impact_pattern] || ''} {data.impact_pattern}
                  </span>
                )}
                <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '999px', background: `${data.trajectory.color}18`, color: data.trajectory.color, border: `1px solid ${data.trajectory.color}30` }}>
                  {data.trajectory.icon} {data.trajectory.trajectory}
                </span>
              </div>
            </div>
            <button onClick={handleShare} style={{
              padding: '8px 16px', borderRadius: '8px',
              background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${copied ? TEAL : BORDER}`,
              color: copied ? TEAL : 'rgba(255,255,255,0.5)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {copied ? '✓ Copied!' : '🔗 Share Career DNA'}
            </button>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '12px 0 0', lineHeight: 1.6 }}>
            {data.trajectory.description}
          </p>
        </div>

        {/* ── Section 2: Promotion Readiness ── */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
          <SectionHeader label="Promotion Readiness" />
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <ReadinessMeter score={data.promotion_readiness.score} color={data.promotion_readiness.verdict_color} />
              <div>
                <p style={{ fontSize: '16px', fontWeight: 600, color: data.promotion_readiness.verdict_color, margin: '0 0 3px' }}>
                  {data.promotion_readiness.verdict}
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 2px' }}>
                  Next role: <span style={{ color: '#fff', fontWeight: 500 }}>{data.next_role}</span>
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                  Timeline: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{data.promotion_readiness.timeline}</span>
                </p>
              </div>
            </div>

            {/* Gaps */}
            <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', margin: 0 }}>
                YOU NEED
              </p>
              {data.promotion_readiness.top_gaps.map(gap => (
                <div key={gap.axis}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{gap.axis}</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Gap: {gap.gap} pts</span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{
                      height: '4px', borderRadius: '999px',
                      width: `${Math.min(100, (gap.user / gap.top_decile) * 100)}%`,
                      background: data.promotion_readiness.verdict_color,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 3: Recommended Actions ── */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
          <SectionHeader label="Recommended Next Actions" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.recommended_actions.map((action, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '14px',
                padding: '12px 14px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`,
              }}>
                <span style={{
                  fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.2)',
                  minWidth: '20px', marginTop: '1px',
                }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', color: '#fff', margin: '0 0 5px', lineHeight: 1.4, fontWeight: 500 }}>
                    {action.action}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: TEAL, fontWeight: 600 }}>
                      +{action.points} readiness pts
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>·</span>
                    <span style={{ fontSize: '11px', color: EFFORT_COLOR[action.effort] }}>
                      {action.effort} effort
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>·</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                      Closes {action.gap_axis} gap
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 4: Career Paths ── */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
          <SectionHeader label="Possible Career Paths" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {data.career_paths.map((path, i) => (
              <div key={i} style={{
                padding: '14px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`,
              }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', margin: '0 0 8px', letterSpacing: '0.06em' }}>
                  PATH {String.fromCharCode(65 + i)}
                </p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: '0 0 10px', lineHeight: 1.3 }}>
                  {path.path}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Probability</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: path.probability >= 65 ? TEAL : path.probability >= 45 ? '#F59E0B' : 'rgba(255,255,255,0.4)' }}>
                    {path.probability}%
                  </span>
                </div>
                <div style={{ height: '3px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', marginBottom: '10px' }}>
                  <div style={{
                    height: '3px', borderRadius: '999px', width: `${path.probability}%`,
                    background: path.probability >= 65 ? TEAL : path.probability >= 45 ? '#F59E0B' : 'rgba(255,255,255,0.2)',
                  }} />
                </div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '0 0 4px' }}>
                  {path.timeline}
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0, lineHeight: 1.4 }}>
                  Requires: {path.key_requirement}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 5: Market Position ── */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
          <SectionHeader label={`Compared to ${data.cohort}s`} />
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>

            {/* Radar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <RadarMini scores={data.pentagram.scores} cohortAvg={data.pentagram.cohort_avg} />
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0, textAlign: 'center' }}>
                — You &nbsp;&nbsp; — Cohort avg
              </p>
            </div>

            {/* Benchmarks */}
            <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {data.market_benchmarks.map(b => (
                <div key={b.axis}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{b.axis}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: b.color }}>{b.position}</span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', marginBottom: '6px' }}>
                    <div style={{
                      height: '4px', borderRadius: '999px',
                      width: `${Math.min(100, (b.user / b.top) * 100)}%`,
                      background: b.color,
                    }} />
                  </div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0, lineHeight: 1.5 }}>
                    {b.context}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 6: Compensation ── */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
          <SectionHeader label="Market Compensation" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', margin: '0 0 6px', letterSpacing: '0.07em' }}>
                CURRENT MARKET RANGE
              </p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
                ₹{data.compensation.current_range.low}–{data.compensation.current_range.high}
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> LPA</span>
              </p>
            </div>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', margin: '0 0 6px', letterSpacing: '0.07em' }}>
                ESTIMATED POSITION
              </p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: TEAL, margin: 0 }}>
                ₹{data.compensation.current_mid}
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> LPA</span>
              </p>
            </div>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(16,185,129,0.05)', border: `1px solid rgba(16,185,129,0.15)` }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(16,185,129,0.5)', margin: '0 0 6px', letterSpacing: '0.07em' }}>
                POTENTIAL WITH PROMOTION
              </p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: TEAL, margin: 0 }}>
                ₹{data.compensation.next_level_range.low}–{data.compensation.next_level_range.high}
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> LPA</span>
              </p>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>
            ⚠ {data.compensation.note}
          </p>
        </div>

        {/* ── Section 7: Career Decisions ── */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
          <SectionHeader label="Major Career Decisions" />
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Click any decision to get a personalised analysis based on your profile.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {DECISION_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => handleDecision(opt.key)}
                disabled={decisionLoading === opt.key}
                style={{
                  padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                  background: decisionLoading === opt.key ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${decisionLoading === opt.key ? 'rgba(16,185,129,0.3)' : BORDER}`,
                  color: decisionLoading === opt.key ? TEAL : 'rgba(255,255,255,0.7)',
                  fontSize: '12px', fontWeight: 600, textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '16px' }}>{opt.icon}</span>
                <span>{decisionLoading === opt.key ? 'Analysing...' : opt.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}