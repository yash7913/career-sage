import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const AXIS_LABELS: Record<string, string> = {
  technical_depth: 'Technical Depth',
  domain_expertise: 'Domain Expertise',
  impact_magnitude: 'Impact',
  leadership_signals: 'Leadership',
  learning_velocity: 'Learning',
}

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/profile/career-dna/${params.userId}`,
      { cache: 'no-store' }
    )

    if (!res.ok) {
      return new Response('Profile not found', { status: 404 })
    }

    const data = await res.json()

    const fullName = data.full_name || 'Career Sage User'
    const cohort = data.cohort || 'Tech Professional'
    const impactPattern = data.impact_pattern || ''
    const scores = data.pentagram?.scores || {}

    const IMPACT_ICONS: Record<string, string> = {
      Builder: '🏗️', Scaler: '📈', Optimizer: '⚙️', Fixer: '🔧', Strategist: '🎯',
    }

    const axisKeys = ['technical_depth', 'domain_expertise', 'impact_magnitude', 'leadership_signals', 'learning_velocity']

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            background: '#0d1117',
            padding: '56px 64px',
            position: 'relative',
            fontFamily: 'system-ui',
          }}
        >
          <div style={{
            position: 'absolute', top: '-100px', right: '-100px',
            width: '500px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
            display: 'flex',
          }} />

          {/* Header row — name left, logo + brand right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '46px', fontWeight: 800, color: '#fff', letterSpacing: '-1px', display: 'flex' }}>
                {fullName}
              </span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', padding: '8px 18px', borderRadius: '999px',
                  background: 'rgba(59,130,246,0.12)', border: '2px solid rgba(59,130,246,0.3)',
                  fontSize: '17px', color: '#3B82F6', fontWeight: 600,
                }}>
                  {cohort}
                </div>
                {impactPattern && (
                  <div style={{
                    display: 'flex', alignItems: 'center', padding: '8px 18px', borderRadius: '999px',
                    background: 'rgba(245,158,11,0.12)', border: '2px solid rgba(245,158,11,0.3)',
                    fontSize: '17px', color: '#F59E0B', fontWeight: 600,
                  }}>
                    {IMPACT_ICONS[impactPattern] || ''} {impactPattern}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '26px', fontWeight: 700, color: '#fff', display: 'flex' }}>Career Sage</span>
              <img
                src={`${req.nextUrl.origin}/icon-192.png`}
                width={52}
                height={52}
                style={{ borderRadius: '14px' }}
              />
            </div>
          </div>

          {/* Pentagram scores — five axes, single-line value per row */}
          <div style={{
            display: 'flex', flexDirection: 'column', flex: 1, borderRadius: '20px', padding: '1px',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.6) 0%, rgba(6,182,212,0.3) 40%, rgba(16,185,129,0.4) 100%)',
          }}>
            <div style={{
              display: 'flex', flexDirection: 'column', flex: 1, borderRadius: '19px',
              background: '#161b22', padding: '32px 40px', justifyContent: 'space-between',
            }}>
              {axisKeys.map((key) => {
                const val = scores[key] ?? 0
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '22px', color: 'rgba(255,255,255,0.75)', display: 'flex', fontWeight: 500 }}>
                      {AXIS_LABELS[key]}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '420px' }}>
                      <div style={{
                        display: 'flex', flex: 1, height: '12px', borderRadius: '999px',
                        background: 'rgba(255,255,255,0.08)', position: 'relative',
                      }}>
                        <div style={{
                          display: 'flex', height: '12px', borderRadius: '999px',
                          width: `${Math.min(100, val)}%`,
                          background: 'linear-gradient(90deg, #10B981, #06B6D4)',
                        }} />
                      </div>
                      <span style={{ fontSize: '26px', fontWeight: 800, color: '#10B981', display: 'flex', width: '70px' }}>
                        {val}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer CTA */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
            <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
              Find out yours →
            </span>
            <span style={{ fontSize: '18px', color: '#10B981', fontWeight: 600, display: 'flex' }}>
              career-sage-sigma.vercel.app
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e) {
    return new Response('Failed to generate image', { status: 500 })
  }
}