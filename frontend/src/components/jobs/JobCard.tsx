'use client'
import { useState } from 'react'
import GenerationWorkspace from '@/components/generate/GenerationWorkspace'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

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
  const bg = score >= 70 ? 'rgba(16,185,129,0.15)' : score >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)'
  return (
    <span style={{
      fontSize: '13px', fontWeight: 700,
      padding: '4px 12px', borderRadius: '999px',
      background: bg, color,
      border: `1px solid ${color}40`,
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
  return (now.getTime() - posted.getTime()) / (1000 * 60 * 60) < 48
}

function SkillBadges({ skillsNeeded, skillGaps, profileSkills }: {
  skillsNeeded: string[]
  skillGaps: string[]
  profileSkills: string[]
}) {
  const [showAll, setShowAll] = useState(false)
  if (!skillsNeeded.length) return null

  const gapSet = new Set(skillGaps.map(s => s.toLowerCase()))
  const profileSet = new Set(profileSkills.map(s => s.toLowerCase()))

  const categorised = skillsNeeded.map(skill => {
    const lower = skill.toLowerCase()
    if (profileSet.has(lower)) return { skill, type: 'have' as const }
    if (gapSet.has(lower)) return { skill, type: 'gap' as const }
    return { skill, type: 'inferred' as const }
  })

  const sorted = [
    ...categorised.filter(s => s.type === 'have'),
    ...categorised.filter(s => s.type === 'gap'),
    ...categorised.filter(s => s.type === 'inferred').slice(0, 5),
  ]

  const visible = showAll ? sorted : sorted.slice(0, 10)
  const hiddenCount = sorted.length - visible.length

  const styleMap = {
    have: { background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' },
    gap: { background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.8)', border: '1px solid rgba(239,68,68,0.2)' },
    inferred: { background: 'rgba(59,130,246,0.06)', color: 'rgba(59,130,246,0.65)', border: '1px solid rgba(59,130,246,0.15)' },
  }

  const prefix = { have: '✓ ', gap: '✕ ', inferred: '~ ' }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
      {visible.map(({ skill, type }) => (
        <span key={skill} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '5px', ...styleMap[type] }}>
          {prefix[type]}{skill}
        </span>
      ))}
      {hiddenCount > 0 && !showAll && (
        <button onClick={e => { e.stopPropagation(); setShowAll(true) }}
          style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '5px', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600 }}>
          +{hiddenCount} more
        </button>
      )}
      {showAll && (
        <button onClick={e => { e.stopPropagation(); setShowAll(false) }}
          style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '5px', cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.25)', border: 'none' }}>
          Show less
        </button>
      )}
    </div>
  )
}

