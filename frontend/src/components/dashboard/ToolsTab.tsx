'use client'
import { useState } from 'react'
import PentagramScore from '@/components/profile/PentagramScore'
import ProfileIntelligence from '@/components/profile/ProfileIntelligence'
import GenerativeAssets from '@/components/profile/GenerativeAssets'
import InferredSkills from '@/components/profile/InferredSkills'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface ToolsTabProps {
  userId: string
  tier?: string
  initialSection?: string
}
export default function ToolsTab({ userId, tier, initialSection }: ToolsTabProps) {
  const [section, setSection] = useState<'intelligence' | 'assets'>(
    initialSection === 'assets' ? 'assets' : 'intelligence'
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Section switcher */}
      <div style={{
        display: 'flex', gap: '6px',
        background: CARD, border: `1px solid ${BORDER}`,
        borderRadius: '12px', padding: '6px',
      }}>
        {[
          { key: 'intelligence', label: '🧠 Profile Intelligence', desc: 'Pentagram score, trajectory, hidden strengths' },
          { key: 'assets', label: '✦ Generative Assets', desc: 'LinkedIn, bios, pitches, brand statements' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key as 'intelligence' | 'assets')}
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

      {/* Intelligence section */}
      {section === 'intelligence' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 1.5rem' }}>
              PROFILE SCORE
            </p>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <PentagramScore userId={userId} size={280} variant="full" />
              <div style={{ flex: 1, minWidth: '220px' }}>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 1rem', lineHeight: 1.6 }}>
                  Your pentagram shows 5 dimensions of professional strength compared to your cohort average and top 10%. Hover any axis to see your score vs the benchmark.
                </p>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                  HOW SCORES ARE COMPUTED
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0, lineHeight: 1.65 }}>
                  Technical Depth — skills breadth and quality. Domain Expertise — company tenure and tier. Impact Magnitude — quantified achievements. Leadership Signals — team and stakeholder language. Learning Velocity — education, certs, skill diversity.
                </p>
              </div>
            </div>
          </div>

          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 1.25rem' }}>
              CAREER INTELLIGENCE
            </p>
            <ProfileIntelligence userId={userId} />
          </div>

          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 4px' }}>
              INFERRED SKILLS
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              Skills evidenced in your work history but not explicitly listed. Accept ones that belong on your profile.
            </p>
            <InferredSkills userId={userId} />
          </div>

        </div>
      )}

      {/* Assets section */}
      {section === 'assets' && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '1.5rem' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 4px' }}>
            GENERATIVE PROFILE ASSETS
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
            One-click generation of LinkedIn summaries, elevator pitches, bios, and personal brand statements — all tailored to your profile. Generated once and cached. Tweak and regenerate anytime.
          </p>
          <GenerativeAssets userId={userId} tier={tier} />
        </div>
      )}

    </div>
  )
}
