'use client'
import { useState, useEffect, useRef } from 'react'
import ProjectManager from '@/components/profile/ProjectManager'
import ProfileIntelligence from '@/components/profile/ProfileIntelligence'
import InferredSkills from '@/components/profile/InferredSkills'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'
const DIM_TEXT = 'rgba(255,255,255,0.55)'

interface CareerDNAProps {
  userId: string
  skills?: string[]
  initialSection?: string
  onSectionChange?: (section: string) => void
  data: DNAData | null
  loading: boolean
  isStale?: boolean
  onRefresh?: () => void
}

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
  work_history: {
    title: string
    company: string
    start_date: string
    end_date: string | null
    is_current: boolean
    description?: string
  }[]
  skill_categories: Record<string, string[]>
  share_text: string
}

const IMPACT_ICONS: Record<string, string> = {
  Optimizer: '⚙️', Builder: '🏗️', Scaler: '📈', Fixer: '🔧', Strategist: '🎯',
}

const COMPANY_COLOR_PALETTE = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#7F77DD', '#06B6D4', '#F97316']
function getCompanyColor(company: string): string {
  if (!company) return TEAL
  let hash = 0
  for (let i = 0; i < company.length; i++) {
    hash = company.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COMPANY_COLOR_PALETTE[Math.abs(hash) % COMPANY_COLOR_PALETTE.length]
}

const EFFORT_COLOR: Record<string, string> = {
  Low: '#10B981', Medium: '#F59E0B', High: '#EF4444',
}

const DECISION_OPTIONS = [
  { key: 'mba',                   label: 'MBA',                   icon: '🎓' },
  { key: 'startup_vs_enterprise', label: 'Startup vs Enterprise', icon: '🏢' },
  { key: 'management_path',       label: 'Management Path',       icon: '👥' },
  { key: 'ic_path',               label: 'IC Path',               icon: '⚡' },
  { key: 'move_abroad',           label: 'Move Abroad',           icon: '✈️' },
  { key: 'job_change',            label: 'Job Change',            icon: '🔄' },
  { key: 'ai_replacement',        label: 'AI & My Role',          icon: '🤖' },
]

const SUB_TABS = [
  { key: 'overview',  label: '⚡ Overview',  desc: 'Scores, readiness & top actions' },
  { key: 'journey',   label: '🗺 Journey',   desc: 'Career history, skills & projects' },
  { key: 'outlook',   label: '🔭 Outlook',   desc: 'Paths, compensation & benchmarks' },
  { key: 'decisions', label: '🧭 Decisions', desc: 'Career decisions & open Q&A' },
]

const AXIS_EXPLAINERS: Record<string, string> = {
  'Technical Depth':    'How deep your hands-on technical capability goes — tools, systems, and engineering judgment.',
  'Domain Expertise':   'Depth within your specific industry or product vertical — not just breadth across many areas.',
  'Impact Magnitude':   'Evidence of real business outcomes at scale — revenue, users, efficiency, or strategic change.',
  'Leadership Signals': 'Influence and progression evidence — managing up, cross-functional ownership, team growth.',
  'Learning Velocity':  'How fast you acquire new skills and adapt to new domains over the course of your career.',
}

function CardHeader({ label }: { label: string }) {
  return (
    <p style={{
      fontSize: '10px', fontWeight: 700, color: TEAL,
      letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 14px',
    }}>{label}</p>
  )
}

const AXES_FULL = [
  { key: 'technical_depth',    label: 'Technical Depth' },
  { key: 'domain_expertise',   label: 'Domain Expertise' },
  { key: 'impact_magnitude',   label: 'Impact Magnitude' },
  { key: 'leadership_signals', label: 'Leadership Signals' },
  { key: 'learning_velocity',  label: 'Learning Velocity' },
]
const NUM_AXES  = 5
const START_ANG = -Math.PI / 2

function toPoint(score: number, i: number, radius: number, cx: number, cy: number) {
  const angle = START_ANG + i * (2 * Math.PI / NUM_AXES)
  const r = (score / 100) * radius
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function buildPoly(scores: number[], radius: number, cx: number, cy: number) {
  return scores.map((s, i) => {
    const p = toPoint(s, i, radius, cx, cy)
    return `${p.x},${p.y}`
  }).join(' ')
}

function buildGrid(pct: number, radius: number, cx: number, cy: number) {
  return Array.from({ length: NUM_AXES }, (_, i) => {
    const angle = START_ANG + i * (2 * Math.PI / NUM_AXES)
    const r = pct * radius
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  }).join(' ')
}

function RadarMini({
  scores, cohortAvg, topDecile,
}: {
  scores: Record<string, number>
  cohortAvg: Record<string, number>
  topDecile: Record<string, number>
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const SIZE = 260
  const CX = SIZE / 2
  const CY = SIZE / 2
  const R  = SIZE * 0.35
  const LR = SIZE * 0.47

  const userScores   = AXES_FULL.map(ax => scores[ax.key]    ?? 0)
  const cohortScores = AXES_FULL.map(ax => cohortAvg[ax.key] ?? 50)
  const decileScores = AXES_FULL.map(ax => topDecile[ax.key] ?? 85)

  return (
    <div style={{ position: 'relative' }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: 'visible' }}>
        {[0.2, 0.4, 0.6, 0.8, 1.0].map(pct => (
          <polygon key={pct} points={buildGrid(pct, R, CX, CY)}
            fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
        ))}
        {AXES_FULL.map((_, i) => {
          const p = toPoint(100, i, R, CX, CY)
          return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y}
            stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
        })}
        <polygon points={buildPoly(decileScores, R, CX, CY)}
          fill="none" stroke="rgba(245,158,11,0.6)" strokeWidth="1" strokeDasharray="4 3" />
        <polygon points={buildPoly(cohortScores, R, CX, CY)}
          fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <polygon points={buildPoly(userScores, R, CX, CY)}
          fill="rgba(16,185,129,0.15)" stroke={TEAL} strokeWidth="1.5" />
        {AXES_FULL.map((ax, i) => {
          const p     = toPoint(userScores[i], i, R, CX, CY)
          const isHov = hovered === ax.key
          const angle = START_ANG + i * (2 * Math.PI / NUM_AXES)
          const lx    = CX + LR * Math.cos(angle)
          const ly    = CY + LR * Math.sin(angle)
          const words = ax.label.split(' ')
          return (
            <g key={ax.key}
              onMouseEnter={() => setHovered(ax.key)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                style={{
                  fontSize: '9px', fontFamily: 'system-ui',
                  fill: isHov ? TEAL : 'rgba(255,255,255,0.4)',
                  fontWeight: isHov ? 700 : 400, transition: 'fill 0.15s',
                }}
              >
                {words.map((w, wi) => (
                  <tspan key={wi} x={lx} dy={wi === 0 ? (words.length > 1 ? '-0.55em' : '0') : '1.1em'}>{w}</tspan>
                ))}
              </text>
              <circle cx={p.x} cy={p.y} r={isHov ? 5 : 3}
                fill={TEAL} stroke="#0d1117" strokeWidth="1.5"
                style={{ transition: 'r 0.15s' }} />
            </g>
          )
        })}
        <text x={CX} y={CY - 6} textAnchor="middle"
          style={{ fontSize: '14px', fontWeight: 700, fill: TEAL, fontFamily: 'system-ui' }}>
          {Math.round(AXES_FULL.reduce((sum, ax) => sum + (scores[ax.key] ?? 0), 0) / NUM_AXES)}
        </text>
        <text x={CX} y={CY + 8} textAnchor="middle"
          style={{ fontSize: '7px', fill: 'rgba(255,255,255,0.3)', fontFamily: 'system-ui', letterSpacing: '0.05em' }}>
          SCORE
        </text>
      </svg>

      {hovered && (() => {
        const ax        = AXES_FULL.find(a => a.key === hovered)!
        const userVal   = scores[ax.key]    ?? 0
        const cohortVal = cohortAvg[ax.key] ?? 50
        const decileVal = topDecile[ax.key] ?? 85
        const delta     = userVal - cohortVal
        return (
          <div style={{
            position: 'absolute', top: `${SIZE + 4}px`, left: 0, right: 0,
            padding: '8px 12px', borderRadius: '8px',
            background: '#161b22', border: `1px solid ${BORDER}`,
            fontSize: '12px', zIndex: 10,
          }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, margin: '0 0 5px' }}>{ax.label}</p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>You: <strong style={{ color: TEAL }}>{userVal}</strong></span>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                Cohort avg: {cohortVal}
                <span style={{ color: delta >= 0 ? TEAL : '#EF4444', marginLeft: '4px' }}>({delta >= 0 ? '+' : ''}{delta})</span>
              </span>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Top 10%: {decileVal}</span>
            </div>
          </div>
        )
      })()}

      <div style={{ display: 'flex', gap: '14px', marginTop: '8px', flexWrap: 'wrap' }}>
        {[
          { color: TEAL,                    label: 'You',        dashed: false },
          { color: 'rgba(255,255,255,0.5)', label: 'Cohort avg', dashed: false },
          { color: 'rgba(245,158,11,0.7)',  label: 'Top 10%',   dashed: true  },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="18" height="10">
              <line x1="0" y1="5" x2="18" y2="5" stroke={l.color} strokeWidth="1.5"
                strokeDasharray={l.dashed ? '4 3' : 'none'} />
            </svg>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
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
      <div className="cs-decision-modal" style={{ position: 'relative', maxWidth: '720px', width: '100%', maxHeight: '85vh' }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '-14px', right: '-14px', zIndex: 10,
          width: '32px', height: '32px', borderRadius: '50%',
          background: '#1a2030', border: `1px solid ${BORDER}`,
          color: 'rgba(255,255,255,0.6)', fontSize: '16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>✕</button>
        <div className="cs-decision-modal-inner" style={{
          background: '#1a2030', border: `1px solid ${BORDER}`, borderRadius: '16px',
          padding: '2rem', width: '100%', maxHeight: '85vh', overflowY: 'auto',
        }}>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', margin: '0 0 6px' }}>
              CAREER DECISION ANALYSIS
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: recColor }}>{rec}</span>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                {conf}% confidence
              </span>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: DIM_TEXT, lineHeight: 1.6, margin: '0 0 20px' }}>{summary}</p>
          <div className="cs-decision-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {Object.entries(result).map(([key, val]) => {
              if (['recommendation', 'confidence', 'summary', 'decision_type'].includes(key)) return null
              if (typeof val === 'string') return (
                <div key={key} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 4px' }}>
                    {key.replace(/_/g, ' ').toUpperCase()}
                  </p>
                  <p style={{ fontSize: '13px', color: DIM_TEXT, margin: 0, lineHeight: 1.5 }}>{val}</p>
                </div>
              )
              if (Array.isArray(val)) return (
                <div key={key} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                    {key.replace(/_/g, ' ').toUpperCase()}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {(val as string[]).map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: DIM_TEXT }}>
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
    </div>
  )
}

