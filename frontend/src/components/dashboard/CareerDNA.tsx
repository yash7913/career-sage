'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface CareerDNAProps {
  userId: string
}

interface DNAData {
  full_name: string
  cohort: string
  impact_pattern: string
  seniority_level: string
  years_of_experience: number
  next_role: string
  trajectory: {
    trajectory: string
    description: string
    color: string
    icon: string
  }
  pentagram: {
    scores: Record<string, number>
    composite: number
    cohort_avg: Record<string, number>
    top_decile: Record<string, number>
  }
  promotion_readiness: {
    score: number
    verdict: string
    verdict_color: string
    timeline: string
    top_gaps: { axis: string; gap: number; user: number; top_decile: number }[]
  }
  market_position: {
    percentile: number
    label: string
    axes_above_avg: number
    composite_score: number
  }
  top_strengths: { axis: string; score: number; vs_avg: number }[]
  share_text: string
}

const IMPACT_ICONS: Record<string, string> = {
  Optimizer:  '⚙️',
  Builder:    '🏗️',
  Scaler:     '📈',
  Fixer:      '🔧',
  Strategist: '🎯',
}

function RadarMini({
  scores,
  cohortAvg,
}: {
  scores: Record<string, number>
  cohortAvg: Record<string, number>
}) {
  const axes = [
    'technical_depth',
    'domain_expertise',
    'impact_magnitude',
    'leadership_signals',
    'learning_velocity',
  ]
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

  const rings = [25, 50, 75, 100]

  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      {rings.map(pct => {
        const pts = axes.map((_, i) => toXY(pct, i))
        return (
          <polygon
            key={pct}
            points={pts.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        )
      })}
      {axes.map((_, i) => {
        const outer = toXY(100, i)
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={outer.x} y2={outer.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        )
      })}
      <path d={toPath(avgPts)} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <path d={toPath(userPts)} fill="rgba(16,185,129,0.15)" stroke={TEAL} strokeWidth="1.5" />
      {userPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={TEAL} />
      ))}
    </svg>
  )
}

function ReadinessMeter({
  score,
  verdict,
  color,
  timeline,
}: {
  score: number
  verdict: string
  color: string
  timeline: string
}) {
  const circumference = 2 * Math.PI * 36
  const dash = (score / 100) * circumference

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ position: 'relative', width: '88px', height: '88px', flexShrink: 0 }}>
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle
            cx="44" cy="44" r="36"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
          />
          <circle
            cx="44" cy="44" r="36"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90 44 44)"
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
            {score}
          </span>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
            / 100
          </span>
        </div>
      </div>
      <div>
        <p style={{ fontSize: '15px', fontWeight: 600, color, margin: '0 0 3px' }}>
          {verdict}
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Est. timeline: {timeline}
        </p>
      </div>
    </div>
  )
}

export default function CareerDNA({ userId }: CareerDNAProps) {
  const [data, setData]       = useState<DNAData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/career-dna/${userId}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
      Loading your Career DNA...
    </div>
  )

  if (!data) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
      Could not load Career DNA. Make sure your profile is complete.
    </div>
  )

  const handleShare = () => {
    navigator.clipboard.writeText(data.share_text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Identity card */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
        }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 6px' }}>
              CAREER DNA
            </p>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              {data.full_name || 'Your Career Identity'}
            </h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '999px',
                background: 'rgba(59,130,246,0.12)', color: '#3B82F6',
                border: '1px solid rgba(59,130,246,0.25)',
              }}>
                {data.cohort}
              </span>
              {data.impact_pattern && (
                <span style={{
                  fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '999px',
                  background: 'rgba(245,158,11,0.12)', color: '#F59E0B',
                  border: '1px solid rgba(245,158,11,0.25)',
                }}>
                  {IMPACT_ICONS[data.impact_pattern] || ''} {data.impact_pattern}
                </span>
              )}
              <span style={{
                fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '999px',
                background: `${data.trajectory.color}18`, color: data.trajectory.color,
                border: `1px solid ${data.trajectory.color}30`,
              }}>
                {data.trajectory.icon} {data.trajectory.trajectory}
              </span>
            </div>
          </div>
          <button
            onClick={handleShare}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${copied ? TEAL : BORDER}`,
              color: copied ? TEAL : 'rgba(255,255,255,0.6)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {copied ? '✓ Copied!' : '🔗 Share Career DNA'}
          </button>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '12px 0 0', lineHeight: 1.6 }}>
          {data.trajectory.description}
        </p>
      </div>

      {/* Three column row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>

        {/* Pentagram mini */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 12px' }}>
            PROFILE SCORE
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <RadarMini scores={data.pentagram.scores} cohortAvg={data.pentagram.cohort_avg} />
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
              {data.pentagram.composite}
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>/100</span>
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0, textAlign: 'center' }}>
              {data.market_position.label}
            </p>
          </div>
        </div>

        {/* Promotion readiness */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 14px' }}>
            PROMOTION READINESS
          </p>
          <ReadinessMeter
            score={data.promotion_readiness.score}
            verdict={data.promotion_readiness.verdict}
            color={data.promotion_readiness.verdict_color}
            timeline={data.promotion_readiness.timeline}
          />
          {data.promotion_readiness.top_gaps.length > 0 && (
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.promotion_readiness.top_gaps.map(gap => (
                <div key={gap.axis}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{gap.axis}</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                      {gap.user} → {gap.top_decile}
                    </span>
                  </div>
                  <div style={{ height: '3px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{
                      height: '3px', borderRadius: '999px',
                      width: `${Math.min(100, (gap.user / gap.top_decile) * 100)}%`,
                      background: data.promotion_readiness.verdict_color,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next role + strengths */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 10px' }}>
            MOST LIKELY NEXT ROLE
          </p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: '0 0 16px', lineHeight: 1.3 }}>
            {data.next_role}
          </p>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 8px' }}>
            TOP STRENGTHS
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {data.top_strengths.map((s, i) => (
              <div key={s.axis} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', minWidth: '14px' }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', flex: 1 }}>
                  {s.axis}
                </span>
                <span style={{
                  fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
                  background: 'rgba(16,185,129,0.1)', color: TEAL,
                }}>
                  {s.score}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}