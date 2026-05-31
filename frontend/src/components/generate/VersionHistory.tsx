'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface Version {
  version_id: string
  version_number: number
  created_at: string
  user_tweak: string
}

interface VersionHistoryProps {
  userId: string
  trackId: string
  jobId: string
  onSelect: (versionId: string) => void
  activeVersionId?: string
}

export default function VersionHistory({ userId, trackId, jobId, onSelect, activeVersionId }: VersionHistoryProps) {
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
    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>No versions yet — generate to create v1</p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {versions.map(v => (
        <button
          key={v.version_id}
          onClick={() => onSelect(v.version_id)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${activeVersionId === v.version_id ? 'rgba(16,185,129,0.4)' : BORDER}`,
            background: activeVersionId === v.version_id ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: activeVersionId === v.version_id ? TEAL : 'rgba(255,255,255,0.7)' }}>
              v{v.version_number}
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
              {new Date(v.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {v.user_tweak && (
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {v.user_tweak}
            </p>
          )}
        </button>
      ))}
    </div>
  )
}