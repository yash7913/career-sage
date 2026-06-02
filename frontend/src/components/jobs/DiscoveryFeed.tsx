'use client'
import { useState, useEffect } from 'react'
import JobCard from './JobCard'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface Track {
  track_id: string
  track_name: string
  track_color: string
}

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

const COLOR_MAP: Record<string, string> = {
  teal: '#10B981', purple: '#7F77DD',
  blue: '#3B82F6', amber: '#F59E0B', coral: '#F97316',
}

export default function DiscoveryFeed({ userId, tracks, onDownload }: { userId: string; tracks: Track[]; onDownload?: () => void }) {
  const [activeTrack, setActiveTrack] = useState<Track | null>(tracks[0] || null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [matching, setMatching] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    if (activeTrack) fetchFeed(activeTrack.track_id)
  }, [activeTrack])

  const fetchFeed = async (trackId: string) => {
    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/feed?user_id=${userId}&track_id=${trackId}&limit=20`
      )
      if (res.ok) {
        const data = await res.json()
        setJobs(data.jobs || [])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMatch = async () => {
    if (!activeTrack) return
    setMatching(true)
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/match?user_id=${userId}&track_id=${activeTrack.track_id}`,
        { method: 'POST' }
      )
      await fetchFeed(activeTrack.track_id)
    } finally {
      setMatching(false)
    }
  }

  const handleStar = (rankingId: string, starred: boolean) => {
    setJobs(prev => prev.map(j =>
      j.ranking_id === rankingId ? { ...j, is_starred: starred } : j
    ))
  }

  const handleManualUrl = async () => {
    if (!manualUrl.trim() || !activeTrack) return
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/manual`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            track_id: activeTrack.track_id,
            url: manualUrl.trim(),
          }),
        }
      )
      if (res.ok) {
        setManualUrl('')
        setShowManual(false)
        await fetchFeed(activeTrack.track_id)
      }
    } catch (e) {
      console.error('Manual URL error:', e)
    }
  }

  if (tracks.length === 0) return null

  return (
    <div>
      {/* Track switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tracks.map(track => {
            const hex = COLOR_MAP[track.track_color] ?? TEAL
            const isActive = activeTrack?.track_id === track.track_id
            return (
              <button
                key={track.track_id}
                onClick={() => setActiveTrack(track)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '7px 16px', borderRadius: '999px',
                  background: isActive ? `${hex}18` : 'transparent',
                  border: `1px solid ${isActive ? hex : BORDER}`,
                  color: isActive ? hex : 'rgba(255,255,255,0.45)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: hex, flexShrink: 0 }} />
                {track.track_name}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowManual(!showManual)}
            style={{
              padding: '7px 14px', borderRadius: '8px',
              background: 'transparent', color: 'rgba(255,255,255,0.45)',
              border: `1px solid ${BORDER}`, fontSize: '13px', cursor: 'pointer',
            }}
          >
            + Manual URL
          </button>
          <button
            onClick={handleMatch}
            disabled={matching}
            style={{
              padding: '7px 16px', borderRadius: '8px',
              background: matching ? 'rgba(16,185,129,0.3)' : TEAL,
              color: '#fff', border: 'none',
              fontSize: '13px', fontWeight: 600, cursor: matching ? 'not-allowed' : 'pointer',
            }}
          >
            {matching ? '⟳ Matching...' : '⚡ Refresh matches'}
          </button>
        </div>
      </div>

      {/* Manual URL input */}
      {showManual && (
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: '12px', padding: '1rem',
          marginBottom: '1rem',
          display: 'flex', gap: '10px',
        }}>
          <input
            value={manualUrl}
            onChange={e => setManualUrl(e.target.value)}
            placeholder="Paste a job URL or job description text..."
            style={{
              flex: 1, padding: '9px 12px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${BORDER}`,
              color: '#fff', fontSize: '13px', outline: 'none',
            }}
          />
          <button
            onClick={handleManualUrl}
            style={{
              padding: '9px 16px', borderRadius: '8px',
              background: TEAL, color: '#fff',
              border: 'none', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Add
          </button>
        </div>
      )}

      {/* Feed header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          {loading ? 'Loading...' : `${jobs.length} roles ranked for ${activeTrack?.track_name}`}
        </p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>
          sorted by match score ↓
        </p>
      </div>

      {/* Job cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)' }}>
          Loading your ranked feed...
        </div>
      ) : jobs.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '3rem',
          background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: '14px',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0 12px' }}>
            No matches yet for this track.
          </p>
          <button
            onClick={handleMatch}
            style={{
              padding: '10px 24px', borderRadius: '8px',
              background: TEAL, color: '#fff',
              border: 'none', fontSize: '14px',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            ⚡ Run matching now
          </button>
        </div>
      ) : (
jobs.map(job => (
          <JobCard key={job.ranking_id} job={job} userId={userId} trackId={activeTrack?.track_id || ''} onStar={handleStar} onDownload={onDownload} />
        ))
      )}
    </div>
  )
}