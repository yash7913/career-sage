import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Notify backend to create profile and assign tier
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name ?? '',
          }),
        })
      } catch (e) {
        console.error('Profile creation failed:', e)
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}