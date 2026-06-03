import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardTabs from '@/components/dashboard/DashboardTabs'
import NotificationBell from '@/components/ui/NotificationBell'
import StatusToggle from '@/components/dashboard/StatusToggle'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

const COHORT_COLORS: Record<string, string> = {
  'Technical PM': '#3B82F6',
  'Data-Oriented PM': '#10B981',
  'Growth PM': '#F59E0B',
  'Analytics Engineer': '#7F77DD',
  'Data Scientist': '#06B6D4',
  'Full-Stack Engineer': '#F97316',
  'ML Engineer': '#EC4899',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [profileRes, tracksRes, rankingsRes, pipelineRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/${user.id}`, { cache: 'no-store' }),
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tracks/${user.id}`, { cache: 'no-store' }),
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/feed?user_id=${user.id}&track_id=all&limit=1`, { cache: 'no-store' }),
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tracker/${user.id}`, { cache: 'no-store' }),
  ])

  const profile = profileRes.ok ? await profileRes.json() : null
  const tracks = tracksRes.ok ? await tracksRes.json() : []
  const pipeline = pipelineRes.ok ? await pipelineRes.json() : []

  const completeness = profile?.profile_completeness_score ?? 0
  const hasProfile = completeness > 0
  const hasTracks = tracks.length > 0

  const tierColors: Record<string, string> = {
    STUDENT_VERIFIED: '#10B981',
    PREMIUM_PRO: '#7F77DD',
    GENERAL_FREE: 'rgba(255,255,255,0.4)',
  }
  const tierLabels: Record<string, string> = {
    STUDENT_VERIFIED: 'Academic',
    PREMIUM_PRO: 'Pro',
    GENERAL_FREE: 'Free',
  }
  const tier = profile?.tier_status ?? 'GENERAL_FREE'
  const cohort = profile?.cohort ?? null
  const cohortColor = cohort ? (COHORT_COLORS[cohort] ?? TEAL) : TEAL

  const firstName = profile?.full_name
    ? profile.full_name.split(' ')[0]
    : user.email?.split('@')[0] ?? 'there'

