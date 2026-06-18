'use client'
import { useState } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

interface SidebarProps {
  userId: string
  userEmail: string
  userName: string
  cohort: string | null
  tier: string
  activeTab: string
  setActiveTab: (tab: string) => void
  hasProfile: boolean
  hasTracks: boolean
  tracks: { track_id: string; track_name: string; track_color: string }[]
  impactPattern?: string
  searchStatus?: string
  onSearchStatusChange?: (status: string) => void
}

const COLOR_MAP: Record<string, string> = {
  teal: '#10B981', purple: '#7F77DD',
  blue: '#3B82F6', amber: '#F59E0B', coral: '#F97316',
}

const TIER_COLORS: Record<string, string> = {
  STUDENT_VERIFIED: '#10B981',
  PREMIUM_PRO: '#7F77DD',
  GENERAL_FREE: 'rgba(255,255,255,0.4)',
}

const TIER_LABELS: Record<string, string> = {
  STUDENT_VERIFIED: 'Academic',
  PREMIUM_PRO: 'Pro',
  GENERAL_FREE: 'Free',
}

const COHORT_COLORS: Record<string, string> = {
  'Technical PM': '#3B82F6',
  'Data-Oriented PM': '#10B981',
  'Growth PM': '#F59E0B',
  'Analytics Engineer': '#7F77DD',
  'Data Scientist': '#06B6D4',
  'Full-Stack Engineer': '#F97316',
  'ML Engineer': '#EC4899',
}

const IMPACT_DESCRIPTIONS: Record<string, string> = {
  Builder: 'You create new things from scratch — 0-to-1 products, greenfield projects.',
  Scaler: 'You grow things — take products from 1-to-100, expand markets and teams.',
  Optimizer: 'You improve existing systems — measurable efficiency gains and process improvements.',
  Fixer: 'You turn things around — step into broken situations and restore order.',
  Strategist: 'You set direction — roadmaps, vision, cross-functional alignment.',
}

const STATUS_OPTIONS = [
  { key: 'ACTIVE', label: 'Actively Looking', color: '#10B981', pulse: true },
  { key: 'OPEN', label: 'Open to Offers', color: '#F59E0B', pulse: false },
  { key: 'PAUSED', label: 'Not Looking', color: 'rgba(255,255,255,0.3)', pulse: false },
]

