'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface AdjacentJob {
  job_id: string
  job_title: string
  company_name: string
  location: string
  skills_needed: string[]
  source_link: string
  skill_overlap_score: number
}

export default function AdjacentRoles({ userId, trackId }: { userId: string; trackId: string }) {
  const [roles, setRoles] = useState<AdjacentJob[]>([])
  const [cohort, setCohort] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/adjacent?user_id=${userId}&track_id=${trackId}&limit=5`)
      .then(r => r.json())
      .then(data => {
        setRoles(data.adjacent || [])
        setCohort(data.cohort || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId, trackId])

  if (loading || roles.length === 0) return null

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{
        padding: '1rem 1.25rem',
        background: 'rgba(127,119,221,0.06)',
        border: '1px solid rgba(127,119,221,0.2)',
        borderRadius: '14px',
      }}>
        <div
          onClick={() => setExpanded(!expanded)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        >
          <div>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#7F77DD', margin: '0 0 2px', letterSpacing: '0.08em' }}>
              YOU MIGHT ALSO FIT
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              {roles.length} adjacent roles based on your {cohort} profile
            </p>
          </div>
          <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.3)', transition: 'transform 0.2s', display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
        </div>

        {expanded && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {roles.map(role => (
              <div key={role.job_id} style={{
                padding: '0.875rem 1rem',
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: '10px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '0 0 3px' }}>
                    {role.company_name} · {role.location}
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: '0 0 6px' }}>
                    {role.job_title}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {role.skills_needed.slice(0, 5).map(s => (
                      <span key={s} style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: `1px solid ${BORDER}` }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', marginLeft: '12px', flexShrink: 0 }}>
                  <span style={{
                    fontSize: '12px', fontWeight: 700,
                    padding: '3px 10px', borderRadius: '999px',
                    background: 'rgba(127,119,221,0.15)',
                    color: '#7F77DD',
                    border: '1px solid rgba(127,119,221,0.3)',
                  }}>
                    ~{role.skill_overlap_score}% skill fit
                  </span>
                  {role.source_link && (
                    <a href={role.source_link} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: TEAL, textDecoration: 'none' }}>
                      View role ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}