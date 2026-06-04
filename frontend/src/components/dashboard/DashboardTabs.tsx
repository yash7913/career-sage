'use client'
import { useState } from 'react'
import DiscoveryFeed from '@/components/jobs/DiscoveryFeed'
import KanbanBoard from '@/components/tracker/KanbanBoard'
import VaultUpload from '@/components/profile/VaultUpload'
import TrackSetup from '@/components/profile/TrackSetup'
import StatsRow from '@/components/dashboard/StatsRow'
import Sidebar from '@/components/dashboard/Sidebar'
import ContactDetailsForm from '@/components/profile/ContactDetailsForm'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface Track {
  track_id: string
  track_name: string
  track_color: string
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
}

const COLOR_MAP: Record<string, string> = {
  teal: '#10B981', purple: '#7F77DD',
  blue: '#3B82F6', amber: '#F59E0B', coral: '#F97316',
}

export default function DashboardTabs({
  userId, userEmail, userName, cohort, tier,
  tracks, matchedJobs, applicationsTracked,
  topMatchScore, generationCount, profileSkills = [],
  hasProfile, hasTracks, initialTab,
}: DashboardTabsProps) {
  const defaultTab = initialTab || (hasTracks ? 'discover' : 'profile')
  const [activeTab, setActiveTab] = useState<string>(defaultTab)
  const [trackerKey, setTrackerKey] = useState(0)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        userId={userId}
        userEmail={userEmail}
        userName={userName}
        cohort={cohort}
        tier={tier}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'pipeline') setTrackerKey(prev => prev + 1)
          setActiveTab(tab)
        }}
        hasProfile={hasProfile}
        hasTracks={hasTracks}
        tracks={tracks}
      />

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 2rem' }}>

          {/* Stats row — only when fully set up */}
          {hasProfile && hasTracks && (
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
                  border: 'none', fontSize: '14px',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Go to Profile →
              </button>
            </div>
          )}

          {/* Pipeline tab */}
          {activeTab === 'pipeline' && (
            <KanbanBoard key={trackerKey} userId={userId} />
          )}

          {/* Profile tab */}
          {activeTab === 'profile' && (
            <ProfileTab
              userId={userId}
              tracks={tracks}
              hasProfile={hasProfile}
              onTrackCreated={() => setActiveTab('discover')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileTab({
  userId, tracks, hasProfile, onTrackCreated,
}: {
  userId: string
  tracks: Track[]
  hasProfile: boolean
  onTrackCreated: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Upload section */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 4px' }}>
          {hasProfile ? 'YOUR VAULT' : 'STEP 01 — UPLOAD DOCUMENTS'}
        </p>
        {!hasProfile && (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '0 0 1rem', lineHeight: 1.6 }}>
            Add your resume and career documents. Career Sage extracts your skills, education, and professional summary automatically.
          </p>
        )}
        <VaultUpload onExtractionComplete={() => {
          setTimeout(() => window.location.reload(), 1500)
        }} />
      </div>

      {/* Career tracks */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 1rem' }}>
          {tracks.length > 0 ? 'YOUR CAREER TRACKS' : 'STEP 02 — SET UP CAREER TRACK'}
        </p>

        {tracks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
            {tracks.map(track => {
              const hex = COLOR_MAP[track.track_color] ?? TEAL
              return (
                <div key={track.track_id} style={{
                  padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid rgba(255,255,255,0.07)`,
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: hex }} />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}>{track.track_name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: `${hex}18`, color: hex }}>Active</span>
                </div>
              )
            })}
          </div>
        )}

        <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 10px' }}>
          {tracks.length > 0 ? 'ADD ANOTHER TRACK' : ''}
        </p>
        <TrackSetup userId={userId} onComplete={onTrackCreated} />
      </div>

      {/* Contact details */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 6px' }}>CONTACT DETAILS</p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 1rem', lineHeight: 1.5 }}>
          These appear in your generated resume automatically.
        </p>
        <ContactDetailsForm userId={userId} />
      </div>

      {/* Generative assets placeholder */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 6px' }}>GENERATIVE PROFILE ASSETS</p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 1rem' }}>
          LinkedIn summary, elevator pitch, and bio variations — coming in Day 11.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {['LinkedIn Summary', 'Elevator Pitch', 'Short Bio', 'Personal Brand'].map(asset => (
            <div key={asset} style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, opacity: 0.5 }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, fontWeight: 500 }}>{asset}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: '4px 0 0' }}>Coming soon</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}