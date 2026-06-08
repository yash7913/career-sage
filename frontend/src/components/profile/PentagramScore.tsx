'use client'
import { useState, useEffect, useRef } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

interface PentagramScores {
  technical_depth: number
  domain_expertise: number
  impact_magnitude: number
  leadership_signals: number
  learning_velocity: number
}

interface PentagramProps {
  userId: string
  size?: number
  variant?: 'full' | 'mini'
}

const AXES = [
  { key: 'technical_depth', label: 'Technical\nDepth' },
  { key: 'domain_expertise', label: 'Domain\nExpertise' },
  { key: 'impact_magnitude', label: 'Impact\nMagnitude' },
  { key: 'leadership_signals', label: 'Leadership\nSignals' },
  { key: 'learning_velocity', label: 'Learning\nVelocity' },
]

const NUM_AXES = 5
const START_ANGLE = -Math.PI / 2

function scoreToPoint(score: number, axisIndex: number, radius: number, center: number) {
  const angle = START_ANGLE + axisIndex * (2 * Math.PI / NUM_AXES)
  const r = (score / 100) * radius
  return {
    x: center + r * Math.cos(angle),
    y: center + r * Math.sin(angle),
  }
}

function buildPolygon(scores: number[], radius: number, center: number): string {
  return scores.map((score, i) => {
    const pt = scoreToPoint(score, i, radius, center)
    return `${pt.x},${pt.y}`
  }).join(' ')
}

