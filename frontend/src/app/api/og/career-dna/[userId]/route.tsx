import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

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
    const readinessScore = data.promotion_readiness?.score ?? 0
    const readinessVerdict = data.promotion_readiness?.verdict || ''
    const marketLabel = data.market_position?.label || ''
    const nextRole = data.next_role || ''

    const IMPACT_ICONS: Record<string, string> = {
      Builder: '🏗️', Scaler: '📈', Optimizer: '⚙️', Fixer: '🔧', Strategist: '🎯',
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            background: '#0d1117',
            padding: '64px',
            position: 'relative',
            fontFamily: 'system-ui',
          }}
        >
          {/* Background glow accents */}
          <div style={{
            position: 'absolute', top: '-100px', right: '-100px',
            width: '500px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
            display: 'flex',
          }} />

          {/* Logo row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
            <img
              src={`${req.nextUrl.origin}/icon-192.png`}
              width={40}
              height={40}
              style={{ borderRadius: '11px' }}
            />
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>Career Sage</span>
          </div>

          {/* Name + headline */}
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '40px' }}>
            <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', display: 'flex' }}>
              CAREER DNA
            </span>
            <span style={{ fontSize: '52px', fontWeight: 800, color: '#fff', letterSpacing: '-1px', display: 'flex' }}>
              {fullName}
            </span>
          </div>

          {/* Badges row */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '48px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', padding: '10px 20px', borderRadius: '999px',
              background: 'rgba(59,130,246,0.12)', border: '2px solid rgba(59,130,246,0.3)',
              fontSize: '20px', color: '#3B82F6', fontWeight: 600,
            }}>
              {cohort}
            </div>
            {impactPattern && (
              <div style={{
                display: 'flex', alignItems: 'center', padding: '10px 20px', borderRadius: '999px',
                background: 'rgba(245,158,11,0.12)', border: '2px solid rgba(245,158,11,0.3)',
                fontSize: '20px', color: '#F59E0B', fontWeight: 600,
              }}>
                {IMPACT_ICONS[impactPattern] || ''} {impactPattern}
              </div>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
            <div style={{
              display: 'flex', flexDirection: 'column', flex: 1, padding: '28px',
              borderRadius: '20px', background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px', display: 'flex' }}>
                PROMOTION READINESS
              </span>
              <span style={{ fontSize: '48px', fontWeight: 800, color: '#10B981', display: 'flex', lineHeight: 1 }}>
                {readinessScore}%
              </span>
              <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', marginTop: '10px', display: 'flex' }}>
                {readinessVerdict}
              </span>
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', flex: 1, padding: '28px',
              borderRadius: '20px', background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', display: 'flex' }}>
                MARKET POSITION
              </span>
              <span style={{ fontSize: '26px', fontWeight: 700, color: '#fff', display: 'flex', lineHeight: 1.3 }}>
                {marketLabel}
              </span>
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', flex: 1, padding: '28px',
              borderRadius: '20px', background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', display: 'flex' }}>
                NEXT ROLE
              </span>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff', display: 'flex', lineHeight: 1.3 }}>
                {nextRole}
              </span>
            </div>
          </div>

          {/* Footer CTA */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px' }}>
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