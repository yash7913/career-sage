'use client'
import { useState, useEffect } from 'react'
import GenerativeAssets from '@/components/profile/GenerativeAssets'
import JobEvaluator from '@/components/tools/JobEvaluator'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface ToolsTabProps {
  userId: string
  tier?: string
  initialSection?: string
  onSectionChange?: (section: string) => void
}

export default function ToolsTab({ userId, tier, initialSection, onSectionChange }: ToolsTabProps) {
  const [section, setSection] = useState<'evaluate' | 'resume'>(
    initialSection === 'resume' ? 'resume' : 'evaluate'
  )

  useEffect(() => {
    if (initialSection === 'resume' || initialSection === 'evaluate') {
      setSection(initialSection)
    }
  }, [initialSection])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Section switcher */}
      <div style={{
        display: 'flex', gap: '6px',
        background: CARD, border: `1px solid ${BORDER}`,
        borderRadius: '12px', padding: '6px',
      }}>
        {[
          { key: 'evaluate', label: '🔍 Job Evaluator', desc: 'Paste any JD — get ATS + recruiter fit scores' },
          { key: 'resume',   label: '✦ Generative Assets', desc: 'LinkedIn, bios, pitches, brand statements' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => { setSection(s.key as 'evaluate' | 'resume'); onSectionChange?.(s.key) }}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: '8px',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              background: section === s.key ? 'rgba(16,185,129,0.12)' : 'transparent',
              boxShadow: section === s.key ? 'inset 0 0 0 1px rgba(16,185,129,0.25)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <p style={{ fontSize: '13px', fontWeight: 600, color: section === s.key ? TEAL : 'rgba(255,255,255,0.5)', margin: '0 0 2px' }}>
              {s.label}
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{s.desc}</p>
          </button>
        ))}
      </div>

      {/* Job Evaluator */}
      {section === 'evaluate' && (
        <JobEvaluator userId={userId} />
      )}

      {/* Generative Assets */}
      {section === 'resume' && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 4px' }}>
            GENERATIVE PROFILE ASSETS
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
            One-click generation of LinkedIn summaries, elevator pitches, bios, and personal brand statements — all tailored to your profile. Generated once and cached. Tweak and regenerate anytime.
          </p>
          <GenerativeAssets userId={userId} tier={tier} />
        </div>
      )}

    </div>
  )
}