function buildGridPentagon(pct: number, radius: number, center: number): string {
  return Array.from({ length: NUM_AXES }, (_, i) => {
    const angle = START_ANGLE + i * (2 * Math.PI / NUM_AXES)
    const r = pct * radius
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`
  }).join(' ')
}

export default function PentagramScore({ userId, size = 300, variant = 'full' }: PentagramProps) {
  const [data, setData] = useState<{
    user_scores: PentagramScores
    cohort_average: PentagramScores
    top_decile: PentagramScores
    composite_score: number
    cohort: string
    user_percentile: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null)
  const [animated, setAnimated] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/pentagram/${userId}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        setLoading(false)
        setTimeout(() => setAnimated(true), 100)
      })
      .catch(() => setLoading(false))
  }, [userId])

  if (loading) return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Computing scores...</p>
    </div>
  )

  if (!data) return null

  const CENTER = size / 2
  const RADIUS = size * 0.35
  const LABEL_RADIUS = size * 0.46

  const userScores = AXES.map(ax => data.user_scores[ax.key as keyof PentagramScores])
  const cohortScores = AXES.map(ax => data.cohort_average[ax.key as keyof PentagramScores])
  const decileScores = AXES.map(ax => data.top_decile[ax.key as keyof PentagramScores])

  const animatedScores = animated ? userScores : userScores.map(() => 0)

  if (variant === 'mini') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[0.2, 0.4, 0.6, 0.8, 1.0].map(pct => (
          <polygon key={pct}
            points={buildGridPentagon(pct, RADIUS, CENTER)}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
        ))}
        <polygon
          points={buildPolygon(userScores, RADIUS, CENTER)}
          fill={`${TEAL}30`} stroke={TEAL} strokeWidth="1.5" />
      </svg>
    )
  }

  return (
    <div>
      <svg
        ref={svgRef}
        width={size} height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: 'visible' }}
      >
        {/* Grid rings */}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map(pct => (
          <polygon key={pct}
            points={buildGridPentagon(pct, RADIUS, CENTER)}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.5" />
        ))}

        {/* Grid axes */}
        {AXES.map((_, i) => {
          const pt = scoreToPoint(100, i, RADIUS, CENTER)
          return (
            <line key={i}
              x1={CENTER} y1={CENTER}
              x2={pt.x} y2={pt.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.5" />
          )
        })}

        {/* Top decile polygon */}
        <polygon
          points={buildPolygon(decileScores, RADIUS, CENTER)}
          fill="none"
          stroke="rgba(245,158,11,0.7)"
          strokeWidth="1.5"
          strokeDasharray="5 3" />

        {/* Cohort average polygon */}
        <polygon
          points={buildPolygon(cohortScores, RADIUS, CENTER)}
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1.5" />

        {/* User polygon */}
        <polygon
          points={buildPolygon(animatedScores, RADIUS, CENTER)}
          fill={`${TEAL}25`}
          stroke={TEAL}
          strokeWidth="2"
          style={{ transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />

        {/* Data points */}
        {AXES.map((ax, i) => {
          const pt = scoreToPoint(animatedScores[i], i, RADIUS, CENTER)
          const isHovered = hoveredAxis === ax.key
          return (
            <circle
              key={ax.key}
              cx={pt.x} cy={pt.y}
              r={isHovered ? 6 : 4}
              fill={TEAL}
              stroke="#0d1117"
              strokeWidth="2"
              style={{ cursor: 'pointer', transition: 'r 0.15s' }}
              onMouseEnter={() => setHoveredAxis(ax.key)}
              onMouseLeave={() => setHoveredAxis(null)}
            />
          )
        })}

        {/* Axis labels */}
        {AXES.map((ax, i) => {
          const angle = START_ANGLE + i * (2 * Math.PI / NUM_AXES)
          const lx = CENTER + LABEL_RADIUS * Math.cos(angle)
          const ly = CENTER + LABEL_RADIUS * Math.sin(angle)
          const lines = ax.label.split('\n')
          const isHovered = hoveredAxis === ax.key
          return (
            <text
              key={ax.key}
              x={lx} y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: '10px',
                fill: isHovered ? TEAL : 'rgba(255,255,255,0.5)',
                fontFamily: 'system-ui',
                fontWeight: isHovered ? 700 : 400,
                transition: 'fill 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHoveredAxis(ax.key)}
              onMouseLeave={() => setHoveredAxis(null)}
            >
              {lines.map((line, li) => (
                <tspan key={li} x={lx} dy={li === 0 ? (lines.length > 1 ? '-0.6em' : '0') : '1.2em'}>
                  {line}
                </tspan>
              ))}
            </text>
          )
        })}

        {/* Center composite score */}
        <text x={CENTER} y={CENTER - 8} textAnchor="middle"
          style={{ fontSize: '18px', fontWeight: 700, fill: TEAL, fontFamily: 'system-ui' }}>
          {data.composite_score}
        </text>
        <text x={CENTER} y={CENTER + 10} textAnchor="middle"
          style={{ fontSize: '9px', fill: 'rgba(255,255,255,0.35)', fontFamily: 'system-ui', letterSpacing: '0.05em' }}>
          PROFILE SCORE
        </text>
      </svg>

      {/* Tooltip */}
      {hoveredAxis && (
        <div style={{
          padding: '10px 14px', borderRadius: '10px',
          background: '#161b22',
          border: `1px solid ${BORDER}`,
          marginTop: '12px',
        }}>
          {(() => {
            const ax = AXES.find(a => a.key === hoveredAxis)!
            const userScore = data.user_scores[hoveredAxis as keyof PentagramScores]
            const cohortScore = data.cohort_average[hoveredAxis as keyof PentagramScores]
            const decileScore = data.top_decile[hoveredAxis as keyof PentagramScores]
            const delta = userScore - cohortScore
            return (
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: TEAL, margin: '0 0 6px' }}>
                  {ax.label.replace('\n', ' ')}
                </p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                    Your score: <strong style={{ color: TEAL }}>{userScore}</strong>
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    Cohort avg: {cohortScore}
                    <span style={{ color: delta >= 0 ? TEAL : '#EF4444', marginLeft: '4px' }}>
                      ({delta >= 0 ? '+' : ''}{delta})
                    </span>
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    Top 10%: {decileScore}
                  </span>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
        {[
          { color: TEAL, label: 'Your profile', fill: true },
          { color: 'rgba(255,255,255,0.6)', label: 'Cohort average', fill: false },
          { color: 'rgba(245,158,11,0.7)', label: 'Top 10%', fill: false, dashed: true },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="20" height="10">
              <line x1="0" y1="5" x2="20" y2="5"
                stroke={l.color} strokeWidth="2"
                strokeDasharray={l.dashed ? '4 3' : 'none'} />
            </svg>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}