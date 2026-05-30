'use client'
import { useState } from 'react'

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
}

function MatchBadge({ score }: { score: number }) {
  const color = score >= 70 ? TEAL : score >= 50 ? '#F59E0B' : 'rgba(255,255,255,0.4)'
  return (
    <span style={{
      fontSize: '12px', fontWeight: 700,
      padding: '3px 10px', borderRadius: '999px',
      background: score >= 70 ? 'rgba(16,185,129,0.15)' : score >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
      color, border: `1px solid ${color}40`,
      flexShrink: 0,
    }}>
      ⚡ {score}%
    </span>
  )
}

export default function JobCard({ job, onStar }: { job: Job; onStar: (id: string, starred: boolean) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [starred, setStarred] = useState(job.is_starred)

  const handleStar = async () => {
    const newVal = !starred
    setStarred(newVal)
    onStar(job.ranking_id, newVal)
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/rankings/${job.ranking_id}/star`, {
      method: 'PATCH',
    })
  }

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${starred ? 'rgba(245,158,11,0.3)' : BORDER}`,
      borderRadius: '14px',
      padding: '1.25rem',
      marginBottom: '10px',
      transition: 'border-color 0.2s',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>
            {job.company_name} · {job.location}
          </p>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>
            {job.job_title}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
          <MatchBadge score={job.match_percentage_score} />
          <button
            onClick={handleStar}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '16px', padding: '2px',
              color: starred ? '#F59E0B' : 'rgba(255,255,255,0.2)',
              transition: 'color 0.15s',
            }}
          >
            {starred ? '★' : '☆'}
          </button>
        </div>
      </div>

      {/* Salary + interview */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {(job.estimated_salary_min || job.estimated_salary_max) && (
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            💰 {job.estimated_salary_min ? `₹${job.estimated_salary_min}L` : ''}{job.estimated_salary_min && job.estimated_salary_max ? ' – ' : ''}{job.estimated_salary_max ? `₹${job.estimated_salary_max}L` : ''}
          </span>
        )}
        {job.estimated_interview_rounds && (
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            📋 {job.estimated_interview_rounds} rounds{job.interview_breakdown_notes ? ` · ${job.interview_breakdown_notes}` : ''}
          </span>
        )}
      </div>

      {/* Skills */}
      {job.skills_needed.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
          {job.skills_needed.slice(0, 8).map(s => (
            <span key={s} style={{
              fontSize: '11px', padding: '2px 7px', borderRadius: '4px',
              background: CARD2, color: 'rgba(255,255,255,0.55)',
              border: `1px solid ${BORDER}`,
            }}>{s}</span>
          ))}
        </div>
      )}

      {/* Skill gaps */}
      {job.identified_skill_gaps.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '0 0 4px' }}>Skill gaps to close:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {job.identified_skill_gaps.map(s => (
              <span key={s} style={{
                fontSize: '11px', padding: '2px 7px', borderRadius: '4px',
                background: 'rgba(239,68,68,0.08)',
                color: 'rgba(239,68,68,0.7)',
                border: '1px solid rgba(239,68,68,0.15)',
              }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Description toggle */}
      {job.job_description && (
        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12px', color: 'rgba(255,255,255,0.35)',
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
{/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
        <button style={{ padding: '9px', borderRadius: '8px', background: '#fff', color: '#000', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          📄 Tailor resume
        </button>
        <button style={{ padding: '9px', borderRadius: '8px', background: CARD2, color: 'rgba(255,255,255,0.7)', border: `1px solid ${BORDER}`, fontSize: '13px', cursor: 'pointer' }}>
          ✉ Cover letter
        </button>
        {job.source_link && (
          <a href={job.source_link} target="_blank" rel="noopener noreferrer" style={{ padding: '9px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: TEAL, border: `1px solid rgba(16,185,129,0.2)`, fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            ↗
          </a>
        )}
      </div>
    </div>
  )
}