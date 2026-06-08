'use client'
import { useState, useEffect } from 'react'
import { parseATSFromContent, atsColor } from '@/lib/ats-score'

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
      if (res.ok) setVersions(await res.json())
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
        const ats = parseATSFromContent(v.resume_content || '')
        const color = ats ? atsColor(ats.strength) : 'rgba(255,255,255,0.3)'
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
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: v.user_tweak ? '4px' : 0 }}>
              <span style={{
                fontSize: '12px', fontWeight: 700, minWidth: '24px',
                color: isActive ? TEAL : 'rgba(255,255,255,0.7)',
              }}>
                v{v.version_number}
              </span>

              {isLatest && (
                <span style={{
                  fontSize: '9px', fontWeight: 700, padding: '1px 5px',
                  borderRadius: '999px', background: 'rgba(16,185,129,0.15)', color: TEAL,
                }}>
                  LATEST
                </span>
              )}

              {ats && (
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '1px 7px',
                  borderRadius: '999px', background: `${color}15`,
                  color, border: `1px solid ${color}30`, whiteSpace: 'nowrap',
                }}>
                  {ats.label}
                </span>
              )}

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
                margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
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