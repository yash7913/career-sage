'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

interface Question {
  question: string
  why: string
  tip: string
}

interface Round {
  round: string
  description: string
  questions: Question[]
}

interface InterviewQuestionsProps {
  jobId: string
  userId: string
  jobTitle: string
  company: string
  tier?: string
  cachedQuestions?: { rounds: Round[] } | null
}

const ROUND_COLORS: Record<string, string> = {
  Screening: '#3B82F6',
  Technical: '#F59E0B',
  'Product/Case': TEAL,
  Leadership: '#7F77DD',
  Final: '#F97316',
}

export default function InterviewQuestions({
  jobId, userId, jobTitle, company, tier, cachedQuestions
}: InterviewQuestionsProps) {
  const [data, setData] = useState<{ rounds: Round[] } | null>(cachedQuestions || null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setData(null)
    handleGenerate()
  }, [jobId])
  const [activeRound, setActiveRound] = useState(0)
  const [expandedQ, setExpandedQ] = useState<number | null>(null)
  const isPro = tier === 'PREMIUM_PRO' || tier === 'STUDENT_VERIFIED'

  const handleGenerate = async (forceRegenerate = false) => {
    setLoading(true)
    try {
      if (!forceRegenerate) {
        const cached = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/interview-questions-cached?job_id=${jobId}`)
        if (cached.ok) {
          const cachedData = await cached.json()
          if (cachedData?.rounds?.length > 0) {
            setData(cachedData)
            setActiveRound(0)
            setLoading(false)
            return
          }
        }
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/interview-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, job_id: jobId }),
      })
      if (res.ok) {
        const d = await res.json()
        setData(d)
        setActiveRound(0)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!data) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
          {loading ? '⟳ Predicting interview questions...' : 'Loading...'}
        </p>
      </div>
    )
  }

  const rounds = data.rounds || []
  const visibleRounds = isPro ? rounds : rounds.slice(0, 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Round tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {rounds.map((r, i) => {
          const isLocked = !isPro && i > 0
          const color = ROUND_COLORS[r.round] || TEAL
          return (
            <button
              key={r.round}
              onClick={e => { e.stopPropagation(); if (!isLocked) setActiveRound(i) }}
              style={{
                padding: '5px 14px', borderRadius: '999px',
                border: `1px solid ${activeRound === i ? color : BORDER}`,
                background: activeRound === i ? `${color}15` : 'transparent',
                color: isLocked ? 'rgba(255,255,255,0.2)' : activeRound === i ? color : 'rgba(255,255,255,0.4)',
                fontSize: '12px', fontWeight: activeRound === i ? 600 : 400,
                cursor: isLocked ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}
            >
              {r.round}
              {isLocked && <span style={{ fontSize: '9px' }}>🔒</span>}
            </button>
          )
        })}
        {!isPro && (
          <span style={{
            fontSize: '11px', padding: '5px 10px', borderRadius: '999px',
            background: 'rgba(245,158,11,0.1)', color: '#F59E0B',
            border: '1px solid rgba(245,158,11,0.2)',
          }}>
            Pro unlocks all rounds
          </span>
        )}
      </div>

      {/* Active round */}
      {rounds[activeRound] && (
        <div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '0 0 10px' }}>
            {rounds[activeRound].description}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rounds[activeRound].questions.map((q, qi) => (
              <div
                key={qi}
                style={{
                  borderRadius: '10px', overflow: 'hidden',
                  border: `1px solid ${expandedQ === qi ? 'rgba(255,255,255,0.12)' : BORDER}`,
                  background: expandedQ === qi ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <button
                  onClick={e => { e.stopPropagation(); setExpandedQ(expandedQ === qi ? null : qi) }}
                  style={{
                    width: '100%', padding: '12px 14px',
                    background: 'transparent', border: 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    cursor: 'pointer', textAlign: 'left', gap: '10px',
                  }}
                >
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#fff', margin: 0, lineHeight: 1.5, flex: 1 }}>
                    {q.question}
                  </p>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', flexShrink: 0, marginTop: '2px' }}>
                    {expandedQ === qi ? '▲' : '▼'}
                  </span>
                </button>

                {expandedQ === qi && (
                  <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{
                      padding: '10px 12px', borderRadius: '8px',
                      background: 'rgba(59,130,246,0.06)',
                      border: '1px solid rgba(59,130,246,0.15)',
                    }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#3B82F6', margin: '0 0 4px', letterSpacing: '0.06em' }}>
                        WHY THEY ASK THIS
                      </p>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>
                        {q.why}
                      </p>
                    </div>
                    <div style={{
                      padding: '10px 12px', borderRadius: '8px',
                      background: 'rgba(16,185,129,0.06)',
                      border: '1px solid rgba(16,185,129,0.15)',
                    }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: TEAL, margin: '0 0 4px', letterSpacing: '0.06em' }}>
                        HOW TO ANSWER
                      </p>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>
                        {q.tip}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regenerate */}
      <button
        onClick={e => { e.stopPropagation(); handleGenerate(true) }}
        disabled={loading}
        style={{
          padding: '7px', borderRadius: '8px',
          background: 'transparent', border: `1px solid ${BORDER}`,
          color: 'rgba(255,255,255,0.3)', fontSize: '12px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '⟳ Regenerating...' : '↺ Regenerate questions'}
      </button>
    </div>
  )
}