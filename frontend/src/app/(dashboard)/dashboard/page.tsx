import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const tierRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/profile/${user.id}`,
    { cache: 'no-store' }
  )
  const profile = tierRes.ok ? await tierRes.json() : null

  const tierColors: Record<string, string> = {
    STUDENT_VERIFIED: '#5DCAA5',
    PREMIUM_PRO: '#7F77DD',
    GENERAL_FREE: '#888780',
  }

  const tierLabels: Record<string, string> = {
    STUDENT_VERIFIED: 'Academic tier unlocked',
    PREMIUM_PRO: 'Premium Pro',
    GENERAL_FREE: 'Free tier',
  }

  const tier = profile?.tier_status ?? 'GENERAL_FREE'

  return (
    <main style={{
      minHeight: '100vh', background: '#0a0a0f',
      color: '#fff', padding: '2rem'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 500, margin: '0 0 4px' }}>
              Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 }}>
              {user.email}
            </p>
          </div>
          <div style={{
            padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
            background: 'rgba(255,255,255,0.05)',
            color: tierColors[tier] ?? '#888780',
            border: `0.5px solid ${tierColors[tier] ?? '#888780'}`,
          }}>
            {tierLabels[tier] ?? 'Free tier'}
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: '12px', padding: '3rem',
          textAlign: 'center'
        }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '15px', margin: 0 }}>
            Day 3 — profile vault and job feed coming next
          </p>
        </div>
      </div>
    </main>
  )
}