import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VaultUpload from '@/components/profile/VaultUpload'
import TrackSetup from '@/components/profile/TrackSetup'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const profileRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/profile/${user.id}`,
    { cache: 'no-store' }
  )
  const profile = profileRes.ok ? await profileRes.json() : null

  const tracksRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/tracks/${user.id}`,
    { cache: 'no-store' }
  )
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
    <main style={{
      minHeight: '100vh',
      background: '#0d1117',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* Top bar */}
      <div style={{
        borderBottom: `1px solid ${BORDER}`,
        padding: '0 5%',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(13,17,23,0.9)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <span style={{ fontSize: '16px', fontWeight: 600 }}>Career Sage</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{
            fontSize: '12px', fontWeight: 600,
            padding: '3px 12px', borderRadius: '999px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${tierColors[tier]}`,
            color: tierColors[tier],
          }}>
            {tierLabels[tier]}
          </span>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
            {user.email}
          </span>
          <a href="/" style={{
            fontSize: '13px', color: 'rgba(255,255,255,0.35)',
            textDecoration: 'none',
          }}>← Home</a>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem 5%' }}>

        {/* Welcome heading */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{
            fontSize: '30px', fontWeight: 600,
            margin: '0 0 6px', letterSpacing: '-1px',
          }}>
            Welcome back{profile?.full_name
              ? `, ${profile.full_name.split(' ')[0]}`
              : ''}
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            {!hasProfile
              ? 'Upload your documents to build your profile and get started.'
              : !hasTracks
              ? 'Profile ready. Set up your first career track to unlock your job feed.'
              : 'Your profile and tracks are set up. Job feed and matching coming in Day 4.'}
          </p>
        </div>

        {/* Progress steps */}
        <div style={{
          display: 'flex', gap: '8px', marginBottom: '2.5rem',
          alignItems: 'center',
        }}>
          {[
            { num: '01', label: 'Upload documents', done: hasProfile },
            { num: '02', label: 'Set up career track', done: hasTracks },
            { num: '03', label: 'Discover jobs', done: false },
          ].map((step, i) => (
            <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 14px', borderRadius: '999px',
                background: step.done
                  ? 'rgba(16,185,129,0.1)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${step.done
                  ? 'rgba(16,185,129,0.3)'
                  : BORDER}`,
              }}>
                <span style={{
                  fontSize: '12px', fontWeight: 700,
                  color: step.done ? TEAL : 'rgba(255,255,255,0.3)',
                }}>
                  {step.done ? '✓' : step.num}
                </span>
                <span style={{
                  fontSize: '12px', fontWeight: 500,
                  color: step.done
                    ? 'rgba(255,255,255,0.8)'
                    : 'rgba(255,255,255,0.35)',
                }}>
                  {step.label}
                </span>
              </div>
              {i < 2 && (
                <div style={{
                  width: '24px', height: '1px',
                  background: BORDER,
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Completeness bar — shown after first extraction */}
        {hasProfile && (
          <div style={{
            marginBottom: '2rem',
            padding: '1.25rem 1.5rem',
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: '14px',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginBottom: '10px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>
                Profile completeness
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: TEAL }}>
                {completeness}%
              </span>
            </div>
            <div style={{
              height: '6px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '3px',
              overflow: 'hidden',
              marginBottom: '14px',
            }}>
              <div style={{
                height: '100%',
                width: `${completeness}%`,
                background: TEAL,
                borderRadius: '3px',
                transition: 'width 0.8s ease',
              }} />
            </div>

            {/* Extracted summary */}
            {profile?.extracted_summary && (
              <p style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.65,
                margin: '0 0 12px',
                fontStyle: 'italic',
              }}>
                &ldquo;{profile.extracted_summary}&rdquo;
              </p>
            )}

            {/* Skill tags */}
            {profile?.extracted_skills?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {profile.extracted_skills.slice(0, 14).map((s: string) => (
                  <span key={s} style={{
                    fontSize: '11px',
                    padding: '3px 9px',
                    borderRadius: '4px',
                    background: 'rgba(16,185,129,0.08)',
                    color: TEAL,
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}>
                    {s}
                  </span>
                ))}
                {profile.extracted_skills.length > 14 && (
                  <span style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.25)',
                    alignSelf: 'center',
                  }}>
                    +{profile.extracted_skills.length - 14} more
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main content grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: hasProfile && !hasTracks ? '1fr 1fr' : '1fr',
          gap: '20px',
        }}>

          {/* Step 01 — Vault upload */}
          {!hasProfile && (
            <div style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: '16px',
              padding: '2rem',
            }}>
              <p style={{
                fontSize: '11px', fontWeight: 700, color: TEAL,
                letterSpacing: '0.1em', margin: '0 0 6px',
              }}>
                STEP 01
              </p>
              <h2 style={{
                fontSize: '20px', fontWeight: 600,
                margin: '0 0 6px', letterSpacing: '-0.5px',
              }}>
                Upload your documents
              </h2>
              <p style={{
                fontSize: '13px', color: 'rgba(255,255,255,0.4)',
                margin: '0 0 1.5rem', lineHeight: 1.6,
              }}>
                Add your resume, project decks, or any relevant documents.
                Claude will extract your skills, education, and professional summary in seconds.
              </p>
              <VaultUpload />
            </div>
          )}

          {/* Profile exists — allow re-upload */}
          {hasProfile && (
            <div style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: '16px',
              padding: '2rem',
            }}>
              <p style={{
                fontSize: '11px', fontWeight: 700, color: TEAL,
                letterSpacing: '0.1em', margin: '0 0 6px',
              }}>
                YOUR VAULT
              </p>
              <h2 style={{
                fontSize: '20px', fontWeight: 600,
                margin: '0 0 6px', letterSpacing: '-0.5px',
              }}>
                Add more documents
              </h2>
              <p style={{
                fontSize: '13px', color: 'rgba(255,255,255,0.4)',
                margin: '0 0 1.5rem', lineHeight: 1.6,
              }}>
                Upload additional documents to improve your profile.
                Re-extraction updates your skills and summary automatically.
              </p>
              <VaultUpload />
            </div>
          )}

          {/* Step 02 — Track setup (only when profile done, no tracks yet) */}
          {hasProfile && !hasTracks && (
            <div style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: '16px',
              padding: '2rem',
            }}>
              <p style={{
                fontSize: '11px', fontWeight: 700, color: TEAL,
                letterSpacing: '0.1em', margin: '0 0 6px',
              }}>
                STEP 02
              </p>
              <h2 style={{
                fontSize: '20px', fontWeight: 600,
                margin: '0 0 6px', letterSpacing: '-0.5px',
              }}>
                Set up your first career track
              </h2>
              <p style={{
                fontSize: '13px', color: 'rgba(255,255,255,0.4)',
                margin: '0 0 1.5rem', lineHeight: 1.6,
              }}>
                A career track defines what you are targeting.
                Create separate tracks for Analytics and PM — each gets its own job feed and resume style.
              </p>
              <TrackSetup userId={user.id} />
            </div>
          )}

          {/* Tracks exist — show them */}
          {hasTracks && (
            <div style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: '16px',
              padding: '2rem',
            }}>
              <p style={{
                fontSize: '11px', fontWeight: 700, color: TEAL,
                letterSpacing: '0.1em', margin: '0 0 1rem',
              }}>
                YOUR CAREER TRACKS
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
                {tracks.map((track: {
                  track_id: string
                  track_name: string
                  target_seniority?: string
                  target_roles?: string[]
                  track_color: string
                  salary_min_lpa?: number
                  salary_target_lpa?: number
                }) => {
                  const colorMap: Record<string, string> = {
                    teal: '#10B981', purple: '#7F77DD',
                    blue: '#3B82F6', amber: '#F59E0B', coral: '#F97316',
                  }
                  const hex = colorMap[track.track_color] ?? '#10B981'
                  return (
                    <div key={track.track_id} style={{
                      padding: '1rem 1.25rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid rgba(255,255,255,0.08)`,
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '10px', height: '10px',
                          borderRadius: '50%', background: hex,
                          flexShrink: 0,
                        }} />
                        <div>
                          <p style={{
                            fontSize: '14px', fontWeight: 600,
                            color: '#fff', margin: '0 0 3px',
                          }}>
                            {track.track_name}
                          </p>
                          <p style={{
                            fontSize: '12px',
                            color: 'rgba(255,255,255,0.35)',
                            margin: 0,
                          }}>
                            {track.target_seniority}
                            {track.target_roles && track.target_roles.length > 0
                              ? ` · ${track.target_roles.slice(0, 2).join(', ')}`
                              : ''}
                            {track.salary_target_lpa
                              ? ` · ₹${track.salary_target_lpa}L target`
                              : ''}
                          </p>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '11px', padding: '3px 10px',
                        borderRadius: '999px',
                        background: `${hex}18`,
                        color: hex,
                        border: `1px solid ${hex}40`,
                        flexShrink: 0,
                      }}>
                        Active
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Add more tracks CTA for Pro users */}
              <div style={{
                padding: '1rem',
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${BORDER}`,
                borderRadius: '10px',
                textAlign: 'center',
              }}>
                <p style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.3)',
                  margin: '0 0 4px',
                }}>
                  Job feed and AI matching arrives in Day 4 →
                </p>
                <p style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.2)',
                  margin: 0,
                }}>
                  Your tracks are ready. Roles will be ranked against each track separately.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}