'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#1c2128'

interface EnrichedSkill {
  name: string
  confidence: 'Core' | 'Proficient' | 'Familiar' | 'Dated'
}

interface TrajectoryData {
  trajectory: string
  description: string
  color: string
  icon: string
  dominant_domain: string | null
}

interface IntelligenceData {
  trajectory: TrajectoryData
  enriched_skills: EnrichedSkill[]
  skill_gaps: string[]
  years_of_experience: number
  cohort: string
}

const CONFIDENCE_STYLES = {
  Core: {
    background: 'rgba(16,185,129,0.12)',
    color: '#10B981',
    border: '1px solid rgba(16,185,129,0.3)',
    label: 'Core',
  },
  Proficient: {
    background: 'rgba(59,130,246,0.1)',
    color: '#3B82F6',
    border: '1px solid rgba(59,130,246,0.25)',
    label: 'Proficient',
  },
  Familiar: {
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.5)',
    border: `1px solid rgba(255,255,255,0.1)`,
    label: 'Familiar',
  },
  Dated: {
    background: 'rgba(239,68,68,0.06)',
    color: 'rgba(239,68,68,0.6)',
    border: '1px solid rgba(239,68,68,0.15)',
    label: 'Dated',
  },
}

export default function ProfileIntelligence({ userId }: { userId: string }) {
  const [data, setData] = useState<IntelligenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAllSkills, setShowAllSkills] = useState(false)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/intelligence/${userId}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return (
    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
      Analysing profile...
    </p>
  )

  if (!data) return null

  const visibleSkills = showAllSkills
    ? data.enriched_skills
    : data.enriched_skills.slice(0, 12)

  const hiddenCount = data.enriched_skills.length - 12

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Trajectory */}
      <div style={{
        padding: '1rem 1.25rem', borderRadius: '12px',
        background: `${data.trajectory.color}10`,
        border: `1px solid ${data.trajectory.color}30`,
        display: 'flex', alignItems: 'flex-start', gap: '12px',
      }}>
        <span style={{ fontSize: '24px', flexShrink: 0 }}>{data.trajectory.icon}</span>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 4px', color: data.trajectory.color }}>
            Career trajectory: {data.trajectory.trajectory}
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
            {data.trajectory.description}
          </p>
          {data.trajectory.dominant_domain && (
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '6px 0 0' }}>
              Dominant domain: {data.trajectory.dominant_domain}
              {data.years_of_experience > 0 && ` · ${data.years_of_experience} years experience`}
            </p>
          )}
        </div>
      </div>

      {/* Skill confidence breakdown */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: 0 }}>
            SKILL CONFIDENCE
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            {(['Core', 'Proficient', 'Familiar', 'Dated'] as const).map(level => {
              const count = data.enriched_skills.filter(s => s.confidence === level).length
              if (count === 0) return null
              return (
                <span key={level} style={{ fontSize: '10px', color: CONFIDENCE_STYLES[level].color }}>
                  {level}: {count}
                </span>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {visibleSkills.map(skill => {
            const style = CONFIDENCE_STYLES[skill.confidence]
            return (
              <div key={skill.name} style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '3px 10px', borderRadius: '6px',
                background: style.background,
                border: style.border,
              }}>
                <span style={{ fontSize: '12px', color: style.color, fontWeight: 500 }}>
                  {skill.name}
                </span>
                <span style={{
                  fontSize: '9px', color: style.color, opacity: 0.7,
                  padding: '1px 4px', borderRadius: '3px',
                  background: `${style.background}`,
                }}>
                  {style.label}
                </span>
              </div>
            )
          })}
          {!showAllSkills && hiddenCount > 0 && (
            <button
              onClick={() => setShowAllSkills(true)}
              style={{
                padding: '3px 10px', borderRadius: '6px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${BORDER}`,
                color: 'rgba(255,255,255,0.4)',
                fontSize: '12px', cursor: 'pointer', fontWeight: 600,
              }}
            >
              +{hiddenCount} more
            </button>
          )}
        </div>
      </div>

      {/* Skill gaps */}
      {data.skill_gaps.length > 0 && (
        <div>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 10px' }}>
            TOP GAPS FOR YOUR COHORT
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {data.skill_gaps.map(gap => (
              <span key={gap} style={{
                padding: '4px 12px', borderRadius: '6px',
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: 'rgba(239,68,68,0.75)',
                fontSize: '12px', fontWeight: 500,
              }}>
                ✕ {gap}
              </span>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: '8px 0 0' }}>
            Closing these gaps would push your pentagram Technical Depth and Domain Expertise scores up significantly.
          </p>
        </div>
      )}
    </div>
  )
}