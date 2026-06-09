import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardTabs from '@/components/dashboard/DashboardTabs'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [profileRes, tracksRes, pipelineRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/${user.id}`, { cache: 'no-store' }),
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tracks/${user.id}`, { cache: 'no-store' }),
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tracker/${user.id}`, { cache: 'no-store' }),
  ])

  const profile = profileRes.ok ? await profileRes.json() : null
  const tracks = tracksRes.ok ? await tracksRes.json() : []
  const pipeline = pipelineRes.ok ? await pipelineRes.json() : []

  const completeness = profile?.profile_completeness_score ?? 0
  const hasProfile = completeness > 0
  const hasTracks = tracks.length > 0

  const tier = profile?.tier_status ?? 'GENERAL_FREE'
  const cohort = profile?.cohort ?? null

  const fullName = profile?.full_name || user.email?.split('@')[0] || 'there'
  const firstName = fullName.split(' ')[0]

  const applicationsTracked = Array.isArray(pipeline) ? pipeline.length : 0
  const generationCount = profile?.generation_count ?? 0
  const impactPattern = profile?.impact_pattern ?? ''
  const salaryTargetLpa = profile?.salary_target_lpa ?? undefined

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
    <main style={{ minHeight: '100vh', background: '#0d1117', color: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <DashboardTabs
        userId={user.id}
        userEmail={user.email ?? ''}
        userName={firstName}
        cohort={cohort}
        tier={tier}
        tracks={tracks}
        matchedJobs={matchedJobs}
        applicationsTracked={applicationsTracked}
        topMatchScore={topMatchScore}
        generationCount={generationCount}
        profileSkills={profile?.extracted_skills || []}
        hasProfile={hasProfile}
        hasTracks={hasTracks}
	impactPattern={impactPattern}
        salaryTargetLpa={salaryTargetLpa}
      />
    </main>
  )
}