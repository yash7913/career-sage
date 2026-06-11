'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

interface InferredSkill {
  skill: string
  confidence: 'High' | 'Medium'
  evidence: string
  category: string
}

const CATEGORY_COLORS: Record<string, string> = {
  Technical: '#3B82F6',
  Domain: '#7F77DD',
  Leadership: '#F59E0B',
  Methodology: TEAL,
}

export default function InferredSkills({ userId }: { userId: string }) {
  const [skills, setSkills] = useState<InferredSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [accepted, setAccepted] = useState<Set<string>>(new Set())
  const [rejected, setRejected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/inferred-skills/${userId}`)
      .then(r => r.json())
      .then(d => setSkills(d.inferred_skills || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const toggle = (skill: string, action: 'accept' | 'reject') => {
    if (action === 'accept') {
      setAccepted(prev => { const n = new Set(prev); n.has(skill) ? n.delete(skill) : n.add(skill); return n })
      setRejected(prev => { const n = new Set(prev); n.delete(skill); return n })
    } else {
      setRejected(prev => { const n = new Set(prev); n.has(skill) ? n.delete(skill) : n.add(skill); return n })
      setAccepted(prev => { const n = new Set(prev); n.delete(skill); return n })
    }
  }

  const handleSave = async () => {
    if (accepted.size === 0) return
    setSaving(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/accept-inferred-skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, skills: Array.from(accepted) }),
      })
      setSaved(true)
      setSkills(prev => prev.filter(s => !accepted.has(s.skill) && !rejected.has(s.skill)))
      setAccepted(new Set())
      setRejected(new Set())
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
      Analysing your work history for inferred skills...
    </p>
  )

  if (skills.length === 0) return (
    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
      No additional skills inferred — your profile looks complete.
    </p>
  )

  const remaining = skills.filter(s => !accepted.has(s.skill) && !rejected.has(s.skill))

  if (remaining.length === 0) return (
    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
      ✓ All inferred skills reviewed
    </p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6 }}>
        Career Sage found these skills evidenced in your work history but not explicitly listed. Accept the ones that apply.
      </p>

      {remaining.map(skill => {
        const catColor = CATEGORY_COLORS[skill.category] || TEAL
        const isAccepted = accepted.has(skill.skill)
        const isRejected = rejected.has(skill.skill)

        return (
          <div key={skill.skill} style={{
            padding: '12px 14px', borderRadius: '12px',
            background: isAccepted ? 'rgba(16,185,129,0.06)' :
                        isRejected ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isAccepted ? 'rgba(16,185,129,0.25)' : BORDER}`,
            opacity: isRejected ? 0.4 : 1,
            transition: 'all 0.15s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: isAccepted ? TEAL : '#fff', margin: 0 }}>
                    {skill.skill}
                  </p>
                  <span style={{
                    fontSize: '10px', padding: '1px 7px', borderRadius: '999px',
                    background: `${catColor}15`, color: catColor,
                    border: `1px solid ${catColor}25`,
                  }}>{skill.category}</span>
                  {skill.confidence === 'High' && (
                    <span style={{
                      fontSize: '10px', padding: '1px 7px', borderRadius: '999px',
                      background: 'rgba(16,185,129,0.1)', color: TEAL,
                      border: '1px solid rgba(16,185,129,0.2)',
                    }}>High confidence</span>
                  )}
                </div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>
                  &ldquo;{skill.evidence}&rdquo;
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  onClick={() => toggle(skill.skill, 'accept')}
                  style={{
                    padding: '5px 12px', borderRadius: '7px', fontSize: '12px',
                    fontWeight: 600, cursor: 'pointer',
                    background: isAccepted ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                    color: isAccepted ? TEAL : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${isAccepted ? 'rgba(16,185,129,0.3)' : BORDER}`,
                  }}
                >
                  {isAccepted ? '✓ Added' : '+ Add'}
                </button>
                <button
                  onClick={() => toggle(skill.skill, 'reject')}
                  style={{
                    padding: '5px 10px', borderRadius: '7px', fontSize: '12px',
                    cursor: 'pointer', background: 'transparent',
                    color: 'rgba(255,255,255,0.2)', border: `1px solid ${BORDER}`,
                  }}
                >✕</button>
              </div>
            </div>
          </div>
        )
      })}

      {accepted.size > 0 && (
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px', borderRadius: '9px',
            background: saving ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10B981, #059669)',
            color: '#fff', border: 'none', fontSize: '13px',
            fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saved ? '✓ Skills added to profile' : saving ? '⟳ Saving...' : `Add ${accepted.size} skill${accepted.size > 1 ? 's' : ''} to profile`}
        </button>
      )}
    </div>
  )
}
