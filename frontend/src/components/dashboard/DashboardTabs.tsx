'use client'
import { useState } from 'react'
import DiscoveryFeed from '@/components/jobs/DiscoveryFeed'
import KanbanBoard from '@/components/tracker/KanbanBoard'
import VaultUpload from '@/components/profile/VaultUpload'
import TrackSetup from '@/components/profile/TrackSetup'
import StatsRow from '@/components/dashboard/StatsRow'
import Sidebar from '@/components/dashboard/Sidebar'
import ContactDetailsForm from '@/components/profile/ContactDetailsForm'
import PreferencesPanel from '@/components/profile/PreferencesPanel'
import PentagramScore from '@/components/profile/PentagramScore'
import ProfileIntelligence from '@/components/profile/ProfileIntelligence'
import GenerativeAssets from '@/components/profile/GenerativeAssets'
import StarStories from '@/components/profile/StarStories'
import OfferAnalyser from '@/components/profile/OfferAnalyser'

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
        <button
          onClick={() => setExpanded(true)}
          style={{
            fontSize: '11px', padding: '2px 10px', borderRadius: '4px',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          +{hidden} more
        </button>
      )}
      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          style={{
            fontSize: '11px', padding: '2px 10px', borderRadius: '4px',
            background: 'transparent',
            color: 'rgba(255,255,255,0.25)',
            border: 'none', cursor: 'pointer',
          }}
        >
          Show less
        </button>
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
  hasProfile, hasTracks, initialTab, impactPattern = '',salaryTargetLpa,
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
		
	{/* Welcome heading */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 6px', letterSpacing: '-1px' }}>
              Welcome back,{' '}
              <span className="cs-shimmer">{userName}</span>
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
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                Your ranked job feed is ready.{' '}
                <span className="cs-highlight">⚡ {matchedJobs} roles matched</span>
                {impactPattern && (
                  <span
                    title={
                      impactPattern === 'Builder' ? 'Builder — you create new things from scratch. 0-to-1 products, greenfield projects, founding teams.' :
                      impactPattern === 'Scaler' ? 'Scaler — you grow things. You take products from 1-to-100, expand markets, scale teams.' :
                      impactPattern === 'Optimizer' ? 'Optimizer — you improve existing systems. Your work history shows measurable efficiency gains, process improvements, and cost reductions.' :
                      impactPattern === 'Fixer' ? 'Fixer — you turn things around. You step into broken situations and restore order.' :
                      'Strategist — you set direction. Roadmaps, vision, cross-functional alignment.'
                    }
                    style={{
                      fontSize: '12px', fontWeight: 600,
                      padding: '2px 10px', borderRadius: '999px',
                      background: 'rgba(245,158,11,0.12)',
                      color: '#F59E0B',
                      border: '1px solid rgba(245,158,11,0.25)',
                      cursor: 'help',
                    }}>
                    {impactPattern === 'Builder' ? '🏗️' :
                     impactPattern === 'Scaler' ? '📈' :
                     impactPattern === 'Optimizer' ? '⚙️' :
                     impactPattern === 'Fixer' ? '🔧' : '🎯'} {impactPattern}
                    <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.6 }}>(?)</span>
                  </span>
                )}
              </p>
            )}
            {hasProfile && profileSkills.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <ExpandableSkills skills={profileSkills} />
              </div>
            )}
          </div>

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

      {/* Profile intelligence */}
      {hasProfile && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 1.5rem' }}>
            PROFILE INTELLIGENCE
          </p>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <PentagramScore userId={userId} size={280} variant="full" />
            <div style={{ flex: 1, minWidth: '220px' }}>
              <ProfileIntelligence userId={userId} />
            </div>
          </div>
        </div>
      )}

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
          setTimeout(() => window.location.reload(), 2000)
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

      {/* Job preferences */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 6px' }}>JOB PREFERENCES</p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Set your salary target and preferred company stage. Career Sage weights your match scores accordingly.
        </p>
        <PreferencesPanel userId={userId} />
      </div>

      {/* Generative profile assets */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 4px' }}>
          GENERATIVE PROFILE ASSETS
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
          One-click generation of LinkedIn summaries, elevator pitches, bios, and personal brand statements — all tailored to your profile.
        </p>
        <GenerativeAssets userId={userId} tier={tier} />
      </div>

      {/* STAR story bank */}
      {hasProfile && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 4px' }}>
            STAR STORY BANK
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
            5 interview-ready STAR stories generated from your work history. Copy individual sections or the full story. Tweak and regenerate anytime.
          </p>
          <StarStories userId={userId} />
        </div>
      )}

      {/* Offer analyser */}
      {hasProfile && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 4px' }}>
            OFFER ANALYSER
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
            Paste in any offer — Career Sage benchmarks it against market data, suggests a counter-offer, and writes your negotiation script.
          </p>
          <OfferAnalyser userId={userId} />
        </div>
      )}
    </div>
  )
}

