'use client'
import { useState, useEffect } from 'react'
import StarStories from '@/components/profile/StarStories'
import InterviewQuestions from '@/components/jobs/InterviewQuestions'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface TrackerCard {
  card_id: string
  job_id: string
  company_name: string
  job_title: string
  stage: string
}

interface PrepTabProps {
  userId: string
  tier?: string
}

export default function PrepTab({ userId, tier }: PrepTabProps) {
  const [section, setSection] = useState<'stories' | 'interview'>('stories')
  const [appliedJobs, setAppliedJobs] = useState<TrackerCard[]>([])
  const [selectedJob, setSelectedJob] = useState<TrackerCard | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tracker/${userId}`)
      .then(r => r.json())
      .then((cards: TrackerCard[]) => {
        const active = cards.filter(c =>
          ['APPLIED', 'INTERVIEWING', 'OFFER'].includes(c.stage)
        )
        setAppliedJobs(active)
        if (active.length > 0) setSelectedJob(active[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const STAGE_COLORS: Record<string, string> = {
    APPLIED: '#3B82F6',
    INTERVIEWING: '#F59E0B',
    OFFER: TEAL,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Section switcher */}
      <div style={{
        display: 'flex', gap: '6px',
        background: CARD, border: `1px solid ${BORDER}`,
        borderRadius: '12px', padding: '6px',
      }}>
        {[
          { key: 'stories', label: '📖 STAR Stories', desc: 'Interview-ready stories from your work history' },
          { key: 'interview', label: '🎯 Interview Questions', desc: 'Predicted questions for roles you applied to' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key as 'stories' | 'interview')}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: '8px',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              background: section === s.key ? 'rgba(16,185,129,0.12)' : 'transparent',
              boxShadow: section === s.key ? 'inset 0 0 0 1px rgba(16,185,129,0.25)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <p style={{ fontSize: '13px', fontWeight: 600, color: section === s.key ? TEAL : 'rgba(255,255,255,0.5)', margin: '0 0 2px' }}>
              {s.label}
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{s.desc}</p>
          </button>
        ))}
      </div>

      {/* STAR Stories section */}
      {section === 'stories' && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 4px' }}>
            STAR STORY BANK
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
            6 interview-ready stories generated from your work history. Copy individual sections or the full story. Tweak and regenerate anytime.
          </p>
          <StarStories userId={userId} />
        </div>
      )}

      {/* Interview Questions section */}
      {section === 'interview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Applied jobs selector */}
          {appliedJobs.length > 0 ? (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 8px' }}>
                PREP FOR WHICH ROLE?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {appliedJobs.map(job => {
                  const stageColor = STAGE_COLORS[job.stage] || 'rgba(255,255,255,0.3)'
                  const isSelected = selectedJob?.card_id === job.card_id
                  return (
                    <button
                      key={job.card_id}
                      onClick={() => setSelectedJob(job)}
                      style={{
                        padding: '10px 14px', borderRadius: '10px',
                        background: isSelected ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isSelected ? 'rgba(16,185,129,0.25)' : BORDER}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? TEAL : '#fff', margin: '0 0 2px' }}>
                          {job.job_title}
                        </p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                          {job.company_name}
                        </p>
                      </div>
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                        background: `${stageColor}15`, color: stageColor,
                        border: `1px solid ${stageColor}30`,
                      }}>
                        {job.stage.charAt(0) + job.stage.slice(1).toLowerCase()}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{
              padding: '2rem', borderRadius: '14px', textAlign: 'center',
              background: CARD, border: `1px solid ${BORDER}`,
            }}>
              <p style={{ fontSize: '24px', margin: '0 0 10px' }}>🎯</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: '0 0 6px' }}>
                No active applications yet
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Apply to jobs from the Discover tab — interview questions will appear here for roles you&apos;re actively pursuing.
              </p>
            </div>
          )}

          {/* Interview questions for selected job */}
          {selectedJob && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 4px' }}>
                  INTERVIEW PREP
                </p>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>
                  {selectedJob.job_title}
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                  {selectedJob.company_name}
                </p>
              </div>
              <InterviewQuestions
                jobId={selectedJob.job_id}
                userId={userId}
                jobTitle={selectedJob.job_title}
                company={selectedJob.company_name}
                tier={tier}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
