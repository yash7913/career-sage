'use client'
import { useState, useEffect } from 'react'
import MarkdownRenderer from './MarkdownRenderer'
import { parseATSFromContent, atsColor } from '@/lib/ats-score'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface Job {
  job_id: string
  job_title: string
  company_name: string
  location: string
  match_percentage_score: number
  skills_needed: string[]
  identified_skill_gaps: string[]
}

interface EvaluateResumeProps {
  job: Job
  userId: string
  trackId: string
  onClose: () => void
  onApply: () => void
}

const scoreColor = (score: number) =>
  score >= 70 ? TEAL : score >= 50 ? '#F59E0B' : '#EF4444'

function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 32
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ
  const color = scoreColor(score)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 40 40)" />
        <text x="40" y="40" textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: '15px', fontWeight: 700, fill: color, fontFamily: 'system-ui' }}>
          {score}%
        </text>
      </svg>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0, textAlign: 'center' }}>{label}</p>
    </div>
  )
}

interface VersionRow {
  version_id: string
  version_number: number
  created_at: string
  user_tweak?: string
  resume_content?: string
}

export default function EvaluateResume({ job, userId, trackId, onClose, onApply }: EvaluateResumeProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'paste'>('profile')
  const [profileFit, setProfileFit] = useState<{
    match_percentage: number
    matched_skills: string[]
    skill_gaps: string[]
    cohort: string
    summary: string
  } | null>(null)
  const [versions, setVersions] = useState<VersionRow[]>([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [resumeText, setResumeText] = useState('')
  const [evaluating, setEvaluating] = useState(false)
  const [evalResult, setEvalResult] = useState<{ ats_score: number; fit_score: number; evaluation: string } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/${userId}`).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/generate/versions?user_id=${userId}&track_id=${trackId}&job_id=${job.job_id}`)
        .then(r => r.json()).catch(() => []),
    ]).then(([profile, versionData]) => {
      const skills: string[] = profile.extracted_skills || []
      const skillSet = new Set(skills.map(s => s.toLowerCase()))
      const matched = job.skills_needed.filter(s => skillSet.has(s.toLowerCase()))
      setProfileFit({
        match_percentage: job.match_percentage_score,
        matched_skills: matched,
        skill_gaps: job.identified_skill_gaps || [],
        cohort: profile.cohort || '',
        summary: profile.extracted_summary || '',
      })
      setVersions(Array.isArray(versionData) ? versionData : [])
    }).finally(() => setLoadingProfile(false))
  }, [userId, job.job_id, trackId])

  const handleEvaluate = async () => {
    if (!resumeText.trim()) return
    setEvaluating(true)
    setError('')
    setEvalResult(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/generate/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, job_id: job.job_id, resume_text: resumeText }),
      })
      if (!res.ok) { const err = await res.json(); setError(err.detail || 'Evaluation failed'); return }
      setEvalResult(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', backdropFilter: 'blur(12px)', overflow: 'hidden',
    }}>
      <div style={{
        background: '#0d1117', border: `1px solid ${BORDER}`,
        borderRadius: '20px', width: '100%', maxWidth: '860px',
        height: '90vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>

        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexShrink: 0, background: CARD,
        }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', margin: '0 0 4px' }}>JOB FIT ANALYSIS</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.4px' }}>{job.job_title}</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{job.company_name} · {job.location}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={onApply} style={{ padding: '8px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Apply →</button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: '8px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '14px', padding: '6px 10px' }}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 1.5rem', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: '4px', height: '48px', alignItems: 'center', background: CARD, flexShrink: 0 }}>
          {[{ key: 'profile', label: '👤 Profile fit' }, { key: 'paste', label: '📄 Evaluate a resume' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as 'profile' | 'paste')} style={{
              padding: '6px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: activeTab === tab.key ? 600 : 400,
              background: activeTab === tab.key ? 'rgba(16,185,129,0.12)' : 'transparent',
              color: activeTab === tab.key ? TEAL : 'rgba(255,255,255,0.4)',
              boxShadow: activeTab === tab.key ? 'inset 0 0 0 1px rgba(16,185,129,0.25)' : 'none',
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

          {/* Profile fit tab */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {loadingProfile ? (
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Analysing profile fit...</p>
              ) : profileFit && (
                <>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '1.25rem 1.5rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, flexWrap: 'wrap' }}>
                    <ScoreRing score={profileFit.match_percentage} label="Profile match" />
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: '0 0 6px' }}>
                        {profileFit.match_percentage >= 70 ? 'Strong profile fit for this role' : profileFit.match_percentage >= 50 ? 'Moderate profile fit — gaps closable' : 'Partial fit — this role stretches your profile'}
                      </p>
                      {profileFit.cohort && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>Your cohort: <span style={{ color: TEAL }}>{profileFit.cohort}</span></p>}
                      {profileFit.summary && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>&ldquo;{profileFit.summary.slice(0, 120)}...&rdquo;</p>}
                    </div>
                  </div>

                  {profileFit.matched_skills.length > 0 && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 8px' }}>SKILLS YOU HAVE</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {profileFit.matched_skills.map(s => (
                          <span key={s} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', color: TEAL, border: '1px solid rgba(16,185,129,0.25)' }}>✓ {s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {profileFit.skill_gaps.length > 0 && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 8px' }}>GAPS TO CLOSE</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {profileFit.skill_gaps.map(s => (
                          <span key={s} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.8)', border: '1px solid rgba(239,68,68,0.2)' }}>✕ {s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: 0 }}>RESUME VERSIONS FOR THIS ROLE</p>
                      <button onClick={onApply} style={{ padding: '5px 14px', borderRadius: '7px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>⚡ New version</button>
                    </div>
                    {versions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {versions.slice(0, 6).map((v, idx) => {
                          const ats = parseATSFromContent(v.resume_content || '')
                          const color = ats ? atsColor(ats.strength) : 'rgba(255,255,255,0.3)'
                          return (
                            <div key={v.version_id} style={{ padding: '10px 14px', borderRadius: '10px', background: idx === 0 ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${idx === 0 ? 'rgba(16,185,129,0.2)' : BORDER}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ minWidth: '28px' }}>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: idx === 0 ? TEAL : '#fff', margin: 0 }}>v{v.version_number}</p>
                                {idx === 0 && <p style={{ fontSize: '9px', color: TEAL, margin: 0, fontWeight: 600 }}>LATEST</p>}
                              </div>
                              {ats && (
                                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: `${color}15`, color, border: `1px solid ${color}30`, flexShrink: 0, whiteSpace: 'nowrap' }}>
                                  {ats.label}
                                </span>
                              )}
                              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {new Date(v.created_at).toLocaleDateString()}{v.user_tweak ? ` · ${v.user_tweak.slice(0, 30)}` : ''}
                              </p>
                              <button onClick={onApply} style={{ padding: '5px 12px', borderRadius: '7px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: `1px solid ${BORDER}`, fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Improve →</button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, textAlign: 'center' }}>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 10px' }}>No resume generated for this role yet</p>
                        <button onClick={onApply} style={{ padding: '9px 20px', borderRadius: '8px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Generate first resume →</button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Paste tab */}
          {activeTab === 'paste' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6 }}>
                Paste any resume text — your own, a previous version, or a draft. Career Sage will score it against this JD and tell you exactly what to improve.
              </p>
              <textarea
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                placeholder="Paste your full resume text here..."
                rows={10}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#fff', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', outline: 'none', lineHeight: 1.6, fontFamily: 'system-ui, sans-serif' }}
              />
              <button onClick={handleEvaluate} disabled={evaluating || !resumeText.trim()} style={{ padding: '12px', borderRadius: '10px', background: evaluating || !resumeText.trim() ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', fontSize: '14px', fontWeight: 700, cursor: evaluating || !resumeText.trim() ? 'not-allowed' : 'pointer' }}>
                {evaluating ? '⟳ Evaluating...' : '🔍 Evaluate this resume'}
              </button>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: '-6px 0 0', textAlign: 'center' }}>Does not count toward your generation limit</p>
              {error && <p style={{ fontSize: '13px', color: 'rgba(239,68,68,0.85)' }}>{error}</p>}
              {evalResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1, padding: '14px', borderRadius: '10px', textAlign: 'center', background: `${scoreColor(evalResult.ats_score)}10`, border: `1px solid ${scoreColor(evalResult.ats_score)}30` }}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>ATS SCORE</p>
                      <p style={{ fontSize: '28px', fontWeight: 700, color: scoreColor(evalResult.ats_score), margin: 0 }}>{evalResult.ats_score}%</p>
                    </div>
                    <div style={{ flex: 1, padding: '14px', borderRadius: '10px', textAlign: 'center', background: `${scoreColor(evalResult.fit_score)}10`, border: `1px solid ${scoreColor(evalResult.fit_score)}30` }}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>FIT SCORE</p>
                      <p style={{ fontSize: '28px', fontWeight: 700, color: scoreColor(evalResult.fit_score), margin: 0 }}>{evalResult.fit_score}%</p>
                    </div>
                  </div>
                  <MarkdownRenderer content={evalResult.evaluation} variant="report" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}