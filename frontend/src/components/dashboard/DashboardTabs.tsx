'use client'
import { useState, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import DiscoveryFeed from '@/components/jobs/DiscoveryFeed'
import KanbanBoard from '@/components/tracker/KanbanBoard'
import VaultUpload from '@/components/profile/VaultUpload'
import TrackSetup from '@/components/profile/TrackSetup'
import StatsRow from '@/components/dashboard/StatsRow'
import Sidebar from '@/components/dashboard/Sidebar'
import ContactDetailsForm from '@/components/profile/ContactDetailsForm'
import PreferencesPanel from '@/components/profile/PreferencesPanel'
import PrepTab from '@/components/dashboard/PrepTab'
import ToolsTab from '@/components/dashboard/ToolsTab'
import CareerDNA from '@/components/dashboard/CareerDNA'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'
import DocumentManager from '@/components/profile/DocumentManager'
import ProjectManager from '@/components/profile/ProjectManager'

function ExpandableSkills({ skills }: { skills: string[] }) {
  const [expanded, setExpanded] = useState(false)
  const TEAL = '#10B981'
  const visible = expanded ? skills : skills.slice(0, 10)
  const hidden = skills.length - 10
  if (!skills.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
      {visible.map((s: string) => (
        <span key={s} style={{
          fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
          background: 'rgba(16,185,129,0.08)', color: TEAL,
          border: '1px solid rgba(16,185,129,0.2)',
        }}>{s}</span>
      ))}
      {!expanded && hidden > 0 && (
        <button onClick={() => setExpanded(true)} style={{
          fontSize: '11px', padding: '2px 10px', borderRadius: '4px',
          background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
          border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontWeight: 600,
        }}>+{hidden} more</button>
      )}
      {expanded && (
        <button onClick={() => setExpanded(false)} style={{
          fontSize: '11px', padding: '2px 10px', borderRadius: '4px',
          background: 'transparent', color: 'rgba(255,255,255,0.25)',
          border: 'none', cursor: 'pointer',
        }}>Show less</button>
      )}
    </div>
  )
}

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface Track {
  track_id: string
  track_name: string
  track_color: string
  target_roles?: string[]
  target_seniority?: string | null
  salary_min_lpa?: number | null
  salary_target_lpa?: number | null
  work_mode_preference?: string[]
  aspiration_skills?: string[]
  personal_notes?: string | null
}

interface DashboardTabsProps {
  userId: string
  userEmail: string
  userName: string
  cohort: string | null
  tier: string
  tracks: Track[]
  matchedJobs: number
  applicationsTracked: number
  topMatchScore: number
  generationCount: number
  profileSkills?: string[]
  hasProfile: boolean
  hasTracks: boolean
  initialTab?: string
  salaryTargetLpa?: number
  impactPattern?: string
}

const COLOR_MAP: Record<string, string> = {
  teal: '#10B981', purple: '#7F77DD',
  blue: '#3B82F6', amber: '#F59E0B', coral: '#F97316',
}

export default function DashboardTabs({
  userId, userEmail, userName, cohort, tier,
  tracks, matchedJobs, applicationsTracked,
  topMatchScore, generationCount, profileSkills = [],
  hasProfile, hasTracks, initialTab, impactPattern = '', salaryTargetLpa,
}: DashboardTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const tabFromUrl = searchParams.get('tab')
  const defaultTab = tabFromUrl || initialTab || (hasTracks ? 'career' : 'profile')
  const [activeTab, setActiveTabState] = useState<string>(defaultTab)
  const [trackerKey, setTrackerKey] = useState(0)

  // Two-way URL sync — changing tabs updates the URL (enables back/forward,
  // bookmarking, and direct links), and is the single source of truth for
  // which tab renders. Sub-tab navigation (Prep/Tools sections) also gets
  // a query param so those are linkable/shareable too.
  const [activeSection, setActiveSectionState] = useState<string | undefined>(
    searchParams.get('section') || undefined
  )

  // Tab changes go through Next's router (server round-trip is fine — tabs
  // load different heavy components). Section changes are purely
  // client-side state with a lightweight history.replaceState for
  // bookmarking — going through router.push for sub-tabs caused a full
  // server re-render and 1.5s+ delay for what should be instant.
  const setActiveTab = useCallback((tab: string, section?: string) => {
    setActiveTabState(tab)
    setActiveSectionState(section)

    const newParams = new URLSearchParams(window.location.search)
    newParams.set('tab', tab)
    if (section) {
      newParams.set('section', section)
    } else {
      newParams.delete('section')
    }

    if (tab !== activeTab) {
      // Tab actually changed — real navigation needed (different component tree)
      router.push(`${pathname}?${newParams.toString()}`, { scroll: false })
    } else {
      // Same tab, just a different section — update the URL without
      // triggering Next's server-component fetch
      window.history.replaceState(null, '', `${pathname}?${newParams.toString()}`)
    }
  }, [pathname, router, activeTab])
  const [searchStatus, setSearchStatus] = useState('ACTIVE')
  const [showOnboarding, setShowOnboarding] = useState(!hasProfile)

  const handleSearchStatusChange = async (status: string) => {
    setSearchStatus(status)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, search_status: status }),
      })
    } catch {}
  }

  if (showOnboarding) {
    return (
      <OnboardingFlow
        userId={userId}
        userName={userName}
        onComplete={() => {
          window.location.href = '/dashboard?tab=career'
        }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        userId={userId}
        userEmail={userEmail}
        userName={userName}
        cohort={cohort}
        tier={tier}
        activeTab={activeTab}
        activeSection={activeSection}
        setActiveTab={(tab, section) => {
          if (tab === 'pipeline') setTrackerKey(prev => prev + 1)
          setActiveTab(tab, section)
        }}
        hasProfile={hasProfile}
        hasTracks={hasTracks}
        tracks={tracks}
        impactPattern={impactPattern}
        searchStatus={searchStatus}
        onSearchStatusChange={handleSearchStatusChange}
      />

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 2rem' }}>

          {/* Welcome heading — hidden on Career tab */}
          {activeTab !== 'career' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 6px', letterSpacing: '-1px' }}>
              Welcome back, <span className="cs-shimmer">{userName}</span>
            </h1>
            {!hasProfile && (
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Upload your resume to get started.
              </p>
            )}
            {hasProfile && !hasTracks && (
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: '0 0 10px' }}>
                Profile ready —{' '}
                <span className="cs-highlight">set up your first career track</span>{' '}
                to unlock your job feed.
              </p>
            )}
            {hasProfile && hasTracks && (
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: '0 0 10px' }}>
                Your ranked job feed is ready.{' '}
                <span className="cs-highlight">⚡ {matchedJobs} roles matched</span>
              </p>
            )}
            {hasProfile && profileSkills.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <ExpandableSkills skills={profileSkills} />
              </div>
            )}
          </div>
          )}

          {/* Stats row */}
          {hasProfile && hasTracks && activeTab !== 'career' && (
            <StatsRow
              matchedJobs={matchedJobs}
              applicationsTracked={applicationsTracked}
              topMatchScore={topMatchScore}
              generationCount={generationCount}
            />
          )}

          {/* Discover tab */}
          {activeTab === 'discover' && hasTracks && (
            <DiscoveryFeed
              userId={userId}
              tracks={tracks}
              profileSkills={profileSkills}
              tier={tier}
              onDownload={() => {
                setTrackerKey(prev => prev + 1)
                setActiveTab('pipeline')
              }}
            />
          )}

          {activeTab === 'discover' && !hasTracks && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <p style={{ fontSize: '32px', marginBottom: '1rem' }}>⚡</p>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>
                Set up a career track first
              </p>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: '0 0 1.5rem' }}>
                Your ranked job feed will appear here once you define what you are targeting.
              </p>
              <button
                onClick={() => setActiveTab('profile')}
                style={{
                  padding: '10px 24px', borderRadius: '8px',
                  background: TEAL, color: '#fff',
                  border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Go to Profile →
              </button>
            </div>
          )}

          {/* Career tab */}
          {activeTab === 'career' && (
            <div style={{ paddingTop: '8px' }}>
              <CareerDNA userId={userId} skills={profileSkills} />
            </div>
          )}
          
          {/* Pipeline tab */}
          {activeTab === 'pipeline' && (
            <KanbanBoard key={trackerKey} userId={userId} />
          )}

          {/* Prep tab */}
          {activeTab === 'prep' && (
            <PrepTab userId={userId} tier={tier} initialSection={activeSection} />
          )}

          {/* Tools tab */}
          {activeTab === 'tools' && (
            <ToolsTab userId={userId} tier={tier} initialSection={activeSection} />
          )}

          {/* Profile tab — minimal setup only */}
          {activeTab === 'profile' && (
            <ProfileTab
              userId={userId}
              tracks={tracks}
              hasProfile={hasProfile}
              onTrackCreated={() => setActiveTab('discover')}
              tier={tier}
            />
          )}

          {/* Settings tab */}
          {activeTab === 'settings' && (
            <SettingsTab
              userId={userId}
              tracks={tracks}
              onTrackCreated={() => setActiveTab('discover')}
              tier={tier}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileTab({
  userId, tracks, hasProfile, onTrackCreated, tier,
}: {
  userId: string
  tracks: Track[]
  hasProfile: boolean
  onTrackCreated: () => void
  tier?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Upload section */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 4px' }}>
          YOUR VAULT
        </p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '0 0 1rem', lineHeight: 1.6 }}>
          Add resumes, LinkedIn exports, certifications and project docs. Career Sage extracts your profile automatically.
        </p>
        <VaultUpload onExtractionComplete={() => setTimeout(() => window.location.reload(), 2000)} />
        <div style={{ marginTop: '1.5rem' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 10px' }}>
            YOUR UPLOADED FILES
          </p>
          <DocumentManager userId={userId} />
        </div>
      </div>

      {/* Contact details */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 4px' }}>CONTACT DETAILS</p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 1rem', lineHeight: 1.5 }}>
          These appear in your generated resume automatically.
        </p>
        <ContactDetailsForm userId={userId} />
      </div>

    </div>
  )
}


function SettingsTab({
  userId, tracks, onTrackCreated, tier,
}: {
  userId: string
  tracks: Track[]
  onTrackCreated: () => void
  tier?: string
}) {
  const [showAddTrack, setShowAddTrack] = useState(false)
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null)
  const isPro = tier === 'PREMIUM_PRO' || tier === 'STUDENT_VERIFIED'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Career tracks */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 4px' }}>
          CAREER TRACKS
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Each track targets a specific function and level. Your job feed, resume generation, and match scores are built around your active track.
        </p>

        {tracks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
            {tracks.map(track => {
              const hex = COLOR_MAP[track.track_color] ?? TEAL
              const isEditingThis = editingTrackId === track.track_id
              return (
                <div key={track.track_id}>
                  <div style={{
                    padding: '10px 14px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isEditingThis ? hex : 'rgba(255,255,255,0.07)'}`,
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: hex }} />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}>{track.track_name}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: `${hex}18`, color: hex }}>Active</span>
                    <button
                      onClick={() => setEditingTrackId(isEditingThis ? null : track.track_id)}
                      style={{
                        marginLeft: 'auto', background: 'none', border: 'none',
                        color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '12px',
                      }}
                    >
                      {isEditingThis ? 'Cancel' : '✎ Edit'}
                    </button>
                  </div>
                  {isEditingThis && (
                    <div style={{ marginTop: '10px', padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}` }}>
                      <TrackSetup
                        userId={userId}
                        existingTrack={track}
                        onComplete={() => { setEditingTrackId(null); window.location.reload() }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* No tracks yet — show creation form directly */}
        {tracks.length === 0 && (
          <>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 10px' }}>
              CREATE YOUR FIRST TRACK
            </p>
            <TrackSetup userId={userId} onComplete={onTrackCreated} />
          </>
        )}

        {/* Has tracks — show add button, gated by Pro */}
        {tracks.length > 0 && !showAddTrack && (
          <button
            onClick={() => {
              if (!isPro && tracks.length >= 1) {
                alert('Upgrade to Pro for unlimited career tracks.')
                return
              }
              setShowAddTrack(true)
            }}
            style={{
              padding: '10px 16px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`,
              color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', width: '100%', textAlign: 'left',
            }}
          >
            + Add another track {!isPro && '(Pro only)'}
          </button>
        )}

        {tracks.length > 0 && showAddTrack && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: 0 }}>
                ADD ANOTHER TRACK
              </p>
              <button
                onClick={() => setShowAddTrack(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '12px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
            <TrackSetup userId={userId} onComplete={() => { setShowAddTrack(false); onTrackCreated() }} />
          </div>
        )}
      </div>

      {/* Job preferences */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 6px' }}>JOB PREFERENCES</p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Salary target, company stage, work mode, and compensation. Career Sage weights your match scores accordingly.
        </p>
        <PreferencesPanel userId={userId} />
      </div>

    </div>
  )
}
