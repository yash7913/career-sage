import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VaultUpload from '@/components/profile/VaultUpload'
import TrackSetup from '@/components/profile/TrackSetup'
import DiscoveryFeed from '@/components/jobs/DiscoveryFeed'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [profileRes, tracksRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/${user.id}`, { cache: 'no-store' }),
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tracks/${user.id}`, { cache: 'no-store' }),
  ])

  const profile = profileRes.ok ? await profileRes.json() : null
  const tracks = tracksRes.ok ? await tracksRes.json() : []

  const completeness = profile?.profile_completeness_score ?? 0
  const hasProfile = completeness > 0
  const hasTracks = tracks.length > 0

  const tierColors: Record<string, string> = {
    STUDENT_VERIFIED: '#10B981',
    PREMIUM_PRO: '#7F77DD',
    GENERAL_FREE: 'rgba(255,255,255,0.4)',
  }
  const tierLabels: Record<string, string> = {
    STUDENT_VERIFIED: 'Academic tier',
    PREMIUM_PRO: 'Pro',
    GENERAL_FREE: 'Free tier',
  }
  const tier = profile?.tier_status ?? 'GENERAL_FREE'

  return (
    <main style={{ minHeight: '100vh', background: '#0d1117', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Top bar */}
      <div style={{
        borderBottom: `1px solid ${BORDER}`, padding: '0 5%', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(13,17,23,0.9)', backdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <span style={{ fontSize: '16px', fontWeight: 600 }}>Career Sage</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{
            fontSize: '12px', fontWeight: 600, padding: '3px 12px',
            borderRadius: '999px', background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${tierColors[tier]}`, color: tierColors[tier],
          }}>
            {tierLabels[tier]}
          </span>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>{user.email}</span>
          <a href="/" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>← Home</a>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 5%' }}>

        {/* Welcome */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, margin: '0 0 4px', letterSpacing: '-1px' }}>
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            {!hasProfile ? 'Upload your documents to get started.'
              : !hasTracks ? 'Profile ready. Set up your first career track.'
              : 'Your ranked job feed is below.'}
          </p>
        </div>

        {/* Progress steps */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { num: '01', label: 'Upload documents', done: hasProfile },
            { num: '02', label: 'Set up career track', done: hasTracks },
            { num: '03', label: 'Ranked job feed', done: hasTracks },
          ].map((step, i) => (
            <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '5px 14px', borderRadius: '999px',
                background: step.done ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${step.done ? 'rgba(16,185,129,0.3)' : BORDER}`,
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: step.done ? TEAL : 'rgba(255,255,255,0.3)' }}>
                  {step.done ? '✓' : step.num}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: step.done ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)' }}>
                  {step.label}
                </span>
              </div>
              {i < 2 && <div style={{ width: '20px', height: '1px', background: BORDER }} />}
            </div>
          ))}
        </div>

        {/* Completeness bar */}
        {hasProfile && (
          <div style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>Profile completeness</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: TEAL }}>{completeness}%</span>
            </div>
            <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
              <div style={{ height: '100%', width: `${completeness}%`, background: TEAL, borderRadius: '3px' }} />
            </div>
            {profile?.extracted_summary && (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: '0 0 10px', fontStyle: 'italic' }}>
                &ldquo;{profile.extracted_summary}&rdquo;
              </p>
            )}
            {profile?.extracted_skills?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {profile.extracted_skills.slice(0, 12).map((s: string) => (
                  <span key={s} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.08)', color: TEAL, border: '1px solid rgba(16,185,129,0.2)' }}>{s}</span>
                ))}
                {profile.extracted_skills.length > 12 && (
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', alignSelf: 'center' }}>+{profile.extracted_skills.length - 12} more</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main content */}
        {!hasProfile && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '2rem' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 6px' }}>STEP 01</p>
            <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Upload your documents</h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
              Add your resume and any other career documents. Career Sage will extract your skills, education, and professional summary automatically.
            </p>
            <VaultUpload />
          </div>
        )}

        {hasProfile && !hasTracks && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '2rem' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 6px' }}>YOUR VAULT</p>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 6px' }}>Add more documents</h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
                Upload more documents to improve your profile.
              </p>
              <VaultUpload />
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '2rem' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 6px' }}>STEP 02</p>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 6px' }}>Set up your first career track</h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
                Define what you are targeting. Each track gets its own ranked job feed.
              </p>
              <TrackSetup userId={user.id} />
            </div>
          </div>
        )}

        {hasTracks && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'flex-start' }}>
            {/* Discovery feed */}
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 1rem' }}>DISCOVERY FEED</p>
              <DiscoveryFeed userId={user.id} tracks={tracks} />
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Add documents */}
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '1.25rem' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 10px' }}>YOUR VAULT</p>
                <VaultUpload />
              </div>

              {/* Add track */}
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '1.25rem' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 10px' }}>ADD TRACK</p>
                <TrackSetup userId={user.id} />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}