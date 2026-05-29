'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Tier = 'ANONYMOUS' | 'GENERAL_FREE' | 'STUDENT_VERIFIED' | 'PREMIUM_PRO'

interface TierContextType {
  tier: Tier
  generationCount: number
  maxGenerations: number
  canGenerate: boolean
  isLoading: boolean
}

const TierContext = createContext<TierContextType>({
  tier: 'ANONYMOUS',
  generationCount: 0,
  maxGenerations: 2,
  canGenerate: true,
  isLoading: true,
})

export function TierProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTier] = useState<Tier>('ANONYMOUS')
  const [generationCount, setGenerationCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchTier = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsLoading(false); return }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile/${user.id}`
      )
      if (res.ok) {
        const profile = await res.json()
        setTier(profile.tier_status)
        setGenerationCount(profile.generation_count ?? 0)
      }
      setIsLoading(false)
    }
    fetchTier()
  }, [])

  const maxGenerations = tier === 'GENERAL_FREE' ? 2 : 999
  const canGenerate = tier !== 'GENERAL_FREE' || generationCount < maxGenerations

  return (
    <TierContext.Provider value={{ tier, generationCount, maxGenerations, canGenerate, isLoading }}>
      {children}
    </TierContext.Provider>
  )
}

export const useTier = () => useContext(TierContext)