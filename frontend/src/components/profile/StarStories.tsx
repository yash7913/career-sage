'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

interface Story {
  theme: string
  title: string
  situation: string
  task: string
  action: string
  result: string
  keywords: string[]
}

const THEME_COLORS: Record<string, string> = {
  'Leadership': '#7F77DD',
  'Problem Solving': TEAL,
  'Data-Driven Decision': '#3B82F6',
  'Conflict Resolution': '#F59E0B',
  'Failure and Learning': '#F97316',
  'Behavioural': '#EC4899',
}

const SECTIONS = ['situation', 'task', 'action', 'result'] as const

export default function StarStories({ userId }: { userId: string }) {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [activeStory, setActiveStory] = useState(0)
  const [copied, setCopied] = useState<string | null>(null)
  const [showTweak, setShowTweak] = useState(false)
  const [tweak, setTweak] = useState('')

  useEffect(() => {
    loadStories()
  }, [])

  const [quotaError, setQuotaError] = useState<string | null>(null)

  const loadStories = async (forceRegenerate = false, userTweak = '') => {
    if (forceRegenerate) setRegenerating(true)
    else setLoading(true)
    setQuotaError(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/generate-star-stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          force_regenerate: forceRegenerate,
          user_tweak: userTweak || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setStories(data.stories || [])
      } else if (res.status === 429) {
        const data = await res.json()
        // Keep whatever stories are already showing — quota only blocks
        // generating NEW ones, never hides what's already there
        setQuotaError(data.detail?.message || 'Monthly generation limit reached.')
      }
    } finally {
      setLoading(false)
      setRegenerating(false)
    }
  }

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const copyFullStory = (story: Story) => {
    const text = `**${story.theme}: ${story.title}**\n\n**Situation:** ${story.situation}\n\n**Task:** ${story.task}\n\n**Action:** ${story.action}\n\n**Result:** ${story.result}`
    handleCopy('full', text)
  }

  if (loading) return (
    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
      Generating your STAR stories...
    </p>
  )

  if (!stories.length) return (
    <div>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
        No stories generated yet.
      </p>
      {quotaError && (
        <div style={{
          marginTop: '10px', padding: '10px 14px', borderRadius: '8px',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <p style={{ fontSize: '12px', color: 'rgba(245,158,11,0.9)', margin: 0 }}>
            ⚠ {quotaError}
          </p>
        </div>
      )}
    </div>
  )

  const story = stories[activeStory]
  const themeColor = THEME_COLORS[story?.theme] || TEAL

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Story selector */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {stories.map((s, i) => {
          const color = THEME_COLORS[s.theme] || TEAL
          return (
            <button key={s.theme} onClick={() => setActiveStory(i)} style={{
              padding: '5px 14px', borderRadius: '999px',
              border: `1px solid ${activeStory === i ? color : BORDER}`,
              background: activeStory === i ? `${color}15` : 'transparent',
              color: activeStory === i ? color : 'rgba(255,255,255,0.4)',
              fontSize: '12px', fontWeight: activeStory === i ? 600 : 400,
              cursor: 'pointer',
            }}>
              {s.theme}
            </button>
          )
        })}
      </div>

      {/* Active story */}
      {story && (
        <div style={{
          borderRadius: '12px', overflow: 'hidden',
          border: `1px solid ${themeColor}25`,
          background: `${themeColor}05`,
        }}>
          {/* Story header */}
          <div style={{
            padding: '1rem 1.25rem',
            borderBottom: `1px solid ${BORDER}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: themeColor, margin: '0 0 4px', letterSpacing: '0.08em' }}>
                {story.theme.toUpperCase()}
              </p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>
                {story.title}
              </p>
            </div>
            <button
              onClick={() => copyFullStory(story)}
              style={{
                padding: '5px 14px', borderRadius: '7px',
                background: copied === 'full' ? `${themeColor}20` : 'rgba(255,255,255,0.06)',
                color: copied === 'full' ? themeColor : 'rgba(255,255,255,0.4)',
                border: `1px solid ${copied === 'full' ? themeColor + '40' : BORDER}`,
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {copied === 'full' ? '✓ Copied' : 'Copy full story'}
            </button>
          </div>

          {/* STAR sections */}
          <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {SECTIONS.map(section => (
              <div key={section} style={{
                padding: '10px 14px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${BORDER}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: themeColor, margin: 0, letterSpacing: '0.08em' }}>
                    {section.toUpperCase()}
                  </p>
                  <button
                    onClick={() => handleCopy(section, story[section])}
                    style={{
                      padding: '2px 8px', borderRadius: '5px',
                      background: 'transparent', border: `1px solid ${BORDER}`,
                      color: 'rgba(255,255,255,0.3)', fontSize: '10px', cursor: 'pointer',
                    }}
                  >
                    {copied === section ? '✓' : 'Copy'}
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.65 }}>
                  {story[section]}
                </p>
              </div>
            ))}

            {/* Keywords */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {story.keywords.map(kw => (
                <span key={kw} style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                  background: `${themeColor}10`, color: themeColor,
                  border: `1px solid ${themeColor}25`,
                }}>
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {quotaError && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <p style={{ fontSize: '12px', color: 'rgba(245,158,11,0.9)', margin: 0 }}>
            ⚠ {quotaError} You can still view and copy your existing stories above.
          </p>
        </div>
      )}

      {/* Tweak + regenerate */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={() => setShowTweak(!showTweak)}
          style={{
            padding: '7px', borderRadius: '8px',
            background: 'transparent', border: `1px solid ${BORDER}`,
            color: 'rgba(255,255,255,0.35)', fontSize: '12px', cursor: 'pointer',
          }}
        >
          {showTweak ? '▲ Hide tweak options' : '✎ Tweak stories'}
        </button>

        {showTweak && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <textarea
              value={tweak}
              onChange={e => setTweak(e.target.value)}
              placeholder="e.g. Focus more on my Salesforce work, emphasise leadership over technical skills, make results more specific..."
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
                color: '#fff', fontSize: '12px', resize: 'vertical',
                boxSizing: 'border-box', outline: 'none', lineHeight: 1.6,
                fontFamily: 'system-ui',
              }}
            />
            <button
              onClick={() => { loadStories(true, tweak); setShowTweak(false) }}
              disabled={regenerating}
              style={{
                padding: '9px', borderRadius: '8px',
                background: regenerating ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff', border: 'none', fontSize: '13px',
                fontWeight: 700, cursor: regenerating ? 'not-allowed' : 'pointer',
              }}
            >
              {regenerating ? '⟳ Regenerating...' : '⚡ Regenerate with tweak'}
            </button>
          </div>
        )}

        {!showTweak && (
          <button
            onClick={() => loadStories(true)}
            disabled={regenerating}
            style={{
              padding: '7px', borderRadius: '8px',
              background: 'transparent', border: `1px solid ${BORDER}`,
              color: 'rgba(255,255,255,0.25)', fontSize: '12px',
              cursor: regenerating ? 'not-allowed' : 'pointer',
            }}
          >
            {regenerating ? '⟳ Regenerating...' : '↺ Regenerate all stories'}
          </button>
        )}
      </div>
    </div>
  )
}