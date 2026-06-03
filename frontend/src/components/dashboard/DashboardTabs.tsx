'use client'
import { useState } from 'react'
import DiscoveryFeed from '@/components/jobs/DiscoveryFeed'
import KanbanBoard from '@/components/tracker/KanbanBoard'
import VaultUpload from '@/components/profile/VaultUpload'
import TrackSetup from '@/components/profile/TrackSetup'
import StatsRow from '@/components/dashboard/StatsRow'

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
  tracks: Track[]
  matchedJobs: number
  applicationsTracked: number
  topMatchScore: number
  generationCount: number
  profileSkills?: string[]
}

const TABS = [
  { key: 'discover', label: 'Discover', icon: '⚡' },
  { key: 'pipeline', label: 'Pipeline', icon: '📋' },
  { key: 'profile', label: 'Profile', icon: '👤' },
]
export default function DashboardTabs({
  userId, tracks, matchedJobs, applicationsTracked, topMatchScore, generationCount, profileSkills = []
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'discover' | 'pipeline' | 'profile'>('discover')
  const [trackerKey, setTrackerKey] = useState(0)

  return (
    <div>
      {/* Stats row */}
      <StatsRow
        matchedJobs={matchedJobs}
        applicationsTracked={applicationsTracked}
        topMatchScore={topMatchScore}
        generationCount={generationCount}
      />

      {/* Tab switcher — pill style */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '2rem',
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${BORDER}`,
        borderRadius: '12px',
        padding: '4px',
        width: 'fit-content',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              if (tab.key === 'pipeline') setTrackerKey(prev => prev + 1)
              setActiveTab(tab.key as 'discover' | 'pipeline' | 'profile')
            }}
            style={{
              padding: '8px 20px',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              background: activeTab === tab.key
                ? 'rgba(16,185,129,0.15)'
                : 'transparent',
              color: activeTab === tab.key
                ? TEAL
                : 'rgba(255,255,255,0.4)',
              boxShadow: activeTab === tab.key
                ? 'inset 0 0 0 1px rgba(16,185,129,0.3)'
                : 'none',
            }}
          >
            <span style={{ fontSize: '14px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Discover tab */}
      {activeTab === 'discover' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gap: '20px',
          alignItems: 'flex-start',
        }}>
          <DiscoveryFeed
            userId={userId}
            tracks={tracks}
            profileSkills={profileSkills || []}
            onDownload={() => {
              setTrackerKey(prev => prev + 1)
              setActiveTab('pipeline')
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Vault */}
            <div style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: '14px',
              padding: '1.25rem',
            }}>
              <p style={{
                fontSize: '11px', fontWeight: 700, color: TEAL,
                letterSpacing: '0.1em', margin: '0 0 10px',
              }}>
                YOUR VAULT
              </p>
              <VaultUpload />
            </div>
            {/* Add track */}
            <div style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: '14px',
              padding: '1.25rem',
            }}>
              <p style={{
                fontSize: '11px', fontWeight: 700, color: TEAL,
                letterSpacing: '0.1em', margin: '0 0 10px',
              }}>
                ADD TRACK
              </p>
              <TrackSetup userId={userId} />
            </div>
          </div>
        </div>
      )}

      {/* Pipeline tab */}
      {activeTab === 'pipeline' && (
        <KanbanBoard key={trackerKey} userId={userId} />
      )}

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <ProfileTab userId={userId} tracks={tracks} />
      )}
    </div>
  )
}

function ProfileTab({ userId, tracks }: { userId: string; tracks: Track[] }) {
  const CARD = '#161b22'
  const BORDER = 'rgba(255,255,255,0.07)'
  const TEAL = '#10B981'

  const colorMap: Record<string, string> = {
    teal: '#10B981', purple: '#7F77DD',
    blue: '#3B82F6', amber: '#F59E0B', coral: '#F97316',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      {/* Career tracks */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 1rem' }}>CAREER TRACKS</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
          {tracks.map(track => {
            const hex = colorMap[track.track_color] ?? TEAL
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
        <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '1rem 0 10px' }}>ADD A TRACK</p>
        <TrackSetup userId={userId} />
      </div>

      {/* Document vault */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 1rem' }}>DOCUMENT VAULT</p>
        <VaultUpload />
      </div>

      {/* Generative assets — coming soon */}
      <div style={{
        background: CARD, border: `1px solid ${BORDER}`,
        borderRadius: '16px', padding: '1.5rem',
        gridColumn: '1 / -1',
      }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 6px' }}>GENERATIVE PROFILE ASSETS</p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 1rem' }}>
          One-click generation of LinkedIn summary, elevator pitch, and bio variations — coming in Day 11.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {['LinkedIn Summary', 'Elevator Pitch', 'Short Bio', 'Personal Brand Statement'].map(asset => (
            <div key={asset} style={{
              padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${BORDER}`,
              opacity: 0.5,
            }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, fontWeight: 500 }}>{asset}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: '4px 0 0' }}>Coming soon</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}