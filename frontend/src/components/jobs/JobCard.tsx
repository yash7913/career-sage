'use client'
import { useState } from 'react'
import GenerationWorkspace from '@/components/generate/GenerationWorkspace'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'
const CARD2 = '#1c2128'

interface Job {
  ranking_id: string
  match_percentage_score: number
  identified_skill_gaps: string[]
  is_starred: boolean
  job_id: string
  company_name: string
  job_title: string
  location: string
  skills_needed: string[]
  source_link: string
  job_description: string
  estimated_salary_min: number | null
  estimated_salary_max: number | null
  estimated_interview_rounds: number | null
  interview_breakdown_notes: string | null
  posted_at?: string | null
}

function MatchBadge({ score }: { score: number }) {
  const color = score >= 70 ? TEAL : score >= 50 ? '#F59E0B' : 'rgba(255,255,255,0.4)'
  return (
    <span style={{
      fontSize: '12px', fontWeight: 700,
      padding: '3px 10px', borderRadius: '999px',
      background: score >= 70
        ? 'rgba(16,185,129,0.15)'
        : score >= 50
        ? 'rgba(245,158,11,0.15)'
        : 'rgba(255,255,255,0.06)',
      color, border: `1px solid ${color}40`,
      flexShrink: 0,
    }}>
      ⚡ {score}%
    </span>
  )
}

function isNewJob(postedAt?: string | null): boolean {
  if (!postedAt) return false
  const posted = new Date(postedAt)
  const now = new Date()
  const diffHours = (now.getTime() - posted.getTime()) / (1000 * 60 * 60)
  return diffHours < 48
}

function SkillBadges({
  skillsNeeded,
  skillGaps,
  profileSkills,
}: {
  skillsNeeded: string[]
  skillGaps: string[]
  profileSkills: string[]
}) {
  if (!skillsNeeded.length) return null

  const gapSet = new Set(skillGaps.map(s => s.toLowerCase()))
  const profileSet = new Set(profileSkills.map(s => s.toLowerCase()))

  const categorised = skillsNeeded.slice(0, 12).map(skill => {
    const lower = skill.toLowerCase()
    if (profileSet.has(lower)) return { skill, type: 'have' }
    if (gapSet.has(lower)) return { skill, type: 'gap' }
    return { skill, type: 'inferred' }
  })

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
      {categorised.map(({ skill, type }) => {
        const styles = {
          have: {
            background: 'rgba(16,185,129,0.1)',
            color: '#10B981',
            border: '1px solid rgba(16,185,129,0.25)',
          },
          gap: {
            background: 'rgba(239,68,68,0.08)',
            color: 'rgba(239,68,68,0.8)',
            border: '1px solid rgba(239,68,68,0.2)',
          },
          inferred: {
            background: 'rgba(59,130,246,0.08)',
            color: 'rgba(59,130,246,0.8)',
            border: '1px solid rgba(59,130,246,0.2)',
          },
        }[type]

        return (
          <span key={skill} style={{
            fontSize: '11px', padding: '2px 8px',
            borderRadius: '5px', ...styles,
            display: 'flex', alignItems: 'center', gap: '3px',
          }}>
            {type === 'have' && '✓ '}
            {type === 'gap' && '✕ '}
            {type === 'inferred' && '~ '}
            {skill}
          </span>
        )
      })}
      {skillsNeeded.length > 12 && (
        <span style={{
          fontSize: '11px', color: 'rgba(255,255,255,0.2)',
          alignSelf: 'center',
        }}>
          +{skillsNeeded.length - 12} more
        </span>
      )}
    </div>
  )
}

