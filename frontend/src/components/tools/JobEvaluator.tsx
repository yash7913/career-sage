
'use client'
import { useState } from 'react'
import MarkdownRenderer from '@/components/generate/MarkdownRenderer'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'
const DIM_TEXT = 'rgba(255,255,255,0.55)'

interface EvalResult {
  ats_score: number
  fit_score: number
  matched_skills: string[]
  skill_gaps: string[]
  evaluation: string
}

const scoreColor = (score: number) =>
  score >= 70 ? TEAL : score >= 50 ? '#F59E0B' : '#EF4444'

function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const color = scoreColor(score)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${(score / 100) * circ} ${circ}`}
          strokeLinecap="round" transform="rotate(-90 44 44)" />
        <text x="44" y="44" textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: '16px', fontWeight: 700, fill: color, fontFamily: 'system-ui' }}>
          {score}%
        </text>
      </svg>
      <p style={{ fontSize: '12px', color: DIM_TEXT, margin: 0, textAlign: 'center', fontWeight: 500 }}>{label}</p>
    </div>
  )
}

export default function JobEvaluator({ userId }: { userId: string }) {
  const [jdText, setJdText] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [mode, setMode] = useState<'profile' | 'paste'>('profile')
  const [step, setStep] = useState<'input' | 'result'>('input')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<EvalResult | null>(null)
  const [error, setError] = useState('')

  const handleEvaluate = async () => {
    if (!jdText.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/generate/evaluate-jd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          job_description: jdText,
          resume_text: mode === 'paste' ? resumeText : null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.detail || 'Evaluation failed. Try again.')
        return
      }
      const data = await res.json()
      setResult(data)
      setStep('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep('input')
    setResult(null)
    setError('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {step === 'input' && (
        <>
          {/* JD input */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 4px' }}>
              JOB DESCRIPTION
            </p>
            <p style={{ fontSize: '12px', color: DIM_TEXT, margin: '0 0 14px', lineHeight: 1.5 }}>
              Paste any job description — from LinkedIn, a company careers page, or anywhere else.
            </p>
            <textarea
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              placeholder="Paste the full job description here..."
              rows={10}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
                color: '#fff', fontSize: '13px', resize: 'vertical',
                boxSizing: 'border-box', outline: 'none',
                lineHeight: 1.6, fontFamily: 'system-ui, sans-serif',
              }}
            />
          </div>

          {/* Profile vs paste toggle */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 14px' }}>
              EVALUATE AGAINST
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: mode === 'paste' ? '16px' : '0' }}>
              {[
                { key: 'profile', label: '👤 My Career Sage profile', desc: 'Uses your extracted profile data' },
                { key: 'paste',   label: '📄 A specific resume',      desc: 'Paste any resume text to score' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setMode(opt.key as 'profile' | 'paste')}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: '8px',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: mode === opt.key ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                    boxShadow: mode === opt.key ? 'inset 0 0 0 1px rgba(16,185,129,0.25)' : `inset 0 0 0 1px ${BORDER}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <p style={{ fontSize: '13px', fontWeight: 600, color: mode === opt.key ? TEAL : 'rgba(255,255,255,0.5)', margin: '0 0 2px' }}>
                    {opt.label}
                  </p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{opt.desc}</p>
                </button>
              ))}
            </div>

            {mode === 'paste' && (
              <textarea
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                placeholder="Paste your resume text here..."
                rows={8}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
                  color: '#fff', fontSize: '13px', resize: 'vertical',
                  boxSizing: 'border-box', outline: 'none',
                  lineHeight: 1.6, fontFamily: 'system-ui, sans-serif',
                }}
              />
            )}
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: 'rgba(239,68,68,0.85)', margin: 0 }}>⚠ {error}</p>
          )}

          <button
            onClick={handleEvaluate}
            disabled={loading || !jdText.trim() || (mode === 'paste' && !resumeText.trim())}
            style={{
              padding: '14px', borderRadius: '10px', border: 'none',
              background: loading || !jdText.trim() || (mode === 'paste' && !resumeText.trim())
                ? 'rgba(16,185,129,0.3)'
                : 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff', fontSize: '14px', fontWeight: 700,
              cursor: loading || !jdText.trim() || (mode === 'paste' && !resumeText.trim())
                ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⟳ Evaluating...' : '🔍 Evaluate fit'}
          </button>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: '-8px 0 0', textAlign: 'center' }}>
            Does not count toward your generation limit
          </p>
        </>
      )}

      {step === 'result' && result && (
        <>
          {/* Score rings */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 20px' }}>
              EVALUATION RESULTS
            </p>
            <div style={{ display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
              <ScoreRing score={result.ats_score} label="ATS Score" />
              <ScoreRing score={result.fit_score} label="Recruiter Fit" />
              <div style={{ flex: 1, minWidth: '200px' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: '0 0 6px' }}>
                  {result.fit_score >= 70
                    ? 'Strong fit — worth applying'
                    : result.fit_score >= 50
                    ? 'Moderate fit — gaps are closable'
                    : 'Partial fit — this role stretches your profile'}
                </p>
                <p style={{ fontSize: '12px', color: DIM_TEXT, margin: 0, lineHeight: 1.5 }}>
                  ATS score reflects keyword coverage. Recruiter fit reflects overall suitability for the role based on your experience and achievements.
                </p>
              </div>
            </div>
          </div>

          {/* Matched skills + gaps */}
          {(result.matched_skills?.length > 0 || result.skill_gaps?.length > 0) && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {result.matched_skills?.length > 0 && (
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                    SKILLS YOU HAVE
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {result.matched_skills.map(s => (
                      <span key={s} style={{
                        fontSize: '12px', padding: '3px 10px', borderRadius: '6px',
                        background: 'rgba(16,185,129,0.1)', color: TEAL,
                        border: '1px solid rgba(16,185,129,0.25)',
                      }}>✓ {s}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.skill_gaps?.length > 0 && (
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                    GAPS TO CLOSE
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {result.skill_gaps.map(s => (
                      <span key={s} style={{
                        fontSize: '12px', padding: '3px 10px', borderRadius: '6px',
                        background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.8)',
                        border: '1px solid rgba(239,68,68,0.2)',
                      }}>✕ {s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full evaluation */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 14px' }}>
              DETAILED ANALYSIS
            </p>
            <MarkdownRenderer content={result.evaluation} variant="report" />
          </div>

          <button
            onClick={handleReset}
            style={{
              padding: '10px 20px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
              color: DIM_TEXT, fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', alignSelf: 'flex-start',
            }}
          >
            ← Evaluate another role
          </button>
        </>
      )}
    </div>
  )
}