export default function Sidebar({
  userId, userEmail, userName, cohort, tier,
  activeTab, setActiveTab, hasProfile, hasTracks, tracks,
  impactPattern, searchStatus = 'ACTIVE', onSearchStatusChange,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  const cohortColor = cohort ? (COHORT_COLORS[cohort] ?? TEAL) : TEAL
  const tierColor = TIER_COLORS[tier] ?? 'rgba(255,255,255,0.4)'
  const tierLabel = TIER_LABELS[tier] ?? 'Free'
  const currentStatus = STATUS_OPTIONS.find(s => s.key === searchStatus) || STATUS_OPTIONS[0]

  const fullySetUp = hasProfile

  const navItems = fullySetUp
  ? [
      { key: 'career', icon: '🧬', label: 'Career', locked: false },
      { key: 'discover', icon: '⚡', label: 'Discover', locked: false },
      { key: 'pipeline', icon: '📋', label: 'Pipeline', locked: false },
      { key: 'prep', icon: '🎯', label: 'Prep', locked: false },
      { key: 'tools', icon: '🛠', label: 'Tools', locked: false },
      { key: 'profile', icon: '👤', label: 'Profile', locked: false },
    ]
  : [
      { key: 'profile', icon: '👤', label: 'Profile', locked: false },
      { key: 'career', icon: '🧬', label: 'Career', locked: !hasProfile },
      { key: 'discover', icon: '⚡', label: 'Discover', locked: !hasProfile },
      { key: 'pipeline', icon: '📋', label: 'Pipeline', locked: !hasProfile },
      { key: 'prep', icon: '🎯', label: 'Prep', locked: !hasProfile },
      { key: 'tools', icon: '🛠', label: 'Tools', locked: !hasProfile },
    ]

  return (
    <div className="cs-sidebar-wrap" style={{
      width: collapsed ? '60px' : '220px',
      minHeight: '100vh',
      background: '#0d1117',
      borderRight: `1px solid ${BORDER}`,
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Logo + collapse */}
      <div style={{
        padding: collapsed ? '1.25rem 0' : '1.25rem 1.25rem',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        flexShrink: 0,
      }}>
        {!collapsed && (
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '7px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', flexShrink: 0,
            }}>⚡</div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
              Career Sage
            </span>
          </a>
        )}
        {collapsed && (
          <a href="/" style={{ textDecoration: 'none' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '7px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px',
            }}>⚡</div>
          </a>
        )}
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)',
            cursor: 'pointer', fontSize: '16px', padding: '2px',
          }}>‹</button>
        )}
      </div>

      {/* User identity */}
      {!collapsed && (
        <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${tierColor}, ${tierColor}88)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {userName[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userName}
              </p>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userEmail}
              </p>
            </div>
          </div>

          {/* Badges row */}
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {cohort && (
              <span style={{
                fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '999px',
                background: `${cohortColor}15`, color: cohortColor, border: `1px solid ${cohortColor}30`,
              }}>{cohort}</span>
            )}
            <span style={{
              fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '999px',
              background: `${tierColor}15`, color: tierColor, border: `1px solid ${tierColor}30`,
            }}>{tierLabel}</span>
            {impactPattern && (
              <span
                title={IMPACT_DESCRIPTIONS[impactPattern] || impactPattern}
                style={{
                  fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '999px',
                  background: 'rgba(245,158,11,0.12)', color: '#F59E0B',
                  border: '1px solid rgba(245,158,11,0.25)', cursor: 'help',
                }}
              >
                {impactPattern === 'Builder' ? '🏗️' :
                 impactPattern === 'Scaler' ? '📈' :
                 impactPattern === 'Optimizer' ? '⚙️' :
                 impactPattern === 'Fixer' ? '🔧' : '🎯'} {impactPattern}
              </span>
            )}
          </div>

          {/* Search status toggle */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '4px 8px', borderRadius: '6px',
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
                cursor: 'pointer', width: '100%',
              }}
            >
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: currentStatus.color, flexShrink: 0,
              }} />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', flex: 1, textAlign: 'left' }}>
                {currentStatus.label}
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>▾</span>
            </button>

            {showStatusMenu && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: '#161b22', border: `1px solid ${BORDER}`,
                borderRadius: '8px', marginTop: '4px', overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      onSearchStatusChange?.(opt.key)
                      setShowStatusMenu(false)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 12px', width: '100%', border: 'none',
                      background: searchStatus === opt.key ? 'rgba(255,255,255,0.05)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: searchStatus === opt.key ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main nav */}
      <nav style={{ flex: 1, padding: collapsed ? '1rem 0' : '1rem 0.75rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '1rem' }}>
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => !item.locked && setActiveTab(item.key)}
              title={item.locked ? 'Complete your profile first' : item.label}
              style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : '10px',
                padding: collapsed ? '10px 0' : '9px 12px',
                borderRadius: '9px', border: 'none',
                cursor: item.locked ? 'not-allowed' : 'pointer',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: activeTab === item.key ? 'rgba(16,185,129,0.12)' : 'transparent',
                transition: 'all 0.15s', width: '100%',
                opacity: item.locked ? 0.35 : 1,
                boxShadow: activeTab === item.key ? 'inset 0 0 0 1px rgba(16,185,129,0.25)' : 'none',
              }}
            >
              <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && (
                <span style={{
                  fontSize: '13px', fontWeight: activeTab === item.key ? 600 : 400,
                  color: activeTab === item.key ? TEAL : 'rgba(255,255,255,0.5)',
                }}>
                  {item.label}
                </span>
              )}
              {!collapsed && item.locked && (
                <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>🔒</span>
              )}
            </button>
          ))}
        </div>

        {/* Active tracks */}
        {!collapsed && hasTracks && tracks.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            <p style={{
              fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px 12px',
            }}>TRACKS</p>
            {tracks.map(track => {
              const hex = COLOR_MAP[track.track_color] ?? TEAL
              return (
                <button
                  key={track.track_id}
                  onClick={() => setActiveTab('discover')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '7px 12px', borderRadius: '8px',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', width: '100%', transition: 'background 0.15s',
                  }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: hex, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {track.track_name}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div style={{
        padding: collapsed ? '1rem 0' : '1rem 0.75rem',
        borderTop: `1px solid ${BORDER}`,
        flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        
        {collapsed && (
          <button onClick={() => setCollapsed(false)} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)',
            cursor: 'pointer', fontSize: '16px', padding: '6px 0', textAlign: 'center', width: '100%',
          }}>›</button>
        )}
        {!collapsed && (
          <a href="/" style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 12px', borderRadius: '8px',
            textDecoration: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '13px',
          }}>
            <span style={{ fontSize: '14px' }}>←</span>
            Home
          </a>
        )}
      </div>
    </div>
  )
}
