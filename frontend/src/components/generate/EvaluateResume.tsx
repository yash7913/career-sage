'use client'
import { useState } from 'react'
import MarkdownRenderer from './MarkdownRenderer'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface EvaluateResumeProps {
  job: {
    job_id: string
    job_title: string
    company_name: string
    location: string
    match_percentage_score: number
  }
  userId: string
  onClose: () => void
}

export default function EvaluateResume({ job, userId, onClose }: EvaluateResumeProps) {
  const [resumeText, setResumeText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    evaluation: string
    ats_score: number
    fit_score: number
  } | null>(null)
  const [error, setError] = useState('')

  const handleEvaluate = async () => {
    if (!resumeText.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/generate/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          job_id: job.job_id,
          resume_text: resumeText,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.detail || 'Evaluation failed')
        return
      }
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const scoreColor = (score: number) =>
    score >= 70 ? TEAL : score >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', backdropFilter: 'blur(12px)',
      overflow: 'hidden',
    }}>
      <div style={{
        background: '#0d1117', border: `1px solid ${BORDER}`,
        borderRadius: '20px', width: '100%', maxWidth: '1000px',
        height: '90vh', display: 'grid',
        gridTemplateColumns: result ? '400px 1fr' : '1fr',
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>

        {/* Left — input panel */}
        <div style={{
          borderRight: result ? `1px solid ${BORDER}` : 'none',
          display: 'flex', flexDirection: 'column',
          background: CARD, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: `1px solid ${BORDER}`,
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', flexShrink: 0,
          }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', margin: '0 0 4px' }}>
                EVALUATING FOR
              </p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.4px' }}>
                {job.job_title}
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                {job.company_name} · {job.location}
              </p>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`,
              borderRadius: '8px', color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer', fontSize: '14px', padding: '6px 10px',
            }}>✕</button>
          </div>

          {/* Textarea */}
          <div style={{ flex: 1, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'auto' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', margin: '0 0 8px' }}>
                PASTE YOUR RESUME
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: '0 0 10px', lineHeight: 1.5 }}>
                Paste your existing resume text below. Career Sage will score it against this JD without generating a new resume.
              </p>
              <textarea
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                placeholder="Paste your full resume text here..."
                rows={16}
                style={{
                  width: '100%', padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${BORDER}`,
                  color: '#fff', fontSize: '13px',
                  resize: 'vertical', boxSizing: 'border-box',
                  outline: 'none', lineHeight: 1.6,
                  fontFamily: 'system-ui, sans-serif',
                  minHeight: '300px',
                }}
              />
            </div>

            {error && (
              <p style={{ fontSize: '13px', color: 'rgba(239,68,68,0.85)', margin: 0 }}>{error}</p>
            )}

            {result && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  background: `${scoreColor(result.ats_score)}10`,
                  border: `1px solid ${scoreColor(result.ats_score)}30`,
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>ATS SCORE</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: scoreColor(result.ats_score), margin: 0 }}>
                    {result.ats_score}%
                  </p>
                </div>
                <div style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  background: `${scoreColor(result.fit_score)}10`,
                  border: `1px solid ${scoreColor(result.fit_score)}30`,
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>FIT SCORE</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: scoreColor(result.fit_score), margin: 0 }}>
                    {result.fit_score}%
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Evaluate button */}
          <div style={{ padding: '1rem 1.5rem', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <button
              onClick={handleEvaluate}
              disabled={loading || !resumeText.trim()}
              style={{
                width: '100%', padding: '13px', borderRadius: '11px',
                background: loading || !resumeText.trim()
                  ? 'rgba(16,185,129,0.3)'
                  : 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff', border: 'none',
                fontSize: '14px', fontWeight: 700,
                cursor: loading || !resumeText.trim() ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(16,185,129,0.3)',
              }}
            >
              {loading ? '⟳ Evaluating...' : '🔍 Evaluate resume'}
            </button>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: '8px 0 0' }}>
              Does not count toward your generation limit
            </p>
          </div>
        </div>

        {/* Right — results panel */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', background: '#0d1117', overflow: 'hidden' }}>
            <div style={{
              padding: '0 1.5rem', borderBottom: `1px solid ${BORDER}`,
              height: '52px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexShrink: 0,
            }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>
                Evaluation Report
              </p>
              <span style={{
                fontSize: '12px', fontWeight: 600,
                padding: '3px 12px', borderRadius: '999px',
                background: `${scoreColor(result.fit_score)}15`,
                color: scoreColor(result.fit_score),
                border: `1px solid ${scoreColor(result.fit_score)}30`,
              }}>
                Overall fit: {result.fit_score}%
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem' }}>
              <MarkdownRenderer content={result.evaluation} variant="report" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}