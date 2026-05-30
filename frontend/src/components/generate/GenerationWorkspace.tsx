'use client'
import { useState, useRef, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'
const CARD2 = '#1c2128'

interface Job {
  job_id: string
  company_name: string
  job_title: string
  location: string
  skills_needed: string[]
  identified_skill_gaps: string[]
  match_percentage_score: number
  job_description: string
  ranking_id: string
}

interface GenerationWorkspaceProps {
  job: Job
  userId: string
  trackId: string
  onClose: () => void
}

const TONE_OPTIONS = [
  { value: 'confident', label: 'Confident' },
  { value: 'formal', label: 'Formal' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'concise', label: 'Concise' },
]

export default function GenerationWorkspace({ job, userId, trackId, onClose }: GenerationWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'resume' | 'cover_letter'>('resume')
  const [userTweak, setUserTweak] = useState('')
  const [tone, setTone] = useState('confident')
  const [resumeContent, setResumeContent] = useState('')
  const [coverLetterContent, setCoverLetterContent] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [resumeContent, coverLetterContent])

  const currentContent = activeTab === 'resume' ? resumeContent : coverLetterContent
  const setCurrentContent = activeTab === 'resume' ? setResumeContent : setCoverLetterContent

  const handleGenerate = async () => {
    if (streaming) return
    setStreaming(true)
    setError('')
    setCurrentContent('')

    const endpoint = activeTab === 'resume'
      ? '/api/generate/resume'
      : '/api/generate/cover-letter'

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          track_id: trackId,
          job_id: job.job_id,
          user_tweak: userTweak || '',
          tone,
        }),
      })

      if (res.status === 402) {
        setError('Generation limit reached. Upgrade to Pro for unlimited access.')
        setStreaming(false)
        return
      }

      if (!res.ok) {
        const err = await res.json()
        setError(err.detail || 'Generation failed')
        setStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) setCurrentContent(prev => prev + data.text)
            if (data.done) break
            if (data.error) {
              setError(data.error)
              break
            }
          } catch {
            continue
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setStreaming(false)
    }
  }

  const handleCopy = async () => {
    if (!currentContent) return
    await navigator.clipboard.writeText(currentContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!currentContent) return
    const filename = `${job.company_name}_${job.job_title}_${activeTab}.md`
      .replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '')
    const blob = new Blob([currentContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: '#0d1117',
        border: `1px solid ${BORDER}`,
        borderRadius: '18px',
        width: '100%', maxWidth: '1100px',
        height: '90vh',
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
        overflow: 'hidden',
      }}>

        {/* Left panel — config */}
        <div style={{
          borderRight: `1px solid ${BORDER}`,
          padding: '1.5rem',
          display: 'flex', flexDirection: 'column', gap: '1.25rem',
          overflowY: 'auto',
          background: CARD,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 4px' }}>GENERATING FOR</p>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: '0 0 2px' }}>{job.job_title}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{job.company_name} · {job.location}</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
          </div>

          {/* Match score */}
          <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Match score</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: TEAL }}>⚡ {job.match_percentage_score}%</span>
          </div>

          {/* Asset type tabs */}
          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.06em' }}>GENERATE</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                { key: 'resume', label: '📄 Resume' },
                { key: 'cover_letter', label: '✉ Cover letter' },
              ].map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key as 'resume' | 'cover_letter')}
                  style={{
                    padding: '9px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: 600,
                    background: activeTab === t.key ? TEAL : 'rgba(255,255,255,0.05)',
                    color: activeTab === t.key ? '#fff' : 'rgba(255,255,255,0.5)',
                    transition: 'all 0.15s',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tone selector — cover letter only */}
          {activeTab === 'cover_letter' && (
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.06em' }}>TONE</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {TONE_OPTIONS.map(t => (
                  <button key={t.value} onClick={() => setTone(t.value)}
                    style={{
                      padding: '7px', borderRadius: '7px', cursor: 'pointer',
                      fontSize: '12px', fontWeight: 500,
                      border: `1px solid ${tone === t.value ? 'rgba(16,185,129,0.4)' : BORDER}`,
                      background: tone === t.value ? 'rgba(16,185,129,0.1)' : 'transparent',
                      color: tone === t.value ? TEAL : 'rgba(255,255,255,0.45)',
                      transition: 'all 0.15s',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Skill gaps */}
          {job.identified_skill_gaps.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.06em' }}>SKILL GAPS TO ADDRESS</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {job.identified_skill_gaps.map(s => (
                  <span key={s} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.7)', border: '1px solid rgba(239,68,68,0.15)' }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Skills needed */}
          {job.skills_needed.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.06em' }}>JD SKILLS</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {job.skills_needed.slice(0, 10).map(s => (
                  <span key={s} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: CARD2, color: 'rgba(255,255,255,0.45)', border: `1px solid ${BORDER}` }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Custom direction */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.06em' }}>CUSTOM DIRECTION</p>
            <textarea
              value={userTweak}
              onChange={e => setUserTweak(e.target.value)}
              rows={4}
              placeholder={activeTab === 'resume'
                ? 'e.g. Prioritise my Salesforce analytics work over generic PM delivery. Emphasise the Employee360 platform scale.'
                : 'e.g. Focus on my transition from analytics to product. Keep tone direct — this is a startup.'}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${BORDER}`,
                color: '#fff', fontSize: '13px',
                resize: 'vertical', boxSizing: 'border-box',
                outline: 'none', lineHeight: 1.6,
                fontFamily: 'system-ui, sans-serif',
              }}
            />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={streaming}
            style={{
              width: '100%', padding: '13px',
              borderRadius: '10px',
              background: streaming ? 'rgba(16,185,129,0.4)' : TEAL,
              color: '#fff', border: 'none',
              fontSize: '14px', fontWeight: 700,
              cursor: streaming ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px',
            }}
          >
            {streaming ? '⟳ Career Sage is writing...' : `⚡ Generate ${activeTab === 'resume' ? 'resume' : 'cover letter'}`}
          </button>

          {error && (
            <p style={{ fontSize: '13px', color: 'rgba(239,68,68,0.85)', margin: 0, lineHeight: 1.5 }}>{error}</p>
          )}
        </div>

        {/* Right panel — streaming output */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
          {/* Output toolbar */}
          <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                {streaming ? (
                  <span style={{ color: TEAL }}>● Streaming...</span>
                ) : currentContent ? (
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>✓ Generation complete</span>
                ) : (
                  <span>Configure and generate on the left</span>
                )}
              </span>
            </div>
            {currentContent && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleCopy} style={{ padding: '6px 14px', borderRadius: '7px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: copied ? TEAL : 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
                <button onClick={handleDownload} style={{ padding: '6px 14px', borderRadius: '7px', background: TEAL, border: 'none', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  Download
                </button>
              </div>
            )}
          </div>

          {/* Output content */}
          <div
            ref={outputRef}
            style={{
              flex: 1, overflowY: 'auto',
              padding: '1.5rem 2rem',
              fontFamily: 'ui-monospace, monospace',
              fontSize: '13px',
              lineHeight: 1.8,
              color: currentContent ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {currentContent || (
              streaming ? '' : 'Your generated content will appear here, streaming word by word...'
            )}
            {streaming && (
              <span style={{ display: 'inline-block', width: '2px', height: '14px', background: TEAL, marginLeft: '2px', animation: 'blink 1s infinite', verticalAlign: 'middle' }} />
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  )
}