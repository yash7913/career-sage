'use client'
import VersionHistory from './VersionHistory'
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
  estimated_salary_min?: number | null
  estimated_salary_max?: number | null
  estimated_interview_rounds?: number | null
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

const FUN_FACTS = [
  'The word résumé comes from French — it means "to summarise."',
  'The average recruiter spends 6–7 seconds scanning a resume before deciding.',
  'ATS systems reject up to 75% of resumes before a human sees them.',
  'Resumes with quantified achievements are 40% more likely to get callbacks.',
  'The ideal resume length for senior roles is exactly 2 pages.',
  'Mirror the job description language — ATS parsers reward keyword alignment.',
]

function CircleMatch({ score }: { score: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ
  const color = score >= 70 ? TEAL : score >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
      <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 45 45)"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="45" y="45" textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: '16px', fontWeight: 700, fill: color, fontFamily: 'system-ui' }}>
        {score}%
      </text>
      <text x="45" y="62" textAnchor="middle"
        style={{ fontSize: '9px', fill: 'rgba(255,255,255,0.35)', fontFamily: 'system-ui', letterSpacing: '0.05em' }}>
        MATCH
      </text>
    </svg>
  )
}

function parseOutputSections(content: string): { resume: string; keywords: string; recruiter: string } {
  const resumeMatch = content.match(/###?\s*A\.\s*ATS[- ]OPTIMIS[EZ]D RESUME([\s\S]*?)(?=###?\s*B\.|$)/i)
  const keywordsMatch = content.match(/###?\s*B\.\s*ATS KEYWORD[S]? COVERAGE REPORT([\s\S]*?)(?=###?\s*C\.|$)/i)
  const recruiterMatch = content.match(/###?\s*C\.\s*RECRUITER NOTES?([\s\S]*?)$/i)

  return {
    resume: resumeMatch ? resumeMatch[1].trim() : content,
    keywords: keywordsMatch ? keywordsMatch[1].trim() : '',
    recruiter: recruiterMatch ? recruiterMatch[1].trim() : '',
  }
}

export default function GenerationWorkspace({ job, userId, trackId, onClose }: GenerationWorkspaceProps) {
  const [activeVersionId, setActiveVersionId] = useState<string>('')
  const [loadingVersion, setLoadingVersion] = useState(false)
  const [versionRefresh, setVersionRefresh] = useState(0)
  const [activeTab, setActiveTab] = useState<'resume' | 'cover_letter'>('resume')
  const [outputTab, setOutputTab] = useState<'output' | 'keywords' | 'recruiter'>('output')
  const [userTweak, setUserTweak] = useState('')
  const [tone, setTone] = useState('confident')
  const [fullContent, setFullContent] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [funFact] = useState(() => FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)])
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [fullContent])

  const sections = parseOutputSections(fullContent)
  const currentOutput = outputTab === 'output' ? sections.resume
    : outputTab === 'keywords' ? sections.keywords
    : sections.recruiter

  const handleGenerate = async () => {
    if (streaming) return
    setStreaming(true)
    setError('')
    setFullContent('')
    setOutputTab('output')

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
            if (data.text) setFullContent(prev => prev + data.text)
            if (data.done || data.error) break
          } catch { continue }
        }
      }
	} catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setStreaming(false)
      setVersionRefresh(prev => prev + 1)
    }
  }

  const handleDownload = async () => {
    if (!sections.resume) return

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/generate/increment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })

    const filename = `${job.company_name}_${job.job_title}`
      .replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '')

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = sections.resume
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^# (.*)/gm, '<h1>$1</h1>')
      .replace(/^## (.*)/gm, '<h2>$1</h2>')
      .replace(/^### (.*)/gm, '<h3>$1</h3>')
      .replace(/^[•\-] (.*)/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>')

    printWindow.document.write(`<!DOCTYPE html><html><head><title>${filename}</title>
      <style>
        body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;margin:2cm;color:#000}
        h1{font-size:16pt;margin-bottom:4px}
        h2{font-size:12pt;border-bottom:1px solid #ccc;padding-bottom:2px;margin-top:14px}
        h3{font-size:11pt;margin-bottom:2px}
        li{margin-bottom:3px}p{margin:6px 0}
        @media print{body{margin:1.5cm}}
      </style></head><body><p>${html}</p>
      <script>window.onload=function(){window.print()}</script>
      </body></html>`)
    printWindow.document.close()
  }

  const handleCopy = async () => {
    if (!sections.resume) return
    await navigator.clipboard.writeText(sections.resume)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: '#0d1117', border: `1px solid ${BORDER}`, borderRadius: '18px', width: '100%', maxWidth: '1200px', height: '92vh', display: 'grid', gridTemplateColumns: '360px 1fr', overflow: 'hidden' }}>

        {/* ── Left panel ── */}
        <div style={{ borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', background: CARD, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 4px' }}>GENERATING FOR</p>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.3px' }}>{job.job_title}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{job.company_name} · {job.location}</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px', flexShrink: 0 }}>✕</button>
          </div>

          {/* Scrollable left content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Match score circle + salary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <CircleMatch score={job.match_percentage_score} />
              <div>
                {(job.estimated_salary_min || job.estimated_salary_max) && (
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '0 0 4px' }}>
                    💰 {job.estimated_salary_min ? `₹${job.estimated_salary_min}L` : ''}{job.estimated_salary_min && job.estimated_salary_max ? ' – ' : ''}{job.estimated_salary_max ? `₹${job.estimated_salary_max}L` : ''}
                  </p>
                )}
                {job.estimated_interview_rounds && (
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                    📋 {job.estimated_interview_rounds} interview rounds
                  </p>
                )}
              </div>
            </div>

            {/* Asset type tabs */}
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.06em' }}>GENERATE</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {[{ key: 'resume', label: '📄 Resume' }, { key: 'cover_letter', label: '✉ Cover letter' }].map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key as 'resume' | 'cover_letter')}
                    style={{ padding: '9px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: activeTab === t.key ? TEAL : 'rgba(255,255,255,0.05)', color: activeTab === t.key ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone — cover letter only */}
            {activeTab === 'cover_letter' && (
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.06em' }}>TONE</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {TONE_OPTIONS.map(t => (
                    <button key={t.value} onClick={() => setTone(t.value)}
                      style={{ padding: '7px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 500, border: `1px solid ${tone === t.value ? 'rgba(16,185,129,0.4)' : BORDER}`, background: tone === t.value ? 'rgba(16,185,129,0.1)' : 'transparent', color: tone === t.value ? TEAL : 'rgba(255,255,255,0.45)', transition: 'all 0.15s' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Skill gaps */}
            {job.identified_skill_gaps.length > 0 && (
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.06em' }}>GAPS TO ADDRESS</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {job.identified_skill_gaps.map(s => (
                    <span key={s} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.75)', border: '1px solid rgba(239,68,68,0.15)' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* JD skills */}
            {job.skills_needed.length > 0 && (
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.06em' }}>JD SKILLS TO MIRROR</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {job.skills_needed.map(s => (
                    <span key={s} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: CARD2, color: 'rgba(255,255,255,0.5)', border: `1px solid ${BORDER}` }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* JD preview */}
            {job.job_description && (
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.06em' }}>JD PREVIEW</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.65, margin: 0, maxHeight: '100px', overflow: 'hidden', maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' }}>
                  {job.job_description}
                </p>
              </div>
            )}

            {/* Custom direction */}
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.06em' }}>CUSTOM DIRECTION</p>
              <textarea
                value={userTweak}
                onChange={e => setUserTweak(e.target.value)}
                rows={4}
                placeholder={activeTab === 'resume'
                  ? 'e.g. Prioritise my Salesforce analytics work. Emphasise the Employee360 platform scale.'
                  : 'e.g. Focus on my analytics-to-product transition. Keep tone direct.'}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#fff', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', outline: 'none', lineHeight: 1.6, fontFamily: 'system-ui, sans-serif' }}
              />
            </div>

            {error && (
              <p style={{ fontSize: '13px', color: 'rgba(239,68,68,0.85)', margin: 0, lineHeight: 1.5 }}>{error}</p>
            )}
          </div>

          {/* Generate button — fixed at bottom */}
          <div style={{ padding: '1rem 1.5rem', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <button onClick={handleGenerate} disabled={streaming}
              style={{ width: '100%', padding: '13px', borderRadius: '10px', background: streaming ? 'rgba(16,185,129,0.4)' : TEAL, color: '#fff', border: 'none', fontSize: '14px', fontWeight: 700, cursor: streaming ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
              {streaming ? '⟳ Career Sage is writing...' : `⚡ Generate ${activeTab === 'resume' ? 'resume' : 'cover letter'}`}
            </button>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: '8px 0 0' }}>
              Generation is free — counter increments only on download
            </p>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#0d1117', overflow: 'hidden' }}>
          {/* Output tabs + actions */}
          <div style={{ padding: '0 1.5rem', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '52px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { key: 'output', label: activeTab === 'resume' ? 'Resume' : 'Cover letter' },
                { key: 'keywords', label: 'ATS Report' },
                { key: 'recruiter', label: 'Recruiter Notes' },
              ].map(t => (
                <button key={t.key}
                  onClick={() => setOutputTab(t.key as 'output' | 'keywords' | 'recruiter')}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '12px', fontWeight: outputTab === t.key ? 600 : 400,
                    background: outputTab === t.key ? 'rgba(16,185,129,0.12)' : 'transparent',
                    color: outputTab === t.key ? TEAL : 'rgba(255,255,255,0.4)',
                    transition: 'all 0.15s',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
            {sections.resume && outputTab === 'output' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleCopy}
                  style={{ padding: '6px 14px', borderRadius: '7px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: copied ? TEAL : 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
                <button onClick={handleDownload}
                  style={{ padding: '6px 14px', borderRadius: '7px', background: TEAL, border: 'none', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  ↓ Download PDF
                </button>
              </div>
            )}
            {streaming && (
              <span style={{ fontSize: '12px', color: TEAL }}>● Streaming...</span>
            )}
            {!streaming && sections.resume && (
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>✓ Done — tweak and regenerate freely</span>
            )}
          </div>

          {/* Output content — scrollable */}
          <div ref={outputRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
            {streaming && !fullContent && (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'system-ui', fontSize: '14px', lineHeight: 2 }}>
                <p style={{ color: TEAL, fontWeight: 600, marginBottom: '1rem' }}>
                  ⚡ Career Sage is crafting your {activeTab === 'resume' ? 'resume' : 'cover letter'}...
                </p>
                <p style={{ fontSize: '13px', fontStyle: 'italic' }}>💡 {funFact}</p>
                <p style={{ marginTop: '0.75rem', fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>
                  Analysing the job description, mapping your skills, and crafting your narrative...
                </p>
              </div>
            )}

            {!streaming && !fullContent && (
              <div style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'system-ui', fontSize: '14px', lineHeight: 1.8 }}>
                <p>Your generated content will appear here.</p>
                <p style={{ fontSize: '13px', marginTop: '0.5rem' }}>
                  Tip: Add a custom direction on the left to guide Career Sage — the more specific, the better the output.
                </p>
              </div>
            )}

            {outputTab === 'output' && fullContent && (
              <div>
                <pre style={{ fontFamily: 'ui-monospace, monospace', fontSize: '13px', lineHeight: 1.8, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                  {sections.resume || fullContent}
                </pre>
                {streaming && (
                  <span style={{ display: 'inline-block', width: '2px', height: '14px', background: TEAL, marginLeft: '2px', animation: 'blink 1s infinite', verticalAlign: 'middle' }} />
                )}
              </div>
            )}

            {outputTab === 'keywords' && (
              <div>
                {sections.keywords ? (
                  <pre style={{ fontFamily: 'ui-monospace, monospace', fontSize: '13px', lineHeight: 1.8, color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                    {sections.keywords}
                  </pre>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'system-ui', fontSize: '14px' }}>
                    Generate a resume first to see the ATS keyword coverage report.
                  </p>
                )}
              </div>
            )}

            {outputTab === 'recruiter' && (
              <div>
                {sections.recruiter ? (
                  <pre style={{ fontFamily: 'ui-monospace, monospace', fontSize: '13px', lineHeight: 1.8, color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                    {sections.recruiter}
                  </pre>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'system-ui', fontSize: '14px' }}>
                    Generate a resume first to see recruiter notes and gap analysis.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  )
}