const applicationsTracked = Array.isArray(pipeline) ? pipeline.length : 0
  const generationCount = profile?.generation_count ?? 0

  let matchedJobs = 0
  let topMatchScore = 0

  if (hasTracks && tracks.length > 0) {
    try {
      const feedRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/feed?user_id=${user.id}&track_id=${tracks[0].track_id}&limit=50`,
        { cache: 'no-store' }
      )
      if (feedRes.ok) {
        const feedData = await feedRes.json()
        matchedJobs = feedData.total || feedData.jobs?.length || 0
        topMatchScore = feedData.jobs?.length > 0
          ? Math.max(...feedData.jobs.map((j: { match_percentage_score: number }) => j.match_percentage_score))
          : 0
      }
    } catch {}
  }
  return (
    <main style={{
      minHeight: '100vh',
      background: '#0d1117',
      color: '#fff',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>

      {/* Sticky top bar */}
      <div style={{
        borderBottom: `1px solid ${BORDER}`,
        padding: '0 5%',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(13,17,23,0.92)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px',
          }}>
            ⚡
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
            Career Sage
          </span>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <StatusToggle userId={user.id} initialStatus={profile?.search_status || 'ACTIVE'} />
          <NotificationBell userId={user.id} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '5px 10px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${BORDER}`,
          }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${tierColors[tier]}, ${tierColors[tier]}88)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, color: '#fff',
            }}>
              {firstName[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{user.email}</span>
            <span style={{
              fontSize: '10px', fontWeight: 700, padding: '2px 7px',
              borderRadius: '999px',
              background: `${tierColors[tier]}18`,
              color: tierColors[tier],
              border: `1px solid ${tierColors[tier]}40`,
            }}>
              {tierLabels[tier]}
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 5%' }}>

        {/* Welcome section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
        }}>
          <div>
            <h1 style={{
              fontSize: '32px', fontWeight: 700,
              margin: '0 0 8px', letterSpacing: '-1px',
              background: 'linear-gradient(135deg, #fff 60%, rgba(255,255,255,0.5))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Welcome back, {firstName}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {cohort && (
                <span style={{
                  fontSize: '12px', fontWeight: 600,
                  padding: '3px 10px', borderRadius: '999px',
                  background: `${cohortColor}15`,
                  color: cohortColor,
                  border: `1px solid ${cohortColor}30`,
                }}>
                  {cohort}
                </span>
              )}
              {hasProfile && (
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
                  {completeness}% profile complete
                </span>
              )}
              {!hasProfile && (
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
                  Upload your resume to get started
                </span>
              )}
            </div>
          </div>

          {/* Completeness ring */}
          {hasProfile && (
            <div style={{ flexShrink: 0 }}>
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                <circle cx="28" cy="28" r="22" fill="none" stroke={TEAL} strokeWidth="4"
                  strokeDasharray={`${(completeness / 100) * 138.2} 138.2`}
                  strokeLinecap="round"
                  transform="rotate(-90 28 28)" />
                <text x="28" y="28" textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: '11px', fontWeight: 700, fill: TEAL, fontFamily: 'system-ui' }}>
                  {completeness}%
                </text>
              </svg>
            </div>
          )}
        </div>

        {/* Progress steps — only shown before setup complete */}
        {(!hasProfile || !hasTracks) && (
          <div style={{
            display: 'flex', gap: '8px', marginBottom: '2rem',
            alignItems: 'center', flexWrap: 'wrap',
          }}>
            {[
              { num: '01', label: 'Upload documents', done: hasProfile },
              { num: '02', label: 'Set up career track', done: hasTracks },
              { num: '03', label: 'Discover jobs', done: hasTracks },
            ].map((step, i) => (
              <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '5px 14px', borderRadius: '999px',
                  background: step.done ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${step.done ? 'rgba(16,185,129,0.3)' : BORDER}`,
                }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 700,
                    color: step.done ? TEAL : 'rgba(255,255,255,0.25)',
                  }}>
                    {step.done ? '✓' : step.num}
                  </span>
                  <span style={{
                    fontSize: '12px', fontWeight: 500,
                    color: step.done ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                  }}>
                    {step.label}
                  </span>
                </div>
                {i < 2 && <div style={{ width: '20px', height: '1px', background: BORDER }} />}
              </div>
            ))}
          </div>
        )}

        {/* Profile summary bar — shown when profile exists */}
        {hasProfile && profile?.extracted_summary && (
          <div style={{
            padding: '1rem 1.5rem',
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${BORDER}`,
            borderRadius: '12px',
            marginBottom: '2rem',
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'flex-start',
          }}>
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: '13px', color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.7, margin: '0 0 10px',
                fontStyle: 'italic',
              }}>
                &ldquo;{profile.extracted_summary}&rdquo;
              </p>
              {profile?.extracted_skills?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {profile.extracted_skills.slice(0, 10).map((s: string) => (
                    <span key={s} style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                      background: 'rgba(16,185,129,0.08)', color: TEAL,
                      border: '1px solid rgba(16,185,129,0.2)',
                    }}>{s}</span>
                  ))}
                  {profile.extracted_skills.length > 10 && (
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', alignSelf: 'center' }}>
                      +{profile.extracted_skills.length - 10} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Onboarding states */}
        {!hasProfile && (
          <div style={{
            background: '#161b22',
            border: `1px solid ${BORDER}`,
            borderRadius: '16px',
            padding: '2rem',
          }}>
            <p style={{
              fontSize: '11px', fontWeight: 700, color: TEAL,
              letterSpacing: '0.1em', margin: '0 0 6px',
            }}>STEP 01</p>
            <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 6px' }}>
              Upload your documents
            </h2>
            <p style={{
              fontSize: '13px', color: 'rgba(255,255,255,0.4)',
              margin: '0 0 1.5rem', lineHeight: 1.6,
            }}>
              Add your resume and career documents. Career Sage extracts your skills, education, and professional summary automatically.
            </p>
            <VaultUploadInline />
          </div>
        )}

        {hasProfile && !hasTracks && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px',
          }}>
            <div style={{ background: '#161b22', border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '2rem' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 10px' }}>YOUR VAULT</p>
              <VaultUploadInline />
            </div>
            <div style={{ background: '#161b22', border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '2rem' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 6px' }}>STEP 02</p>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 6px' }}>Set up your career track</h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
                Define what you are targeting. Each track gets its own ranked job feed.
              </p>
              <TrackSetupInline userId={user.id} />
            </div>
          </div>
        )}

        {/* Main dashboard tabs */}
        {hasTracks && (
          <DashboardTabs
            userId={user.id}
            tracks={tracks}
            matchedJobs={matchedJobs}
            applicationsTracked={applicationsTracked}
            topMatchScore={topMatchScore}
            generationCount={generationCount}
            profileSkills={profile?.extracted_skills || []}
          />
        )}
      </div>
    </main>
  )
}

function VaultUploadInline() {
  const VaultUpload = require('@/components/profile/VaultUpload').default
  return <VaultUpload />
}

function TrackSetupInline({ userId }: { userId: string }) {
  const TrackSetup = require('@/components/profile/TrackSetup').default
  return <TrackSetup userId={userId} />
}