function JourneyEntry({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(-12px)',
      transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

export default function CareerDNA({ userId, skills = [], initialSection, onSectionChange, data, loading, isStale, onRefresh }: CareerDNAProps) {
  const [section, setSection] = useState<string>(
    ['overview', 'journey', 'outlook', 'decisions'].includes(initialSection ?? '')
      ? initialSection! : 'overview'
  )

  useEffect(() => {
    if (['overview', 'journey', 'outlook', 'decisions'].includes(initialSection ?? '')) {
      setSection(initialSection!)
    }
  }, [initialSection])

  const switchSection = (s: string) => {
    setSection(s)
    onSectionChange?.(s)
  }

  const [copied, setCopied]       = useState(false)
  const [decisionLoading, setDecisionLoading] = useState<string | null>(null)
  const [decisionResult, setDecisionResult]   = useState<Record<string, unknown> | null>(null)
  const [decisionError, setDecisionError]     = useState<string | null>(null)
  const [askQuestion, setAskQuestion] = useState('')
  const [askLoading, setAskLoading]   = useState(false)
  const [askResult, setAskResult]     = useState<string | null>(null)

  const ogImageUrl = `${process.env.NEXT_PUBLIC_API_URL?.includes('localhost') ? '' : ''}/api/og/career-dna/${userId}`

  const handleShare = () => {
    if (!data) return
    const fullUrl = `${window.location.origin}${ogImageUrl}`
    const shareText = `${data.share_text}\n\n${fullUrl}`
    navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleDownloadCard = async () => {
    try {
      const res = await fetch(ogImageUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'career-dna-card.png'
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch {}
  }

  const handleAsk = async () => {
    if (!askQuestion.trim()) return
    setAskLoading(true); setAskResult(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/ask-career-sage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, question: askQuestion }),
      })
      const d = await res.json()
      setAskResult(d.answer)
    } catch { setAskResult('Something went wrong. Try again.') }
    setAskLoading(false)
  }

  const handleDecision = async (key: string) => {
    setDecisionLoading(key); setDecisionError(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/career-decision`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, decision_type: key }),
      })
      if (!res.ok) throw new Error(`Analysis failed (${res.status}). Please try again.`)
      setDecisionResult(await res.json())
    } catch (e) {
      setDecisionError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    }
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

        {/* ── Identity header — always visible above all sub-tabs ── */}
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
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {isStale && (
                <button onClick={onRefresh} style={{
                  padding: '8px 14px', borderRadius: '8px',
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                  color: '#F59E0B', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                  ↻ Refresh scores
                </button>
              )}
              <button onClick={handleDownloadCard} style={{
                padding: '8px 16px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
                color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                ⬇ Download card
              </button>
              <button onClick={handleShare} style={{
                padding: '8px 16px', borderRadius: '8px',
                background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${copied ? TEAL : BORDER}`,
                color: copied ? TEAL : 'rgba(255,255,255,0.5)',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                {copied ? '✓ Link copied!' : '🔗 Share Career DNA'}
              </button>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: DIM_TEXT, margin: '12px 0 0', lineHeight: 1.6 }}>
            {data.trajectory.description}
          </p>
        </div>

        {/* ── Sub-tab switcher ── */}
        <div style={{
          display: 'flex', gap: '6px',
          background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: '12px', padding: '6px',
        }}>
          {SUB_TABS.map(s => (
            <button key={s.key} onClick={() => switchSection(s.key)} style={{
              flex: 1, padding: '10px 12px', borderRadius: '8px',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              background: section === s.key ? 'rgba(16,185,129,0.12)' : 'transparent',
              boxShadow: section === s.key ? 'inset 0 0 0 1px rgba(16,185,129,0.25)' : 'none',
              transition: 'all 0.15s',
            }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: section === s.key ? TEAL : 'rgba(255,255,255,0.5)', margin: '0 0 2px' }}>
                {s.label}
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{s.desc}</p>
            </button>
          ))}
        </div>

        {/* ══ OVERVIEW ══ */}
        {section === 'overview' && (
          <>
            {/* Pentagram — minimal scores + explainer */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
              <CardHeader label={`Career Pentagram vs ${data.cohort}s`} />
              <p style={{ fontSize: '13px', color: DIM_TEXT, margin: '0 0 16px', lineHeight: 1.6 }}>
                5 axes scored against your cohort peer group. Each axis is AI-assessed from your actual profile — not just keywords. Hover any axis to compare your score against the cohort average and top 10%.
              </p>

              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {/* Radar chart */}
                <div style={{ width: '260px', flexShrink: 0 }}>
                  <RadarMini
                    scores={data.pentagram.scores}
                    cohortAvg={data.pentagram.cohort_avg}
                    topDecile={data.pentagram.top_decile}
                  />
                </div>

                {/* Scores column — wider bars with cohort + top10% markers */}
                <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'center' }}>
                  {data.market_benchmarks.map(b => (
                    <div key={b.axis}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span
                          title={AXIS_EXPLAINERS[b.axis] || ''}
                          style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'help', borderBottom: '1px dotted rgba(255,255,255,0.25)', textDecorationStyle: 'dotted' }}
                        >{b.axis}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: b.color }}>{b.user}</span>
                          <span style={{ fontSize: '11px', color: b.color, fontWeight: 600 }}>{b.position}</span>
                        </div>
                      </div>
                      {/* Bar with cohort avg + top 10% markers */}
                      <div style={{ position: 'relative', height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)' }}>
                        {/* User fill */}
                        <div style={{
                          position: 'absolute', left: 0, top: 0, height: '6px', borderRadius: '999px',
                          width: `${b.user}%`, background: b.color, opacity: 0.85,
                        }} />
                        {/* Cohort avg marker */}
                        <div style={{
                          position: 'absolute', top: '-2px',
                          left: `${b.avg}%`, transform: 'translateX(-50%)',
                          width: '2px', height: '10px', background: 'rgba(255,255,255,0.4)', borderRadius: '1px',
                        }} />
                        {/* Top 10% marker */}
                        <div style={{
                          position: 'absolute', top: '-2px',
                          left: `${b.top}%`, transform: 'translateX(-50%)',
                          width: '2px', height: '10px', background: 'rgba(245,158,11,0.7)', borderRadius: '1px',
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>Cohort avg: {b.avg}</span>
                        <span style={{ fontSize: '10px', color: 'rgba(245,158,11,0.5)' }}>Top 10%: {b.top}</span>
                      </div>
                    </div>
                  ))}

                  {/* Dive deeper — right-aligned below scores */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button onClick={() => switchSection('outlook')} style={{
                      padding: '8px 14px', borderRadius: '8px',
                      background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                      color: TEAL, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}>
                      Dive deeper — full analysis &amp; career paths →
                    </button>
                  </div>
                </div>
              </div>

              
            </div>

            {/* Promotion Readiness */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
              <CardHeader label="Promotion Readiness" />
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <ReadinessMeter score={data.promotion_readiness.score} color={data.promotion_readiness.verdict_color} />
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: 600, color: data.promotion_readiness.verdict_color, margin: '0 0 3px' }}>
                      {data.promotion_readiness.verdict}
                    </p>
                    <p style={{ fontSize: '12px', color: DIM_TEXT, margin: '0 0 2px' }}>
                      Next role: <span style={{ color: '#fff', fontWeight: 500 }}>{data.next_role}</span>
                    </p>
                    <p style={{ fontSize: '12px', color: DIM_TEXT, margin: 0 }}>
                      Timeline: <span style={{ color: 'rgba(255,255,255,0.7)' }}>{data.promotion_readiness.timeline}</span>
                    </p>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', margin: 0 }}>YOU NEED</p>
                  {data.promotion_readiness.top_gaps.map(gap => (
                    <div key={gap.axis}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: DIM_TEXT }}>{gap.axis}</span>
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

            {/* Top 3 actions */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
              <CardHeader label="Recommended Next Actions" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.recommended_actions.slice(0, 3).map((action, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                    padding: '12px 14px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`,
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.2)', minWidth: '20px', marginTop: '1px' }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', color: '#fff', margin: '0 0 5px', lineHeight: 1.4, fontWeight: 500 }}>
                        {action.action}
                      </p>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: TEAL, fontWeight: 600 }}>+{action.points} readiness pts</span>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>·</span>
                        <span style={{ fontSize: '11px', color: EFFORT_COLOR[action.effort] }}>{action.effort} effort</span>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>·</span>
                        <span style={{ fontSize: '11px', color: DIM_TEXT }}>Closes {action.gap_axis} gap</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══ JOURNEY ══ */}
        {section === 'journey' && (
          <>
            {data.work_history && data.work_history.length > 0 && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <CardHeader label="Career Journey" />
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                    {data.work_history.length} roles · {data.years_of_experience} years
                  </p>
                </div>
                <div style={{ position: 'relative', maxHeight: '520px', overflowY: 'auto', paddingRight: '6px' }}>
                  {(() => {
                    const sorted = [...data.work_history].sort(
                      (a, b) => (b.start_date || '').localeCompare(a.start_date || '')
                    )
                    const clusters: typeof sorted[] = []
                    for (const role of sorted) {
                      const last = clusters[clusters.length - 1]
                      if (last && last[0].company === role.company) { last.push(role) }
                      else { clusters.push([role]) }
                    }
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                        {clusters.map((cluster, ci) => {
                          const companyColor = getCompanyColor(cluster[0].company)
                          const isCurrentCluster = cluster[0].is_current
                          const isLastCluster = ci === clusters.length - 1
                          const clusterStartYr = cluster[cluster.length - 1].start_date?.slice(0, 4) || ''
                          const clusterEndYr = cluster[0].is_current ? 'Present' : cluster[0].end_date?.slice(0, 4) || ''
                          return (
                            <JourneyEntry key={ci} delay={ci * 100}>
                              <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '15px' }}>
                                  <div style={{
                                    width: '15px', height: '15px', borderRadius: '50%', marginTop: '2px',
                                    background: isCurrentCluster ? companyColor : `${companyColor}40`,
                                    border: `2px solid ${companyColor}`,
                                    boxShadow: isCurrentCluster ? `0 0 10px ${companyColor}80` : 'none', flexShrink: 0,
                                  }} />
                                  {!isLastCluster && <div style={{ flex: 1, width: '1px', background: `${companyColor}30`, marginTop: '6px' }} />}
                                </div>
                                <div style={{ flex: 1, paddingBottom: isLastCluster ? '0' : '6px' }}>
                                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                    <p style={{ fontSize: '14px', fontWeight: 700, color: companyColor, margin: 0 }}>{cluster[0].company}</p>
                                    <p style={{ fontSize: '11px', color: isCurrentCluster ? TEAL : 'rgba(255,255,255,0.35)', margin: 0, fontWeight: isCurrentCluster ? 600 : 400 }}>
                                      {clusterStartYr}{clusterEndYr ? ` — ${clusterEndYr}` : ''}
                                    </p>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {cluster.map((role, ri) => {
                                      const startYr = role.start_date ? role.start_date.slice(0, 4) : ''
                                      const endYr = role.is_current ? 'Present' : role.end_date ? role.end_date.slice(0, 4) : ''
                                      const duration = (() => {
                                        if (!startYr) return ''
                                        const start = parseInt(startYr)
                                        const end = role.is_current ? new Date().getFullYear() : parseInt(endYr) || new Date().getFullYear()
                                        const yrs = end - start
                                        if (yrs === 0) return '< 1 yr'
                                        return `${yrs} yr${yrs > 1 ? 's' : ''}`
                                      })()
                                      return (
                                        <div key={ri} style={{ display: 'flex', gap: '10px' }}>
                                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '6px', paddingTop: '6px' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: role.is_current ? companyColor : `${companyColor}70`, flexShrink: 0 }} />
                                          </div>
                                          <div style={{ flex: 1 }}>
                                            {ri > 0 && <p style={{ fontSize: '10px', fontWeight: 600, color: companyColor, margin: '0 0 3px', letterSpacing: '0.04em' }}>↑ PROMOTED</p>}
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                              <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: role.is_current ? '#fff' : 'rgba(255,255,255,0.75)' }}>{role.title}</p>
                                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <p style={{ fontSize: '11px', color: role.is_current ? TEAL : 'rgba(255,255,255,0.35)', margin: 0, fontWeight: role.is_current ? 600 : 400 }}>
                                                  {startYr}{endYr ? ` — ${endYr}` : ''}
                                                </p>
                                                {duration && <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>{duration}</p>}
                                              </div>
                                            </div>
                                            {role.description && (
                                              <p style={{ fontSize: '12px', color: DIM_TEXT, margin: '5px 0 0', lineHeight: 1.6 }}>{role.description}</p>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>
                            </JourneyEntry>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}

            {data.skill_categories && Object.keys(data.skill_categories).length > 0 && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <CardHeader label="Skill Profile" />
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                    {skills.length} skills across {Object.keys(data.skill_categories).length} categories
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(data.skill_categories).map(([category, categorySkills]) => (
                    <div key={category}>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', margin: '0 0 6px', textTransform: 'uppercase' }}>{category}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {(categorySkills as string[]).map((skill: string) => (
                          <span key={skill} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.08)', color: TEAL, border: '1px solid rgba(16,185,129,0.2)' }}>{skill}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
              <CardHeader label="Projects" />
              <p style={{ fontSize: '12px', color: DIM_TEXT, margin: '0 0 1rem', lineHeight: 1.5 }}>
                Case studies, PRDs, and portfolio pieces. Used to tailor your resume for each application.
              </p>
              <ProjectManager userId={userId} />
            </div>
          </>
        )}

        {/* ══ OUTLOOK ══ — always mounted, CSS hidden when inactive to prevent ProfileIntelligence/InferredSkills re-fetching */}
        <div style={{ display: section === 'outlook' ? 'flex' : 'none', flexDirection: 'column', gap: '12px' }}>
          <>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
              <CardHeader label={`Full Benchmark Analysis vs ${data.cohort}s`} />
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ width: '260px', flexShrink: 0 }}>
                  <RadarMini scores={data.pentagram.scores} cohortAvg={data.pentagram.cohort_avg} topDecile={data.pentagram.top_decile} />
                </div>
                <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {data.market_benchmarks.map(b => (
                    <div key={b.axis}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span
                          title={AXIS_EXPLAINERS[b.axis] || ''}
                          style={{ fontSize: '14px', color: '#fff', fontWeight: 600, cursor: 'help', borderBottom: '1px dotted rgba(255,255,255,0.25)' }}
                        >{b.axis}</span>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{b.user} / cohort avg {b.avg}</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: b.color }}>{b.position}</span>
                        </div>
                      </div>
                      <div style={{ position: 'relative', height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', marginBottom: '4px' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, height: '6px', borderRadius: '999px', width: `${b.user}%`, background: b.color, opacity: 0.85 }} />
                        <div style={{ position: 'absolute', top: '-2px', left: `${b.avg}%`, transform: 'translateX(-50%)', width: '2px', height: '10px', background: 'rgba(255,255,255,0.4)', borderRadius: '1px' }} />
                        <div style={{ position: 'absolute', top: '-2px', left: `${b.top}%`, transform: 'translateX(-50%)', width: '2px', height: '10px', background: 'rgba(245,158,11,0.7)', borderRadius: '1px' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>Cohort avg: {b.avg}</span>
                        <span style={{ fontSize: '10px', color: 'rgba(245,158,11,0.5)' }}>Top 10%: {b.top}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: DIM_TEXT, margin: 0, lineHeight: 1.6 }}>{b.context}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
              <CardHeader label="Profile Intelligence" />
              <ProfileIntelligence userId={userId} />
            </div>

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
              <CardHeader label="Inferred Skills" />
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', margin: '0 0 1rem', lineHeight: 1.5 }}>
                Skills evidenced in your work history but not explicitly listed. Accept ones that belong on your profile.
              </p>
              <InferredSkills userId={userId} />
            </div>

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
              <CardHeader label="Possible Career Paths" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {data.career_paths.map((path, i) => (
                  <div key={i} style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', margin: '0 0 8px', letterSpacing: '0.06em' }}>PATH {String.fromCharCode(65 + i)}</p>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: '0 0 10px', lineHeight: 1.3 }}>{path.path}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: DIM_TEXT }}>Probability</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: path.probability >= 65 ? TEAL : path.probability >= 45 ? '#F59E0B' : 'rgba(255,255,255,0.4)' }}>{path.probability}%</span>
                    </div>
                    <div style={{ height: '3px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', marginBottom: '10px' }}>
                      <div style={{ height: '3px', borderRadius: '999px', width: `${path.probability}%`, background: path.probability >= 65 ? TEAL : path.probability >= 45 ? '#F59E0B' : 'rgba(255,255,255,0.2)' }} />
                    </div>
                    <p style={{ fontSize: '11px', color: DIM_TEXT, margin: '0 0 4px' }}>{path.timeline}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.4 }}>Requires: {path.key_requirement}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
              <CardHeader label="Market Compensation" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
                <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', margin: '0 0 6px', letterSpacing: '0.07em' }}>CURRENT MARKET RANGE</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
                    ₹{data.compensation.current_range.low}–{data.compensation.current_range.high}
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> LPA</span>
                  </p>
                </div>
                <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', margin: '0 0 6px', letterSpacing: '0.07em' }}>ESTIMATED POSITION</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: TEAL, margin: 0 }}>
                    ₹{data.compensation.current_mid}
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> LPA</span>
                  </p>
                </div>
                <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(16,185,129,0.5)', margin: '0 0 6px', letterSpacing: '0.07em' }}>POTENTIAL WITH PROMOTION</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: TEAL, margin: 0 }}>
                    ₹{data.compensation.next_level_range.low}–{data.compensation.next_level_range.high}
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> LPA</span>
                  </p>
                </div>
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>⚠ {data.compensation.note}</p>
            </div>
          </>
        </div>

        {/* ══ DECISIONS ══ */}
        {section === 'decisions' && (
          <>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
              <CardHeader label="Major Career Decisions" />
              <p style={{ fontSize: '12px', color: DIM_TEXT, margin: '0 0 14px', lineHeight: 1.5 }}>
                Click any decision to get a personalised analysis based on your profile.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {DECISION_OPTIONS.map(opt => (
                  <button key={opt.key} onClick={() => handleDecision(opt.key)} disabled={decisionLoading === opt.key} style={{
                    padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                    background: decisionLoading === opt.key ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${decisionLoading === opt.key ? 'rgba(16,185,129,0.3)' : BORDER}`,
                    color: decisionLoading === opt.key ? TEAL : 'rgba(255,255,255,0.7)',
                    fontSize: '12px', fontWeight: 600, textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: '16px' }}>{opt.icon}</span>
                    <span>{decisionLoading === opt.key ? 'Analysing...' : opt.label}</span>
                  </button>
                ))}
              </div>
              {decisionError && (
                <div style={{
                  marginTop: '12px', padding: '12px 14px', borderRadius: '10px',
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                }}>
                  <p style={{ fontSize: '12px', color: '#EF4444', margin: 0 }}>⚠ {decisionError}</p>
                  <button onClick={() => setDecisionError(null)} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.6)', cursor: 'pointer', fontSize: '12px', padding: 0 }}>Dismiss</button>
                </div>
              )}
            </div>

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
              <CardHeader label="Ask Career Sage anything" />
              <p style={{ fontSize: '12px', color: DIM_TEXT, margin: '0 0 14px', lineHeight: 1.5 }}>
                Ask any career question — personalised to your profile, experience, and goals.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  value={askQuestion}
                  onChange={e => setAskQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAsk()}
                  placeholder="e.g. Am I ready for a Director role? Should I take this offer at ₹90L?"
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
                    color: '#fff', fontSize: '13px', outline: 'none', fontFamily: 'system-ui',
                  }}
                />
                <button onClick={handleAsk} disabled={askLoading || !askQuestion.trim()} style={{
                  padding: '10px 20px', borderRadius: '10px',
                  background: askQuestion.trim() ? TEAL : 'rgba(255,255,255,0.06)',
                  color: askQuestion.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                  border: 'none', fontSize: '13px', fontWeight: 600,
                  cursor: askQuestion.trim() && !askLoading ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap',
                }}>
                  {askLoading ? '...' : 'Ask →'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: askResult ? '14px' : '0' }}>
                {['Am I ready for a Director role?', 'Should I negotiate my current offer?', 'How do I close my leadership gap?', 'Is now a good time to switch jobs?'].map(q => (
                  <button key={q} onClick={() => setAskQuestion(q)} style={{
                    fontSize: '11px', padding: '4px 10px', borderRadius: '999px',
                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
                    color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                  }}>{q}</button>
                ))}
              </div>
              {askResult && (
                <div style={{ padding: '14px', borderRadius: '10px', marginTop: '4px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: TEAL, margin: '0 0 8px' }}>Career Sage</p>
                  <p style={{ fontSize: '13px', color: DIM_TEXT, margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{askResult}</p>
                  <button onClick={() => { setAskResult(null); setAskQuestion('') }} style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Ask another question →
                  </button>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </>
  )
}
