'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

interface Version {
  version_id: string
  version_number: number
  created_at: string
  user_tweak: string
  resume_content?: string
}

interface VersionHistoryProps {
  userId: string
  trackId: string
  jobId: string
  onSelect: (versionId: string) => void
  activeVersionId?: string
  jobSkills?: string[]
}

function parseATSScore(content: string): { score: number; strength: string } {
  if (!content) return { score: 0, strength: '' }
  const scoreMatch = content.match(/Estimated ATS Score:\s*\**(\d+)%/i)
  const strengthMatch = content.match(/ATS Match Strength:\s*\**([A-Za-z\s]+?)[\*\n]/i)
  if (scoreMatch) {
    return { score: parseInt(scoreMatch[1]), strength: strengthMatch ? strengthMatch[1].trim() : '' }
  }
  const strengthOnly = content.match(/Estimated ATS Match Strength:\s*\**([A-Za-z\s]+?)[\*\n]/i)
  if (strengthOnly) {
    const label = strengthOnly[1].trim().toLowerCase()
    const score = label.includes('very high') ? 90 : label.includes('high') ? 78 : label.includes('medium') ? 62 : 45
    return { score, strength: strengthOnly[1].trim() }
  }
  return { score: 0, strength: '' }
}

export default function VersionHistory({
  userId, trackId, jobId, onSelect, activeVersionId, jobSkills = []
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVersions()
  }, [jobId])

  const fetchVersions = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/generate/versions?user_id=${userId}&track_id=${trackId}&job_id=${jobId}`
      )
      if (res.ok) {
        const data = await res.json()
        setVersions(data)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>Loading versions...</p>
  )

  if (versions.length === 0) return (
    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
      No versions yet — generate to create v1
    </p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {versions.map((v, idx) => {
        const isActive = activeVersionId === v.version_id
        const isLatest = idx === 0

        return (
          <button
            key={v.version_id}
            onClick={() => onSelect(v.version_id)}
            style={{
              padding: '8px 12px', borderRadius: '8px',
              border: `1px solid ${isActive ? 'rgba(16,185,129,0.4)' : BORDER}`,
              background: isActive ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
              cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            {/* Top row — version + skill match + date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: v.user_tweak ? '4px' : 0 }}>
              <span style={{
                fontSize: '12px', fontWeight: 700,
                color: isActive ? TEAL : 'rgba(255,255,255,0.7)',
                minWidth: '24px',
              }}>
                v{v.version_number}
              </span>

              {isLatest && (
                <span style={{
                  fontSize: '9px', fontWeight: 700, padding: '1px 5px',
                  borderRadius: '999px',
                  background: 'rgba(16,185,129,0.15)',
                  color: TEAL,
                }}>
                  LATEST
                </span>
              )}

              {(() => {
                const { score, strength } = parseATSScore(v.resume_content || '')
                if (!score && !strength) return null
                const color = score >= 70 ? TEAL : score >= 50 ? '#F59E0B' : '#EF4444'
                return (
                  <span style={{
                    fontSize: '10px', fontWeight: 700, padding: '1px 7px',
                    borderRadius: '999px', background: `${color}15`,
                    color, border: `1px solid ${color}30`,
                    whiteSpace: 'nowrap',
                  }}>
                    {strength || `ATS ${score}%`}{score > 0 && strength ? ` (${score}%)` : ''}
                  </span>
                )
              })()}

              <span style={{
                fontSize: '10px', color: 'rgba(255,255,255,0.25)',
                marginLeft: 'auto', whiteSpace: 'nowrap',
              }}>
                {new Date(v.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>

            {v.user_tweak && (
              <p style={{
                fontSize: '11px', color: 'rgba(255,255,255,0.35)',
                margin: 0, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {v.user_tweak}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}