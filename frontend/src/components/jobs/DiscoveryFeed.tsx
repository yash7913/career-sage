'use client'
import ManualJobInput from './ManualJobInput'
import { useState, useEffect } from 'react'
import JobCard from './JobCard'
import JobFilters, { useJobFilters } from './JobFilters'
import AdjacentRoles from './AdjacentRoles'

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

// Module-level cache — survives component unmount/remount when switching tabs,
// since DiscoveryFeed gets fully unmounted by the parent's conditional render.
// Cleared automatically after 2 minutes so stale data doesn't linger forever.
const FEED_CACHE: Record<string, { jobs: Job[]; offset: number; hasMore: boolean; timestamp: number }> = {}
const CACHE_TTL_MS = 2 * 60 * 1000

export default function DiscoveryFeed({ userId, tracks, onDownload, profileSkills = [], tier }: { userId: string; tracks: Track[]; onDownload?: () => void; profileSkills?: string[]; tier?: string }) {
  const [activeTrack, setActiveTrack] = useState<Track | null>(tracks[0] || null)
  const [jobs, setJobs] = useState<Job[]>([])
  const { filters, setFilters, filtered, allSkills, allLocations } = useJobFilters(jobs)
  const [loading, setLoading] = useState(false)
  const [matching, setMatching] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const LIMIT = 20

  useEffect(() => {
    if (!activeTrack) return

    const cached = FEED_CACHE[activeTrack.track_id]
    const isFresh = cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS

    if (isFresh) {
      // Serve from cache instantly — no loading flash, no network call
      setJobs(cached.jobs)
      setOffset(cached.offset)
      setHasMore(cached.hasMore)
      setLoading(false)
    } else {
      fetchFeed(activeTrack.track_id)
    }
  }, [activeTrack])

  const fetchFeed = async (trackId: string, reset = true) => {
    if (reset) {
      setLoading(true)
      setOffset(0)
      setHasMore(true)
    } else {
      setLoadingMore(true)
    }
    try {
      const isPro = tier === 'PREMIUM_PRO' || tier === 'STUDENT_VERIFIED'
      const currentOffset = reset ? 0 : offset
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/feed?user_id=${userId}&track_id=${trackId}&limit=${LIMIT}&offset=${currentOffset}`
      )
      if (res.ok) {
        const data = await res.json()
        const newJobs = data.jobs || []
        const updatedJobs = reset ? newJobs : [...jobs, ...newJobs]
        const newOffset = currentOffset + newJobs.length
        const maxJobs = isPro ? 999 : 13
        const updatedHasMore = newJobs.length === LIMIT && newOffset < maxJobs

        if (reset) {
          setJobs(newJobs)
        } else {
          setJobs(prev => [...prev, ...newJobs])
        }
        setOffset(newOffset)
        setHasMore(updatedHasMore)

        // Update cache so the next tab switch serves instantly
        FEED_CACHE[trackId] = {
          jobs: updatedJobs,
          offset: newOffset,
          hasMore: updatedHasMore,
          timestamp: Date.now(),
        }
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (activeTrack && !loadingMore && hasMore) {
      fetchFeed(activeTrack.track_id, false)
    }
  }

  const handleMatch = async () => {
    if (!activeTrack) return
    setMatching(true)
    try {
      delete FEED_CACHE[activeTrack.track_id]  // force fresh fetch after explicit re-match
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/match?user_id=${userId}&track_id=${activeTrack.track_id}`,
        { method: 'POST' }
      ).then(() => fetchFeed(activeTrack.track_id))
      await new Promise(resolve => setTimeout(resolve, 800))
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

      {showManual && activeTrack && (
        <ManualJobInput
          userId={userId}
          trackId={activeTrack.track_id}
          onJobAdded={() => {
            setShowManual(false)
            fetchFeed(activeTrack.track_id)
          }}
          onClose={() => setShowManual(false)}
        />
      )}

      {/* Filters */}
      <JobFilters
        filters={filters}
        setFilters={setFilters}
        totalJobs={jobs.length}
        filteredCount={filtered.length}
        allSkills={allSkills}
        allLocations={allLocations}
      />

      {/* Job cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)' }}>
          Loading your ranked feed...
        </div>
      ) : filtered.length === 0 ? (
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
    ) : (() => {
        const isPro = tier === 'PREMIUM_PRO' || tier === 'STUDENT_VERIFIED'
        const topJobs = filtered.slice(0, 3)
        const restJobs = filtered.slice(3)
        return (
          <>
            {/* Top 3 — Pro only */}
            {!isPro && topJobs.length > 0 && (
              <div style={{
                marginBottom: '12px', borderRadius: '16px', overflow: 'hidden',
                border: '1px solid rgba(245,158,11,0.25)',
                background: 'rgba(245,158,11,0.03)',
              }}>
                <div style={{
                  padding: '1rem 1.25rem',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderBottom: '1px solid rgba(245,158,11,0.15)',
                }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#F59E0B', margin: '0 0 2px' }}>
                      🏆 Your top {topJobs.length} matches are locked
                    </p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                      Upgrade to Pro to see your highest-ranked roles
                    </p>
                  </div>
                  <button style={{
                    padding: '8px 18px', borderRadius: '8px',
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#fff', border: 'none', fontSize: '13px',
                    fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>
                    Unlock Pro →
                  </button>
                </div>
                {topJobs.map((job, index) => (
                  <div key={job.ranking_id} style={{
                    padding: '1rem 1.25rem',
                    borderBottom: index < topJobs.length - 1 ? '1px solid rgba(245,158,11,0.08)' : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    filter: 'blur(3px)', userSelect: 'none', pointerEvents: 'none',
                  }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 3px' }}>
                        {'█'.repeat(Math.floor(Math.random() * 8) + 8)}
                      </p>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                        {job.company_name} · {job.location}
                      </p>
                    </div>
                    <div style={{
                      padding: '4px 12px', borderRadius: '999px',
                      background: 'rgba(16,185,129,0.15)',
                      color: '#10B981', fontSize: '13px', fontWeight: 700,
                    }}>
                      {job.match_percentage_score}%
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Top 3 for Pro users */}
            {isPro && topJobs.map((job, index) => (
              <div key={job.ranking_id} className={
                index === 0 ? 'cs-top-match-1' :
                index === 1 ? 'cs-top-match-2' : 'cs-top-match-3'
              } style={{ borderRadius: '14px' }}>
                <JobCard
                  job={job}
                  userId={userId}
                  trackId={activeTrack?.track_id || ''}
                  profileSkills={profileSkills}
                  onStar={handleStar}
                  onDownload={onDownload}
                  rank={index + 1}
                  tier={tier}
                />
              </div>
            ))}

            {/* Rest of jobs */}
            {restJobs.map((job, index) => (
              <div key={job.ranking_id} style={{ borderRadius: '14px' }}>
                <JobCard
                  job={job}
                  userId={userId}
                  trackId={activeTrack?.track_id || ''}
                  profileSkills={profileSkills}
                  onStar={handleStar}
                  onDownload={onDownload}
                  rank={index + 4}
                  tier={tier}
                />
              </div>
            ))}
          </>
        )
      })()}

	{activeTrack && (
          <AdjacentRoles userId={userId} trackId={activeTrack.track_id} />
        )}
	{hasMore && !loading && jobs.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              padding: '10px 28px', borderRadius: '10px',
              background: loadingMore ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
              border: `1px solid rgba(255,255,255,0.12)`,
              color: loadingMore ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)',
              fontSize: '13px', fontWeight: 600, cursor: loadingMore ? 'not-allowed' : 'pointer',
            }}
          >
            {loadingMore ? '⟳ Loading more...' : 'Load more jobs'}
          </button>
        </div>
      )}
    </div>
  )
}