export default function JobCard({
  job, userId, trackId, profileSkills, onStar, onDownload, rank,
}: {
  job: Job
  userId: string
  trackId: string
  profileSkills: string[]
  onStar: (id: string, starred: boolean) => void
  onDownload?: () => void
  rank?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [starred, setStarred] = useState(job.is_starred)
  const [showWorkspace, setShowWorkspace] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const handleStar = async () => {
    const newVal = !starred
    setStarred(newVal)
    onStar(job.ranking_id, newVal)
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/rankings/${job.ranking_id}/star`,
      { method: 'PATCH' }
    )
  }

  const handleDismiss = async () => {
    setDismissed(true)
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/rankings/${job.ranking_id}/dismiss`,
        { method: 'PATCH' }
      )
    } catch {}
  }

  const isNew = isNewJob(job.posted_at)
  const isHiddenGem = isNew && job.match_percentage_score >= 65

  if (dismissed) return null

  return (
    <>
      <div style={{
        background: CARD,
        border: `1px solid ${starred
          ? 'rgba(245,158,11,0.3)'
          : isHiddenGem
          ? 'rgba(16,185,129,0.2)'
          : BORDER}`,
        borderRadius: '14px',
        padding: '1.25rem',
        marginBottom: '10px',
        transition: 'border-color 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Hidden gem indicator */}
        {isHiddenGem && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: '2px',
            background: `linear-gradient(90deg, ${TEAL}, transparent)`,
          }} />
        )}

        {/* Top row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: '8px',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                {job.company_name} · {job.location}
              </p>
              {rank && rank <= 3 && (
                <span style={{
                  fontSize: '10px', fontWeight: 700,
                  padding: '1px 8px', borderRadius: '999px',
                  background: 'rgba(16,185,129,0.12)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  color: '#10B981',
                }}>
                  {rank === 1 ? '🏆 Top Match' : `#${rank} Match`}
                </span>
              )}
              {isHiddenGem && (
                <span style={{
                  fontSize: '10px', fontWeight: 700,
                  padding: '1px 7px', borderRadius: '999px',
                  background: 'rgba(16,185,129,0.15)',
                  color: TEAL,
                  border: '1px solid rgba(16,185,129,0.3)',
                }}>
                  🔥 New + Strong fit
                </span>
              )}
              {isNew && !isHiddenGem && (
                <span style={{
                  fontSize: '10px', fontWeight: 600,
                  padding: '1px 7px', borderRadius: '999px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.35)',
                }}>
                  New
                </span>
              )}
            </div>
            <p style={{
              fontSize: '16px', fontWeight: 600, color: '#fff',
              margin: 0, letterSpacing: '-0.3px',
            }}>
              {job.job_title}
            </p>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center',
            gap: '6px', flexShrink: 0, marginLeft: '12px',
          }}>
            <MatchBadge score={job.match_percentage_score} />
            <button onClick={handleStar} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '16px', padding: '2px',
              color: starred ? '#F59E0B' : 'rgba(255,255,255,0.2)',
              transition: 'color 0.15s',
            }}>
              {starred ? '★' : '☆'}
            </button>
            <button onClick={handleDismiss} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '14px', padding: '2px',
              color: 'rgba(255,255,255,0.15)',
              transition: 'color 0.15s',
            }}>
              ✕
            </button>
          </div>
        </div>

        {/* Salary + interview */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', flexWrap: 'wrap' }}>
          {(job.estimated_salary_min || job.estimated_salary_max) && (
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              💰 {job.estimated_salary_min ? `₹${job.estimated_salary_min}L` : ''}
              {job.estimated_salary_min && job.estimated_salary_max ? ' – ' : ''}
              {job.estimated_salary_max ? `₹${job.estimated_salary_max}L` : ''}
            </span>
          )}
          {job.estimated_interview_rounds && (
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              📋 {job.estimated_interview_rounds} rounds
              {job.interview_breakdown_notes ? ` · ${job.interview_breakdown_notes}` : ''}
            </span>
          )}
        </div>

        {/* Skill badges — green/red/blue */}
        <SkillBadges
          skillsNeeded={job.skills_needed}
          skillGaps={job.identified_skill_gaps}
          profileSkills={profileSkills}
        />

        {/* Skill legend */}
        {job.skills_needed.length > 0 && (
          <div style={{
            display: 'flex', gap: '12px', marginBottom: '10px',
            flexWrap: 'wrap',
          }}>
            {[
              { color: '#10B981', label: 'You have' },
              { color: 'rgba(239,68,68,0.8)', label: 'Gap' },
              { color: 'rgba(59,130,246,0.8)', label: 'Inferred' },
            ].map(l => (
              <span key={l.label} style={{
                fontSize: '10px', color: 'rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        )}

        {/* Description toggle */}
        {job.job_description && (
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '12px', color: 'rgba(255,255,255,0.3)',
                padding: 0, textDecoration: 'underline',
              }}
            >
              {expanded ? 'Hide description' : 'Show description'}
            </button>
            {expanded && (
              <p style={{
                fontSize: '13px', color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.7, margin: '8px 0 0',
              }}>
                {job.job_description}
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={e => { e.stopPropagation(); setShowWorkspace(true) }}
            style={{
              flex: 1, padding: '9px', borderRadius: '8px',
              background: '#fff', color: '#000',
              border: 'none', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer',
            }}>
            📄 Tailor resume
          </button>
          <button
            onClick={e => { e.stopPropagation(); setShowWorkspace(true) }}
            style={{
              flex: 1, padding: '9px', borderRadius: '8px',
              background: CARD2, color: 'rgba(255,255,255,0.7)',
              border: `1px solid ${BORDER}`,
              fontSize: '13px', cursor: 'pointer',
            }}>
            ✉ Cover letter
          </button>
          {job.source_link && (
            <a href={job.source_link} target="_blank" rel="noopener noreferrer" style={{ padding: '9px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: TEAL, border: `1px solid rgba(16,185,129,0.2)`, fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>↗</a>
          )}
        </div>
      </div>

      {showWorkspace && (
        <GenerationWorkspace
          job={job}
          userId={userId}
          trackId={trackId}
          onClose={() => setShowWorkspace(false)}
          onDownload={onDownload}
        />
      )}
    </>
  )
}