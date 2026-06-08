'use client'
import { useState } from 'react'
import GenerationWorkspace from '@/components/generate/GenerationWorkspace'
import EvaluateResume from '@/components/generate/EvaluateResume'

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
  company_stage?: string
}

function MatchBadge({ score }: { score: number }) {
  const color = score >= 70 ? TEAL : score >= 50 ? '#F59E0B' : 'rgba(255,255,255,0.4)'
  const bg = score >= 70 ? 'rgba(16,185,129,0.15)' : score >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)'
  return (
    <span style={{ fontSize: '13px', fontWeight: 700, padding: '4px 12px', borderRadius: '999px', background: bg, color, border: `1px solid ${color}40`, flexShrink: 0 }}>
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

function WhyYouMatch({ job, profileSkills, salaryTargetLpa }: {
  job: Job
  profileSkills: string[]
  salaryTargetLpa?: number
}) {
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

  const salaryMax = job.estimated_salary_max
  const salaryBelowTarget = salaryTargetLpa && salaryMax && salaryMax < salaryTargetLpa * 0.7

  const stageLabels: Record<string, string> = {
    seed: '🌱 Seed stage', growth: '📈 Growth stage',
    late: '🦄 Late stage', enterprise: '🏢 Enterprise',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
      <div style={{
        padding: '10px 14px', borderRadius: '8px',
        background: 'rgba(16,185,129,0.05)',
        border: '1px solid rgba(16,185,129,0.12)',
      }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, margin: '0 0 4px', letterSpacing: '0.06em' }}>
          WHY YOU MATCH
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>
          {reason}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {job.company_stage && stageLabels[job.company_stage] && (
          <span style={{
            fontSize: '11px', padding: '3px 10px', borderRadius: '999px',
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.45)',
            border: `1px solid ${BORDER}`,
          }}>
            {stageLabels[job.company_stage]}
          </span>
        )}
        {salaryBelowTarget && (
          <span style={{
            fontSize: '11px', padding: '3px 10px', borderRadius: '999px',
            background: 'rgba(239,68,68,0.08)',
            color: 'rgba(239,68,68,0.75)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            ⚠ Below salary target
          </span>
        )}
      </div>
    </div>
  )
}

type DetailTab = 'jd' | 'interview' | 'pay' | 'company'


function DetailTabs({ job, tier = 'GENERAL_FREE' }: { job: Job; tier?: string }) {
  const [activeTab, setActiveTab] = useState<DetailTab>('jd')
  const isPro = tier === 'PREMIUM_PRO' || tier === 'STUDENT_VERIFIED'

  const tabs: { key: DetailTab; label: string; pro: boolean }[] = [
    { key: 'jd', label: 'JD Summary', pro: false },
    { key: 'interview', label: 'Interview Process', pro: true },
    { key: 'pay', label: 'Pay Range', pro: true },
    { key: 'company', label: 'Company Details', pro: true },
  ]

  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '12px', marginBottom: '12px' }}>
      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={e => { e.stopPropagation(); setActiveTab(tab.key) }}
            style={{
              padding: '5px 12px', borderRadius: '7px',
              fontSize: '11px', fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: activeTab === tab.key
                ? 'rgba(16,185,129,0.12)'
                : 'rgba(255,255,255,0.04)',
              color: activeTab === tab.key
                ? TEAL
                : 'rgba(255,255,255,0.4)',
              boxShadow: activeTab === tab.key
                ? 'inset 0 0 0 1px rgba(16,185,129,0.25)'
                : 'none',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            {tab.label}
            {tab.pro && !isPro && (
              <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '999px', background: 'rgba(127,119,221,0.2)', color: '#7F77DD' }}>Pro</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'jd' && (
        <div style={{
          maxHeight: '220px', overflowY: 'auto',
          paddingRight: '4px',
        }}>
          {job.job_description ? (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: 0 }}>
              {job.job_description}
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>No description available.</p>
          )}
        </div>
      )}

      {activeTab === 'interview' && (
        isPro ? (
          <div>
            {job.estimated_interview_rounds ? (
              <div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '0 0 6px' }}>
                  📋 {job.estimated_interview_rounds} rounds
                </p>
                {job.interview_breakdown_notes && (
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
                    {job.interview_breakdown_notes}
                  </p>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>No interview data available for this role yet.</p>
            )}
          </div>
        ) : <ProLock feature="Interview process details" />
      )}

      {activeTab === 'pay' && (
        isPro ? (
          <div>
            {(job.estimated_salary_min || job.estimated_salary_max) ? (
              <p style={{ fontSize: '14px', fontWeight: 600, color: TEAL, margin: 0 }}>
                💰 {job.estimated_salary_min ? `₹${job.estimated_salary_min}L` : ''}
                {job.estimated_salary_min && job.estimated_salary_max ? ' – ' : ''}
                {job.estimated_salary_max ? `₹${job.estimated_salary_max}L` : ''}
              </p>
            ) : (
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>No salary data available for this role yet.</p>
            )}
          </div>
        ) : <ProLock feature="Salary and compensation data" />
      )}

      {activeTab === 'company' && (
        isPro ? (
          <div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              Company intelligence coming in Day 10 — funding stage, headcount growth, Glassdoor score, and recent news.
            </p>
          </div>
        ) : <ProLock feature="Company health and intelligence" />
      )}
    </div>
  )
}

