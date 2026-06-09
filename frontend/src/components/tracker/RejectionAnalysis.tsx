'use client'
import { useState } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

interface SkillGap {
  skill: string
  priority: 'High' | 'Medium' | 'Low'
  how_to_close: string
}

interface RejectionResult {
  likely_reasons: string[]
  stage_analysis: string
  skill_gaps_to_close: SkillGap[]
  reapply_recommendation: string
  reapply_reasoning: string
  next_steps: string[]
  similar_roles_to_target: string[]
}

interface RejectionAnalysisProps {
  userId: string
  jobId: string
  jobTitle: string
  company: string
  onClose: () => void
}

const PRIORITY_COLORS = {
  High: '#EF4444',
  Medium: '#F59E0B',
  Low: TEAL,
}

export default function RejectionAnalysis({ userId, jobId, jobTitle, company, onClose }: RejectionAnalysisProps) {
  const [stage, setStage] = useState('Screening')
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState<RejectionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const STAGES = ['Screening', 'Technical Interview', 'Product/Case Interview', 'Leadership Interview', 'Final Round', 'Offer Stage', 'No Response']

  const handleAnalyse = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tracker/rejection-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          job_id: jobId,
          stage_reached: stage,
          notes: notes || null,
        }),
      })
      if (!res.ok) { const e = await res.json(); setError(e.detail || 'Analysis failed'); return }
      setResult(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        background: '#0d1117', border: `1px solid ${BORDER}`,
        borderRadius: '20px', width: '100%', maxWidth: '720px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>

        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexShrink: 0, background: '#161b22',
        }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', margin: '0 0 4px' }}>
              REJECTION DEBRIEF
            </p>
            <p style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{jobTitle}</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{company}</p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`,
            borderRadius: '8px', color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer', fontSize: '14px', padding: '6px 10px',
          }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {!result && (
            <>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 8px' }}>
                  HOW FAR DID YOU GET?
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {STAGES.map(s => (
                    <button key={s} onClick={() => setStage(s)} style={{
                      padding: '5px 14px', borderRadius: '999px',
                      border: `1px solid ${stage === s ? '#EF4444' : BORDER}`,
                      background: stage === s ? 'rgba(239,68,68,0.1)' : 'transparent',
                      color: stage === s ? '#EF4444' : 'rgba(255,255,255,0.4)',
                      fontSize: '12px', fontWeight: stage === s ? 600 : 400,
                      cursor: 'pointer',
                    }}>{s}</button>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 8px' }}>
                  ANY FEEDBACK OR NOTES? (optional)
                </p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Did not hear back after technical round, recruiter said they went with someone with more fintech experience..."
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
                    color: '#fff', fontSize: '12px', resize: 'vertical',
                    boxSizing: 'border-box', outline: 'none', lineHeight: 1.6,
                    fontFamily: 'system-ui',
                  }}
                />
              </div>

              {error && <p style={{ fontSize: '12px', color: 'rgba(239,68,68,0.8)', margin: 0 }}>{error}</p>}

              <button onClick={handleAnalyse} disabled={loading} style={{
                padding: '12px', borderRadius: '10px',
                background: loading ? 'rgba(239,68,68,0.3)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                color: '#fff', border: 'none', fontSize: '14px',
                fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              }}>
                {loading ? '⟳ Analysing...' : '🔍 Analyse rejection'}
              </button>
            </>
          )}

          {result && (
            <>
              {/* Stage analysis */}
              <div style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', letterSpacing: '0.08em', margin: '0 0 8px' }}>
                  WHAT REJECTION AT {stage.toUpperCase()} MEANS
                </p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.65 }}>
                  {result.stage_analysis}
                </p>
              </div>

              {/* Likely reasons */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                  LIKELY REASONS
                </p>
                {result.likely_reasons.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#EF4444', flexShrink: 0, marginTop: '2px' }}>✕</span>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>{r}</p>
                  </div>
                ))}
              </div>

              {/* Skill gaps */}
              {result.skill_gaps_to_close.length > 0 && (
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                    GAPS TO CLOSE
                  </p>
                  {result.skill_gaps_to_close.map((g, i) => {
                    const color = PRIORITY_COLORS[g.priority]
                    return (
                      <div key={i} style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, marginBottom: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>{g.skill}</p>
                          <span style={{ fontSize: '10px', padding: '1px 8px', borderRadius: '999px', background: `${color}15`, color, border: `1px solid ${color}30` }}>
                            {g.priority}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5 }}>→ {g.how_to_close}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Next steps */}
              <div style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                  NEXT STEPS
                </p>
                {result.next_steps.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: TEAL, flexShrink: 0, fontWeight: 700 }}>{i + 1}.</span>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>{s}</p>
                  </div>
                ))}
              </div>

              {/* Reapply + similar roles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#3B82F6', letterSpacing: '0.08em', margin: '0 0 6px' }}>REAPPLY?</p>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff', margin: '0 0 6px' }}>{result.reapply_recommendation}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5 }}>{result.reapply_reasoning}</p>
                </div>
                <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.08em', margin: '0 0 8px' }}>TARGET INSTEAD</p>
                  {result.similar_roles_to_target.slice(0, 3).map((r, i) => (
                    <p key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', margin: '0 0 4px', lineHeight: 1.4 }}>→ {r}</p>
                  ))}
                </div>
              </div>

              <button onClick={() => setResult(null)} style={{
                padding: '8px', borderRadius: '8px',
                background: 'transparent', border: `1px solid ${BORDER}`,
                color: 'rgba(255,255,255,0.3)', fontSize: '12px', cursor: 'pointer',
              }}>
                ← Analyse again with different stage
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}