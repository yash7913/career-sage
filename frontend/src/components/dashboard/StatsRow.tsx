'use client'

interface StatsRowProps {
  matchedJobs: number
  applicationsTracked: number
  topMatchScore: number
  generationCount: number
}

const STATS = [
  { label: 'Roles matched', suffix: '', color: '#10B981', icon: '⚡', key: 'matchedJobs' },
  { label: 'Applications tracked', suffix: '', color: '#3B82F6', icon: '📋', key: 'applicationsTracked' },
  { label: 'Top match score', suffix: '%', color: '#F59E0B', icon: '🎯', key: 'topMatchScore' },
  { label: 'Resumes generated', suffix: '', color: '#7F77DD', icon: '📄', key: 'generationCount' },
]

export default function StatsRow({ matchedJobs, applicationsTracked, topMatchScore, generationCount }: StatsRowProps) {
  const values: Record<string, number> = { matchedJobs, applicationsTracked, topMatchScore, generationCount }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px',
      marginBottom: '2rem',
    }}>
      {STATS.map(stat => (
        <div key={stat.key} style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: '2px',
            background: `linear-gradient(90deg, ${stat.color}, transparent)`,
          }} />
          <p style={{
            fontSize: '11px', fontWeight: 600,
            color: 'rgba(255,255,255,0.35)',
            margin: '0 0 10px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {stat.icon} {stat.label}
          </p>
          <p className="cs-shimmer" style={{
            fontSize: '36px', fontWeight: 800,
            margin: 0, letterSpacing: '-1.5px',
            lineHeight: 1,
          }}>
            {values[stat.key]}{stat.suffix}
          </p>
        </div>
      ))}
    </div>
  )
}