function ProLock({ feature }: { feature: string }) {
  return (
    <div style={{
      padding: '1rem', borderRadius: '10px',
      background: 'rgba(127,119,221,0.06)',
      border: '1px solid rgba(127,119,221,0.2)',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '13px', fontWeight: 600, color: '#7F77DD', margin: '0 0 4px' }}>
        🔒 {feature}
      </p>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 10px' }}>
        Unlock with Pro
      </p>
      <button
        onClick={e => e.stopPropagation()}
        style={{
          padding: '6px 16px', borderRadius: '7px',
          background: '#7F77DD', color: '#fff',
          border: 'none', fontSize: '12px',
          fontWeight: 600, cursor: 'pointer',
        }}>
        Upgrade to Pro
      </button>
    </div>
  )
}

export default function JobCard({
  job, userId, trackId, profileSkills, onStar, onDownload, rank, salaryTargetLpa,
}: {
  job: Job
  userId: string
  trackId: string
  profileSkills: string[]
  onStar: (id: string, starred: boolean) => void
  onDownload?: () => void
  rank?: number
  salaryTargetLpa?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [starred, setStarred] = useState(job.is_starred)
  const [showWorkspace, setShowWorkspace] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showEvaluate, setShowEvaluate] = useState(false)

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
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          background: CARD,
          border: `1px solid ${starred ? 'rgba(245,158,11,0.3)' : BORDER}`,
          borderRadius: '14px',
          padding: '1.25rem',
          marginBottom: '10px',
          transition: 'all 0.2s',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
        }}>
        {isHiddenGem && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${TEAL}, transparent)` }} />
        )}

        {/* Top row — title + apply button always visible */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '22px',
                color: 'rgba(255,255,255,0.5)',
                flexShrink: 0,
                display: 'inline-block',
                transition: 'transform 0.2s',
                lineHeight: 1,
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}>
                ›
              </span>
              <p style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.4px' }}>
                {job.job_title}
              </p>
            </div>
          </div>

          {/* Match + Apply always top right */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MatchBadge score={job.match_percentage_score} />
              <button onClick={e => { e.stopPropagation(); handleStar() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px', color: starred ? '#F59E0B' : 'rgba(255,255,255,0.2)' }}>
                {starred ? '★' : '☆'}
              </button>
		<button onClick={e => { e.stopPropagation(); handleDismiss() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '4px', color: 'rgba(255,255,255,0.15)' }}>
                ✕
              </button>
            </div>
            {/* Apply button — always visible top right */}
            <button
            onClick={e => { e.stopPropagation(); setShowWorkspace(true) }}
            style={{
              flex: 1, padding: '9px 16px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff', border: 'none',
              fontSize: '13px', fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(16,185,129,0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            Apply →
          </button>
          <button
            onClick={e => { e.stopPropagation(); setShowEvaluate(true) }}
            style={{
              padding: '9px 16px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.12)',
              fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Evaluate
          </button>
          </div>
        </div>

        {/* Skill badges */}
        <SkillBadges
          skillsNeeded={job.skills_needed}
          skillGaps={job.identified_skill_gaps}
          profileSkills={profileSkills}
        />

	

        {/* Expanded detail tabs */}
        {expanded && (
          <div style={{ marginTop: '12px' }}>
            <WhyYouMatch job={job} profileSkills={profileSkills} salaryTargetLpa={salaryTargetLpa} />
            <DetailTabs job={job} />
          </div>
        )}
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
      {showEvaluate && (
        <EvaluateResume
          job={job}
          userId={userId}
          onClose={() => setShowEvaluate(false)}
          onApply={() => { setShowEvaluate(false); setShowWorkspace(true) }}
        />
      )}
    </>
  )
}