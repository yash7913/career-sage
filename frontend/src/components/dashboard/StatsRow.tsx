'use client'
import { useState, useEffect, useRef } from 'react'

const CARD = '#161b22'
const BORDER = 'rgba(255,255,255,0.07)'

function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setStarted(true)
    }, { threshold: 0.5 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    let start = 0
    const duration = 1200
    const step = 16
    const increment = target / (duration / step)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, step)
    return () => clearInterval(timer)
  }, [started, target])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

interface StatsRowProps {
  matchedJobs: number
  applicationsTracked: number
  topMatchScore: number
  generationCount: number
}

const STATS = [
  { label: 'Roles matched', sub: 'Across your active tracks', color: '#10B981', key: 'matchedJobs' },
  { label: 'Applications tracked', sub: 'In your pipeline', color: '#3B82F6', key: 'applicationsTracked' },
  { label: 'Top match', sub: 'Your best-fit role today', color: '#F59E0B', key: 'topMatchScore' },
  { label: 'Resumes generated', sub: 'Tailored to specific roles', color: '#7F77DD', key: 'generationCount' },
]

export default function StatsRow({ matchedJobs, applicationsTracked, topMatchScore, generationCount }: StatsRowProps) {
  const values: Record<string, number> = { matchedJobs, applicationsTracked, topMatchScore, generationCount }

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{
        borderRadius: '16px', padding: '1px',
        background: 'linear-gradient(135deg, rgba(16,185,129,0.6) 0%, rgba(6,182,212,0.3) 40%, rgba(16,185,129,0.4) 100%)',
      }}>
        <div style={{
          background: CARD, borderRadius: '15px', overflow: 'hidden',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        }}>
          {STATS.map((stat, i) => (
            <div key={stat.key} style={{
              padding: '1.5rem 1.25rem', textAlign: 'left',
              borderRight: i < STATS.length - 1 ? `1px solid ${BORDER}` : 'none',
            }}>
              <p style={{
                fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.75)',
                margin: '0 0 6px',
              }}>
                {stat.label}
              </p>
              <p style={{
                fontSize: '34px', fontWeight: 700, margin: '0 0 4px',
                letterSpacing: '-1.5px', color: stat.color,
              }}>
                {stat.key === 'topMatchScore'
                  ? values[stat.key] > 0 ? <CountUp target={values[stat.key]} suffix="%" /> : '—'
                  : <CountUp target={values[stat.key]} />
                }
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                {stat.key === 'topMatchScore' && values[stat.key] > 0
                  ? values[stat.key] >= 55 ? 'Strong match' : values[stat.key] >= 42 ? 'Good match' : 'Worth exploring'
                  : stat.sub
                }
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}