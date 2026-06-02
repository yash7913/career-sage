'use client'
import { useState } from 'react'
import DiscoveryFeed from '@/components/jobs/DiscoveryFeed'
import KanbanBoard from '@/components/tracker/KanbanBoard'
import VaultUpload from '@/components/profile/VaultUpload'
import TrackSetup from '@/components/profile/TrackSetup'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface Track {
  track_id: string
  track_name: string
  track_color: string
}

export default function DashboardTabs({ userId, tracks }: { userId: string; tracks: Track[] }) {
  const [activeTab, setActiveTab] = useState<'feed' | 'tracker'>('feed')

  return (
    <div>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {[
          { key: 'feed', label: '⚡ Discovery Feed' },
          { key: 'tracker', label: '📋 Pipeline Tracker' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'feed' | 'tracker')}
            style={{
              padding: '8px 18px', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600,
              background: activeTab === tab.key ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
              color: activeTab === tab.key ? TEAL : 'rgba(255,255,255,0.45)',
              border: `1px solid ${activeTab === tab.key ? 'rgba(16,185,129,0.3)' : BORDER}`,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Discovery feed tab */}
      {activeTab === 'feed' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'flex-start' }}>
          <DiscoveryFeed userId={userId} tracks={tracks} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '1.25rem' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 10px' }}>YOUR VAULT</p>
              <VaultUpload />
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '1.25rem' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 10px' }}>ADD TRACK</p>
              <TrackSetup userId={userId} />
            </div>
          </div>
        </div>
      )}

      {/* Pipeline tracker tab */}
      {activeTab === 'tracker' && (
        <KanbanBoard userId={userId} />
      )}
    </div>
  )
}