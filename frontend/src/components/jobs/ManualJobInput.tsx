'use client'
import { useState } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface ManualJobInputProps {
  userId: string
  trackId: string
  onJobAdded: () => void
  onClose: () => void
}

export default function ManualJobInput({ userId, trackId, onJobAdded, onClose }: ManualJobInputProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ message: string; job?: { job_title: string; company_name: string } } | null>(null)
  const [error, setError] = useState('')

  const isUrl = input.trim().startsWith('http')

  const handleSubmit = async () => {
    if (!input.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/manual`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            track_id: trackId,
            text_or_url: input.trim(),
          }),
        }
      )

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to parse job')
      }

      const data = await res.json()
      setResult(data)
      onJobAdded()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: '14px',
      padding: '1.25rem',
      marginBottom: '1rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: '0 0 2px' }}>Add a job manually</p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            Paste a job URL or the full job description text
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '18px' }}>✕</button>
      </div>

      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        rows={5}
        placeholder={`Paste a job URL (https://...) or the full job description text here.\n\nCareer Sage will extract the job details and add it to your ranked feed.`}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${input.trim() ? (isUrl ? 'rgba(16,185,129,0.3)' : BORDER) : BORDER}`,
          color: '#fff', fontSize: '13px',
          resize: 'vertical', boxSizing: 'border-box',
          outline: 'none', lineHeight: 1.6,
          fontFamily: 'system-ui, sans-serif',
          marginBottom: '10px',
        }}
      />

      {input.trim() && (
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '0 0 10px' }}>
          {isUrl ? '🔗 Career Sage will fetch and parse this URL' : '📄 Career Sage will extract job details from this text'}
        </p>
      )}

      {error && (
        <p style={{ fontSize: '13px', color: 'rgba(239,68,68,0.85)', margin: '0 0 10px' }}>{error}</p>
      )}

      {result && (
        <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', marginBottom: '10px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: TEAL, margin: '0 0 2px' }}>✓ Job added to your feed</p>
          {result.job && (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              {result.job.job_title} at {result.job.company_name}
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !input.trim()}
        style={{
          width: '100%', padding: '11px', borderRadius: '8px',
          background: loading || !input.trim() ? 'rgba(16,185,129,0.3)' : TEAL,
          color: '#fff', border: 'none',
          fontSize: '13px', fontWeight: 600,
          cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {loading
          ? `⟳ ${isUrl ? 'Fetching and parsing...' : 'Parsing job description...'}`
          : `⚡ ${isUrl ? 'Fetch and add job' : 'Parse and add job'}`}
      </button>
    </div>
  )
}