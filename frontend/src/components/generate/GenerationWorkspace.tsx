'use client'
import { useState, useRef, useEffect } from 'react'
import MarkdownRenderer from './MarkdownRenderer'
import VersionHistory from './VersionHistory'

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
  onDownload?: () => void
}

const TONE_OPTIONS = [
  { value: 'confident', label: 'Confident', example: 'I built X and grew Y by 60%...' },
  { value: 'formal', label: 'Formal', example: 'With extensive experience in...' },
  { value: 'conversational', label: 'Conversational', example: 'What drew me to this role...' },
  { value: 'concise', label: 'Concise', example: 'Built X. Grew Y 60%. Led Z.' },
]

const FUN_FACTS = [
  'The word résumé comes from French — it means "to summarise."',
  'The average recruiter spends 6 seconds scanning a resume.',
  'ATS systems reject up to 75% of resumes before a human sees them.',
  'Quantified achievements are 40% more likely to get callbacks.',
  'Resumes with the exact job title in the summary score 30% higher on ATS.',
  'Cover letters are read by 26% of recruiters — make yours count.',
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
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 45 45)" />
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
  const sectionBIndex = content.search(/###?\s*B\.\s*ATS KEYWORD/i)
  const sectionCIndex = content.search(/###?\s*C\.\s*RECRUITER NOTES?/i)

  let resumeContent = ''
  if (sectionBIndex > -1) {
    resumeContent = content.slice(0, sectionBIndex)
  } else if (sectionCIndex > -1) {
    resumeContent = content.slice(0, sectionCIndex)
  } else {
    resumeContent = content
  }

  resumeContent = resumeContent
    .replace(/###?\s*A\.\s*ATS[- ]OPTIMIS[EZ]D RESUME/i, '')
    .trim()

  const keywordsContent = sectionBIndex > -1
    ? content.slice(
        sectionBIndex,
        sectionCIndex > -1 ? sectionCIndex : undefined
      ).replace(/###?\s*B\.\s*ATS KEYWORD[S]? COVERAGE REPORT/i, '').trim()
    : ''

  const recruiterContent = sectionCIndex > -1
    ? content.slice(sectionCIndex).replace(/###?\s*C\.\s*RECRUITER NOTES?/i, '').trim()
    : ''

  return {
    resume: resumeContent,
    keywords: keywordsContent,
    recruiter: recruiterContent,
  }
}

export default function GenerationWorkspace({
  job, userId, trackId, onClose, onDownload
}: GenerationWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'resume' | 'cover_letter'>('resume')
  const [outputTab, setOutputTab] = useState<'output' | 'keywords' | 'recruiter'>('output')
  const [userTweak, setUserTweak] = useState('')
  const [tone, setTone] = useState('confident')
  const [fullContent, setFullContent] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamProgress, setStreamProgress] = useState(0)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [activeVersionId, setActiveVersionId] = useState<string>('')
  const [loadingVersion, setLoadingVersion] = useState(false)
  const [versionRefresh, setVersionRefresh] = useState(0)
  const [done, setDone] = useState(false)
  const [funFact] = useState(() => FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)])
  const outputRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [fullContent])

  useEffect(() => {
    if (streaming) {
      setStreamProgress(0)
      setDone(false)
      progressRef.current = setInterval(() => {
        setStreamProgress(prev => Math.min(prev + Math.random() * 3, 85))
      }, 200)
    } else {
      if (progressRef.current) clearInterval(progressRef.current)
      if (fullContent) {
        setStreamProgress(100)
        setTimeout(() => setDone(true), 300)
      }
    }
    return () => { if (progressRef.current) clearInterval(progressRef.current) }
  }, [streaming, fullContent])

  const sections = parseOutputSections(fullContent)

  const handleGenerate = async () => {
    if (streaming) return
    setStreaming(true)
    setError('')
    setFullContent('')
    setDone(false)
    setOutputTab('output')

    const endpoint = activeTab === 'resume' ? '/api/generate/resume' : '/api/generate/cover-letter'

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId, track_id: trackId,
          job_id: job.job_id, user_tweak: userTweak || '', tone,
        }),
      })

      if (res.status === 402) { setShowPaywall(true); setStreaming(false); return }
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
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) setFullContent(prev => prev + data.text)
            if (data.full_output) setFullContent(data.full_output)
            if (data.error) { setError(data.error); break }
            if (data.done) break
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

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tracker/card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId, job_id: job.job_id, track_id: trackId,
        company_name: job.company_name, job_title: job.job_title,
        match_score: job.match_percentage_score,
      }),
    })

    onDownload?.()

    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 48
    const maxWidth = pageWidth - margin * 2
    let y = margin

    const lines = sections.resume.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) { y += 8; continue }

      if (trimmed.startsWith('# ')) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(0, 0, 0)
        const wrapped = doc.splitTextToSize(trimmed.slice(2), maxWidth)
        if (y + 24 > pageHeight - margin) { doc.addPage(); y = margin }
        doc.text(wrapped, margin, y); y += wrapped.length * 22 + 4
      } else if (trimmed.startsWith('## ')) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(0, 0, 0)
        const wrapped = doc.splitTextToSize(trimmed.slice(3), maxWidth)
        if (y + 18 > pageHeight - margin) { doc.addPage(); y = margin }
        y += 6; doc.text(wrapped, margin, y); y += wrapped.length * 16 + 2
        doc.setDrawColor(200, 200, 200); doc.line(margin, y, pageWidth - margin, y); y += 6
      } else if (trimmed.startsWith('### ')) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(30, 30, 30)
        const wrapped = doc.splitTextToSize(trimmed.slice(4), maxWidth)
        if (y + 16 > pageHeight - margin) { doc.addPage(); y = margin }
        doc.text(wrapped, margin, y); y += wrapped.length * 14 + 4
      } else if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 40, 40)
        const clean = trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')
        const wrapped = doc.splitTextToSize(`• ${clean}`, maxWidth - 12)
        if (y + wrapped.length * 13 > pageHeight - margin) { doc.addPage(); y = margin }
        doc.text(wrapped, margin + 8, y); y += wrapped.length * 13 + 2
      } else {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 40, 40)
        const clean = trimmed.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')
        const wrapped = doc.splitTextToSize(clean, maxWidth)
        if (y + wrapped.length * 13 > pageHeight - margin) { doc.addPage(); y = margin }
        doc.text(wrapped, margin, y); y += wrapped.length * 13 + 3
      }
    }

    const company = job.company_name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const title = job.job_title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const shortJobId = job.job_id.slice(0, 8).toUpperCase()
    doc.save(`${company}_${title}_${shortJobId}.pdf`)
  }

  const handleCopy = async () => {
    if (!sections.resume) return
    await navigator.clipboard.writeText(sections.resume)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        background: '#0d1117',
        border: `1px solid ${BORDER}`,
        borderRadius: '20px',
        width: '100%', maxWidth: '1240px',
        height: '92vh',
        display: 'grid',
        gridTemplateColumns: '360px 1fr',
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>

        {/* ── Left panel ── */}
        <div style={{
          borderRight: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column',
          background: CARD, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: `1px solid ${BORDER}`,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', margin: '0 0 4px' }}>
                  APPLYING TO
                </p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {job.job_title}
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                  {job.company_name} · {job.location}
                </p>
              </div>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: '8px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '14px', padding: '6px 10px', flexShrink: 0, marginLeft: '10px' }}>✕</button>
            </div>

            {/* Application steps */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { num: '1', label: 'Resume', key: 'resume' },
                { num: '2', label: 'Cover letter', key: 'cover_letter' },
              ].map((step, i) => (
                <button
                  key={step.key}
                  onClick={() => setActiveTab(step.key as 'resume' | 'cover_letter')}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: '9px',
                    border: 'none', cursor: 'pointer',
                    background: activeTab === step.key
                      ? 'rgba(16,185,129,0.12)'
                      : 'rgba(255,255,255,0.04)',
                    boxShadow: activeTab === step.key
                      ? 'inset 0 0 0 1px rgba(16,185,129,0.3)'
                      : 'inset 0 0 0 1px rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: activeTab === step.key ? TEAL : 'rgba(255,255,255,0.1)',
                    color: activeTab === step.key ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontSize: '11px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {step.num}
                  </span>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, margin: 0, color: activeTab === step.key ? TEAL : 'rgba(255,255,255,0.5)' }}>
                      {step.label}
                    </p>
                    <p style={{ fontSize: '10px', margin: 0, color: 'rgba(255,255,255,0.25)' }}>
                      {i === 1 ? 'Optional' : 'Required'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable left content */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '1.25rem 1.5rem',
            display: 'flex', flexDirection: 'column', gap: '1.25rem',
          }}>

            {/* Match circle + salary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <CircleMatch score={job.match_percentage_score} />
              <div>
                {(job.estimated_salary_min || job.estimated_salary_max) && (
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '0 0 4px' }}>
                    💰 {job.estimated_salary_min ? `₹${job.estimated_salary_min}L` : ''}
                    {job.estimated_salary_min && job.estimated_salary_max ? ' – ' : ''}
                    {job.estimated_salary_max ? `₹${job.estimated_salary_max}L` : ''}
                  </p>
                )}
                {job.estimated_interview_rounds && (
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                    📋 {job.estimated_interview_rounds} rounds
                  </p>
                )}
              </div>
            </div>

            {/* Tone — cover letter */}
            {activeTab === 'cover_letter' && (
              <div>
                <p style={{
                  fontSize: '11px', color: 'rgba(255,255,255,0.35)',
                  margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.08em',
                }}>TONE</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {TONE_OPTIONS.map(t => (
                    <button key={t.value} onClick={() => setTone(t.value)}
                      style={{
                        padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                        border: `1px solid ${tone === t.value ? 'rgba(16,185,129,0.4)' : BORDER}`,
                        background: tone === t.value ? 'rgba(16,185,129,0.1)' : 'transparent',
                        textAlign: 'left', transition: 'all 0.15s',
                      }}>
                      <p style={{
                        fontSize: '12px', fontWeight: 600, margin: '0 0 2px',
                        color: tone === t.value ? TEAL : 'rgba(255,255,255,0.6)',
                      }}>{t.label}</p>
                      <p style={{
                        fontSize: '11px', margin: 0,
                        color: 'rgba(255,255,255,0.25)',
                        fontStyle: 'italic',
                      }}>{t.example}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Skill gaps */}
            {job.identified_skill_gaps.length > 0 && (
              <div>
                <p style={{
                  fontSize: '11px', color: 'rgba(255,255,255,0.35)',
                  margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.08em',
                }}>GAPS TO ADDRESS</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {job.identified_skill_gaps.map(s => (
                    <span key={s} style={{
                      fontSize: '11px', padding: '3px 8px', borderRadius: '5px',
                      background: 'rgba(239,68,68,0.08)',
                      color: 'rgba(239,68,68,0.75)',
                      border: '1px solid rgba(239,68,68,0.15)',
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* JD skills */}
            {job.skills_needed.length > 0 && (
              <div>
                <p style={{
                  fontSize: '11px', color: 'rgba(255,255,255,0.35)',
                  margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.08em',
                }}>JD SKILLS TO MIRROR</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {job.skills_needed.map(s => (
                    <span key={s} style={{
                      fontSize: '11px', padding: '3px 8px', borderRadius: '5px',
                      background: CARD2, color: 'rgba(255,255,255,0.45)',
                      border: `1px solid ${BORDER}`,
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Version history */}
            <div>
              <p style={{
                fontSize: '11px', color: 'rgba(255,255,255,0.35)',
                margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.08em',
              }}>VERSION HISTORY</p>
              <VersionHistory
                key={versionRefresh}
                userId={userId}
                trackId={trackId}
                jobId={job.job_id}
                activeVersionId={activeVersionId}
                onSelect={async (versionId) => {
                  setActiveVersionId(versionId)
                  setLoadingVersion(true)
                  try {
                    const res = await fetch(
                      `${process.env.NEXT_PUBLIC_API_URL}/api/generate/versions/${versionId}`
                    )
                    if (res.ok) {
                      const data = await res.json()
                      const content = activeTab === 'resume'
                        ? data.resume_content : data.cover_letter_content
                      setFullContent(content || '')
                      setOutputTab('output')
                    }
                  } finally {
                    setLoadingVersion(false)
                  }
                }}
              />
              {loadingVersion && (
                <p style={{ fontSize: '11px', color: TEAL, margin: '6px 0 0' }}>Loading version...</p>
              )}
            </div>

            {/* Custom direction */}
            <div>
              <p style={{
                fontSize: '11px', color: 'rgba(255,255,255,0.35)',
                margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.08em',
              }}>CUSTOM DIRECTION</p>
              <textarea
                value={userTweak}
                onChange={e => setUserTweak(e.target.value)}
                rows={4}
                placeholder={activeTab === 'resume'
                  ? 'e.g. Emphasise my Salesforce analytics work. Lead with the Employee360 platform scale.'
                  : 'e.g. Focus on analytics-to-product transition. Keep tone punchy.'}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '9px',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${BORDER}`,
                  color: '#fff', fontSize: '13px',
                  resize: 'vertical', boxSizing: 'border-box',
                  outline: 'none', lineHeight: 1.6,
                  fontFamily: 'system-ui, sans-serif',
                }}
              />
            </div>

            {error && (
              <p style={{ fontSize: '13px', color: 'rgba(239,68,68,0.85)', margin: 0 }}>{error}</p>
            )}
          </div>

          {/* Generate button */}
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: `1px solid ${BORDER}`,
            flexShrink: 0,
          }}>
            <button
              onClick={handleGenerate}
              disabled={streaming}
              style={{
                width: '100%', padding: '13px',
                borderRadius: '11px',
                background: streaming
                  ? 'rgba(16,185,129,0.3)'
                  : 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff', border: 'none',
                fontSize: '14px', fontWeight: 700,
                cursor: streaming ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: streaming ? 'none' : '0 4px 20px rgba(16,185,129,0.3)',
              }}
            >
              {streaming
                ? '⟳ Career Sage is writing...'
                : activeTab === 'resume'
                ? '⚡ Generate resume — Step 1'
                : '⚡ Generate cover letter — Step 2'}
            </button>
            <p style={{
              fontSize: '11px', color: 'rgba(255,255,255,0.2)',
              textAlign: 'center', margin: '8px 0 0',
            }}>
              Tweak and regenerate freely · counter increments on download
            </p>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          background: '#0d1117', overflow: 'hidden',
        }}>
          {/* Progress bar */}
          {(streaming || streamProgress > 0) && (
            <div style={{ height: '2px', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
              <div style={{
                height: '100%',
                width: `${streamProgress}%`,
                background: `linear-gradient(90deg, ${TEAL}, #059669)`,
                transition: 'width 0.3s ease',
                boxShadow: `0 0 8px ${TEAL}`,
              }} />
            </div>
          )}

          {/* Output tabs + actions */}
          <div style={{
            padding: '0 1.5rem',
            borderBottom: `1px solid ${BORDER}`,
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', height: '52px', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: '2px' }}>
              {[
                { key: 'output', label: activeTab === 'resume' ? 'Step 1 — Resume' : 'Step 2 — Cover letter' },
                { key: 'keywords', label: 'ATS Report', badge: sections.keywords ? '✓' : null },
                { key: 'recruiter', label: 'Recruiter Notes', badge: sections.recruiter ? '✓' : null },
              ].map(t => (
                <button key={t.key}
                  onClick={() => setOutputTab(t.key as 'output' | 'keywords' | 'recruiter')}
                  style={{
                    padding: '6px 14px', borderRadius: '7px',
                    border: 'none', cursor: 'pointer',
                    fontSize: '12px', fontWeight: outputTab === t.key ? 600 : 400,
                    background: outputTab === t.key
                      ? 'rgba(16,185,129,0.12)' : 'transparent',
                    color: outputTab === t.key
                      ? TEAL : 'rgba(255,255,255,0.35)',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: '5px',
                  }}>
                  {t.label}
                  {t.badge && (
                    <span style={{
                      fontSize: '9px', padding: '1px 5px',
                      borderRadius: '999px',
                      background: 'rgba(16,185,129,0.2)',
                      color: TEAL,
                    }}>{t.badge}</span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {!streaming && sections.resume && outputTab === 'output' && (
                <>
                  <button onClick={handleCopy} style={{
                    padding: '6px 14px', borderRadius: '7px',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${BORDER}`,
                    color: copied ? TEAL : 'rgba(255,255,255,0.5)',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  }}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                  <button onClick={handleDownload} style={{
                    padding: '6px 18px', borderRadius: '7px',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    border: 'none', color: '#fff',
                    fontSize: '12px', fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 12px rgba(16,185,129,0.3)',
                  }}>
                    ↓ Download PDF
                  </button>
                </>
              )}
              {streaming && (
                <span style={{ fontSize: '12px', color: TEAL, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: TEAL, display: 'inline-block',
                    animation: 'pulse 1s infinite',
                  }} />
                  Streaming...
                </span>
              )}
            </div>
          </div>

          {/* Output content */}
          <div ref={outputRef} style={{
            flex: 1, overflowY: 'auto',
            padding: '2rem 2.5rem',
          }}>
            {/* Loading state */}
            {streaming && !fullContent && (
              <div style={{
                color: 'rgba(255,255,255,0.5)',
                fontFamily: 'system-ui', fontSize: '14px',
                lineHeight: 2,
              }}>
                <p style={{
                  color: TEAL, fontWeight: 600,
                  marginBottom: '1rem', fontSize: '15px',
                }}>
                  ⚡ Career Sage is crafting your {activeTab === 'resume' ? 'resume' : 'cover letter'}...
                </p>
                <div style={{
                  padding: '1rem 1.25rem',
                  background: 'rgba(16,185,129,0.05)',
                  border: '1px solid rgba(16,185,129,0.15)',
                  borderRadius: '10px',
                  maxWidth: '480px',
                }}>
                  <p style={{
                    fontSize: '12px', fontStyle: 'italic',
                    color: 'rgba(255,255,255,0.4)', margin: '0 0 6px',
                  }}>💡 Did you know?</p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                    {funFact}
                  </p>
                </div>
                <p style={{
                  marginTop: '1rem', fontSize: '12px',
                  color: 'rgba(255,255,255,0.2)',
                }}>
                  Analysing job description · mapping your skills · crafting your narrative...
                </p>
              </div>
            )}

            {/* Empty state */}
            {!streaming && !fullContent && (
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                height: '100%', gap: '16px',
                color: 'rgba(255,255,255,0.2)',
                fontFamily: 'system-ui',
              }}>
                <div style={{ fontSize: '48px', opacity: 0.3 }}>📄</div>
                <p style={{ fontSize: '15px', fontWeight: 500, margin: 0 }}>
                  Configure and generate on the left
                </p>
                <p style={{ fontSize: '13px', margin: 0, textAlign: 'center', maxWidth: '300px' }}>
                  Add a custom direction to guide Career Sage — the more specific, the better the output.
                </p>
              </div>
            )}

            {/* Completion banner */}
            {done && sections.resume && outputTab === 'output' && (
              <div style={{
                padding: '10px 16px',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '10px',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: '13px', color: TEAL, fontWeight: 600 }}>
                  ✓ Generation complete — tweak and regenerate freely
                </span>
                {sections.keywords && (
                  <button
                    onClick={() => setOutputTab('keywords')}
                    style={{
                      background: 'none', border: 'none',
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '12px', cursor: 'pointer',
                    }}
                  >
                    View ATS Report →
                  </button>
                )}
              </div>
            )}

            {/* Resume output — rendered markdown */}
            {outputTab === 'output' && fullContent && (
              <MarkdownRenderer
                content={sections.resume || fullContent}
                variant={activeTab === 'resume' ? 'resume' : 'cover_letter'}
              />
            )}

            {/* ATS keywords tab */}
            {outputTab === 'keywords' && (
              <div>
                {sections.keywords ? (
                  <div>
                    <div style={{
                      padding: '12px 16px', borderRadius: '10px',
                      background: 'rgba(16,185,129,0.06)',
                      border: '1px solid rgba(16,185,129,0.15)',
                      marginBottom: '1.5rem',
                    }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: TEAL, margin: '0 0 4px' }}>
                        ATS Keyword Coverage Report
                      </p>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>
                        This report shows how well your resume matches the job description keywords. ATS systems score resumes on keyword density before a human ever reads them. Use this to identify gaps before submitting.
                      </p>
                    </div>
                    <MarkdownRenderer content={sections.keywords} variant="report" />
                  </div>
                ) : (
                  <p style={{
                    color: 'rgba(255,255,255,0.25)',
                    fontFamily: 'system-ui', fontSize: '14px',
                  }}>
                    Generate a resume first to see the ATS keyword coverage report.
                  </p>
                )}
              </div>
            )}

            {/* Recruiter notes tab */}
            {outputTab === 'recruiter' && (
              <div>
                {sections.recruiter ? (
                  <div>
                    <div style={{
                      padding: '12px 16px', borderRadius: '10px',
                      background: 'rgba(245,158,11,0.06)',
                      border: '1px solid rgba(245,158,11,0.15)',
                      marginBottom: '1.5rem',
                    }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#F59E0B', margin: '0 0 4px' }}>
                        Recruiter Intelligence — For your eyes only
                      </p>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>
                        Career Sage has analysed how a recruiter will read your resume. Red flags, strongest bullets, gaps to address in the interview, and your suggested LinkedIn headline. This does not appear in the downloaded PDF.
                      </p>
                    </div>
                    <MarkdownRenderer content={sections.recruiter} variant="report" />
                  </div>
                ) : (
                  <p style={{
                    color: 'rgba(255,255,255,0.25)',
                    fontFamily: 'system-ui', fontSize: '14px',
                  }}>
                    Generate a resume first to see recruiter notes and gap analysis.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}