function WhyYouMatch({ job, profileSkills }: { job: Job; profileSkills: string[] }) {
  const matched = job.skills_needed.filter(s =>
    profileSkills.map(p => p.toLowerCase()).includes(s.toLowerCase())
  )
  const matchPct = job.match_percentage_score

  let reason = ''
  if (matchPct >= 70) {
    reason = `Strong fit — you have ${matched.length} of ${job.skills_needed.length} required skills and your experience level aligns well with this role.`
  } else if (matchPct >= 50) {
    reason = `Moderate fit — you have ${matched.length} of ${job.skills_needed.length} required skills. Closing the gaps would make you a strong candidate.`
  } else {
    reason = `Partial fit — ${matched.length} skills match. This role would stretch your current profile but could be a growth opportunity.`
  }

  return (
    <div style={{
      padding: '10px 14px', borderRadius: '8px',
      background: 'rgba(16,185,129,0.05)',
      border: '1px solid rgba(16,185,129,0.12)',
      marginBottom: '10px',
    }}>
      <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, margin: '0 0 4px', letterSpacing: '0.06em' }}>
        WHY YOU MATCH
      </p>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>
        {reason}
      </p>
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
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/rankings/${job.ranking_id}/star`, { method: 'PATCH' })
  }

  const handleDismiss = async () => {
    setDismissed(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/rankings/${job.ranking_id}/dismiss`, { method: 'PATCH' })
    } catch {}
  }

  const isNew = isNewJob(job.posted_at)
  const isHiddenGem = isNew && job.match_percentage_score >= 65

  if (dismissed) return null

  return (
    <>
      <div style={{
        background: CARD,
        border: `1px solid ${starred ? 'rgba(245,158,11,0.3)' : BORDER}`,
        borderRadius: '14px',
        padding: '1.25rem',
        marginBottom: '10px',
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Hidden gem top bar */}
        {isHiddenGem && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${TEAL}, transparent)` }} />
        )}

        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Company + badges row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                {job.company_name} · {job.location}
              </p>
              {rank && rank <= 3 && (
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 8px', borderRadius: '999px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: TEAL }}>
                  {rank === 1 ? '🏆 Top Match' : `#${rank} Match`}
                </span>
              )}
              {isHiddenGem && (
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '999px', background: 'rgba(16,185,129,0.15)', color: TEAL, border: '1px solid rgba(16,185,129,0.3)' }}>
                  🔥 New + Strong fit
                </span>
              )}
            </div>

            {/* Job title */}
            <p style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.4px' }}>
              {job.job_title}
            </p>
          </div>

          {/* Right side — match + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
            <MatchBadge score={job.match_percentage_score} />
            <button onClick={handleStar} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px', color: starred ? '#F59E0B' : 'rgba(255,255,255,0.2)', transition: 'color 0.15s' }}>
              {starred ? '★' : '☆'}
            </button>
            <button onClick={handleDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '4px', color: 'rgba(255,255,255,0.15)', transition: 'color 0.15s' }}>
              ✕
            </button>
          </div>
        </div>

        {/* Salary + interview quick info */}
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
            </span>
          )}
        </div>

        {/* Skill badges — always visible */}
        <SkillBadges
          skillsNeeded={job.skills_needed}
          skillGaps={job.identified_skill_gaps}
          profileSkills={profileSkills}
        />

        {/* Skill legend */}
        {job.skills_needed.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            {[{ color: '#10B981', label: 'You have' }, { color: 'rgba(239,68,68,0.8)', label: 'Gap' }, { color: 'rgba(59,130,246,0.8)', label: 'Inferred' }].map(l => (
              <span key={l.label} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '12px', marginBottom: '12px' }}>
            <WhyYouMatch job={job} profileSkills={profileSkills} />

            {job.identified_skill_gaps.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', margin: '0 0 6px', letterSpacing: '0.06em' }}>GAPS TO CLOSE</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {job.identified_skill_gaps.map(s => (
                    <span key={s} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '5px', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.75)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      ✕ {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.estimated_interview_rounds && (
              <div style={{ marginBottom: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', margin: '0 0 4px', letterSpacing: '0.06em' }}>INTERVIEW</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                  {job.estimated_interview_rounds} rounds{job.interview_breakdown_notes ? ` · ${job.interview_breakdown_notes}` : ''}
                </p>
              </div>
            )}

            {job.job_description && (
              <div style={{ marginBottom: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', margin: '0 0 4px', letterSpacing: '0.06em' }}>JD SUMMARY</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, margin: 0, maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', maxHeight: '80px', overflow: 'hidden' }}>
                  {job.job_description}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action row */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${BORDER}`,
              color: 'rgba(255,255,255,0.5)',
              fontSize: '12px', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {expanded ? '▲ Less' : '▼ View details'}
          </button>

          <button
            onClick={e => { e.stopPropagation(); setShowWorkspace(true) }}
            style={{
              flex: 1, padding: '9px 16px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff', border: 'none',
              fontSize: '13px', fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(16,185,129,0.25)',
            }}
          >
            I want to apply →
          </button>

          {job.source_link && (
            <a href={job.source_link} target="_blank" rel="noopener noreferrer" style={{ padding: '9px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: `1px solid ${BORDER}`, fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>↗</a>
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