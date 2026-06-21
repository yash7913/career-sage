'use client'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

interface MobileBottomNavProps {
  activeTab: string
  setActiveTab: (tab: string, section?: string) => void
  hasProfile: boolean
}

export default function MobileBottomNav({ activeTab, setActiveTab, hasProfile }: MobileBottomNavProps) {
  const navItems = hasProfile
    ? [
        { key: 'career',   icon: '🧬', label: 'Career' },
        { key: 'discover', icon: '⚡', label: 'Discover' },
        { key: 'pipeline', icon: '📋', label: 'Pipeline' },
        { key: 'prep',     icon: '🎯', label: 'Prep' },
        { key: 'profile',  icon: '👤', label: 'Profile' },
      ]
    : [
        { key: 'profile',  icon: '👤', label: 'Profile' },
      ]

  return (
    <nav
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: '#0d1117', borderTop: `1px solid ${BORDER}`,
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '6px 4px calc(6px + env(safe-area-inset-bottom, 0px))',
        // env(safe-area-inset-bottom) respects iPhone home-indicator area
      }}
    >
      {navItems.map(item => {
        const isActive = activeTab === item.key
        return (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              padding: '6px 10px', borderRadius: '10px', border: 'none',
              background: isActive ? 'rgba(16,185,129,0.12)' : 'transparent',
              cursor: 'pointer', flex: 1, maxWidth: '72px',
            }}
          >
            <span style={{ fontSize: '18px' }}>{item.icon}</span>
            <span style={{
              fontSize: '10px', fontWeight: isActive ? 600 : 400,
              color: isActive ? TEAL : 'rgba(255,255,255,0.4)',
            }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}