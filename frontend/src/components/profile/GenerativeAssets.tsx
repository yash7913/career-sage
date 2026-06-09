'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface AssetConfig {
  key: string
  label: string
  description: string
  group: string
  proOnly?: boolean
}

const ASSETS: AssetConfig[] = [
  { key: 'linkedin_summary', label: 'LinkedIn Summary', description: '~200 words · First person · Recruiter optimised', group: 'LinkedIn' },
  { key: 'elevator_pitch_60', label: '60-second Pitch', description: '150 words · Spoken rhythm · Full narrative', group: 'Elevator Pitch' },
  { key: 'elevator_pitch_30', label: '30-second Pitch', description: '75 words · Punchy · For quick intros', group: 'Elevator Pitch' },
  { key: 'bio_short', label: 'Short Bio', description: '50 words · Twitter · Slack · Badge', group: 'Bio Variations' },
  { key: 'bio_medium', label: 'Medium Bio', description: '150 words · Speaker bio · Portfolio', group: 'Bio Variations' },
  { key: 'bio_long', label: 'Long Bio', description: '400 words · Personal website · About page', group: 'Bio Variations', proOnly: true },
  { key: 'brand_statements', label: 'Brand Statements', description: '3 variants · One sentence · Memorable', group: 'Personal Brand' },
]

const GROUPS = ['Personal Brand', 'LinkedIn', 'Elevator Pitch', 'Bio Variations']

export default function GenerativeAssets({ userId, tier }: { userId: string; tier?: string }) {
  const [generated, setGenerated] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [activeAsset, setActiveAsset] = useState<string>('brand_statements')
  const isPro = tier === 'PREMIUM_PRO' || tier === 'STUDENT_VERIFIED'

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/${userId}`)
      .then(r => r.json())
      .then(profile => {
        const stored: Record<string, string> = {}
        ASSETS.forEach(a => {
          const val = profile[`generated_${a.key}`]
          if (val) stored[a.key] = val
        })
        setGenerated(stored)
      })
      .catch(() => {})
  }, [userId])

  const handleGenerate = async (assetKey: string) => {
    setLoading(prev => ({ ...prev, [assetKey]: true }))
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/generate-asset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, asset_type: assetKey }),
      })
      if (res.ok) {
        const data = await res.json()
        setGenerated(prev => ({ ...prev, [assetKey]: data.content }))
        setActiveAsset(assetKey)
      }
    } finally {
      setLoading(prev => ({ ...prev, [assetKey]: false }))
    }
  }

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const activeConfig = ASSETS.find(a => a.key === activeAsset)
  const activeContent = generated[activeAsset]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Asset grid */}
      {GROUPS.map(group => {
        const groupAssets = ASSETS.filter(a => a.group === group)
        return (
          <div key={group}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', margin: '0 0 8px' }}>
              {group.toUpperCase()}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {groupAssets.map(asset => {
                const isLocked = asset.proOnly && !isPro
                const hasContent = !!generated[asset.key]
                const isActive = activeAsset === asset.key
                const isLoading = loading[asset.key]

                return (
                  <div
                    key={asset.key}
                    onClick={() => hasContent && setActiveAsset(asset.key)}
                    style={{
                      padding: '10px 14px', borderRadius: '10px',
                      background: isActive ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isActive ? 'rgba(16,185,129,0.25)' : BORDER}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: hasContent ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                      opacity: isLocked ? 0.5 : 1,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 500, color: isActive ? TEAL : '#fff', margin: 0 }}>
                          {asset.label}
                        </p>
                        {hasContent && (
                          <span style={{
                            fontSize: '9px', fontWeight: 700, padding: '1px 6px',
                            borderRadius: '999px', background: 'rgba(16,185,129,0.15)', color: TEAL,
                          }}>GENERATED</span>
                        )}
                        {isLocked && (
                          <span style={{
                            fontSize: '9px', fontWeight: 700, padding: '1px 6px',
                            borderRadius: '999px', background: 'rgba(245,158,11,0.15)', color: '#F59E0B',
                          }}>PRO</span>
                        )}
                      </div>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>
                        {asset.description}
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); if (!isLocked) handleGenerate(asset.key) }}
                      disabled={isLoading || isLocked}
                      style={{
                        padding: '6px 14px', borderRadius: '7px', flexShrink: 0,
                        background: isLocked ? 'rgba(255,255,255,0.04)' :
                          hasContent ? 'rgba(255,255,255,0.06)' : 'rgba(16,185,129,0.15)',
                        color: isLocked ? 'rgba(255,255,255,0.2)' :
                          hasContent ? 'rgba(255,255,255,0.4)' : TEAL,
                        border: `1px solid ${isLocked ? BORDER : hasContent ? BORDER : 'rgba(16,185,129,0.3)'}`,
                        fontSize: '12px', fontWeight: 600,
                        cursor: isLocked || isLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isLoading ? '⟳' : hasContent ? 'Regenerate' : 'Generate'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Content preview */}
      {activeContent && activeConfig && (
        <div style={{
          padding: '1.25rem', borderRadius: '12px',
          background: '#0d1117', border: `1px solid ${BORDER}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>
              {activeConfig.label}
            </p>
            <button
              onClick={() => handleCopy(activeAsset, activeContent)}
              style={{
                padding: '5px 14px', borderRadius: '7px',
                background: copied === activeAsset ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                color: copied === activeAsset ? TEAL : 'rgba(255,255,255,0.5)',
                border: `1px solid ${copied === activeAsset ? 'rgba(16,185,129,0.3)' : BORDER}`,
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {copied === activeAsset ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          {/* Brand statements render as 3 pills */}
          {activeAsset === 'brand_statements' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeContent.split('\n').filter(l => l.trim()).map((line, i) => (
                <div key={i} style={{
                  padding: '10px 14px', borderRadius: '8px',
                  background: 'rgba(16,185,129,0.05)',
                  border: '1px solid rgba(16,185,129,0.15)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                }}>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5, flex: 1 }}>
                    {line.trim()}
                  </p>
                  <button
                    onClick={() => handleCopy(`brand_${i}`, line.trim())}
                    style={{
                      padding: '3px 10px', borderRadius: '6px', flexShrink: 0,
                      background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
                      color: 'rgba(255,255,255,0.4)', fontSize: '11px', cursor: 'pointer',
                    }}
                  >
                    {copied === `brand_${i}` ? '✓' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{
              fontSize: '13px', color: 'rgba(255,255,255,0.7)',
              margin: 0, lineHeight: 1.75, whiteSpace: 'pre-wrap',
            }}>
              {activeContent}
            </p>
          )}
        </div>
      )}
    </div>
  )
}