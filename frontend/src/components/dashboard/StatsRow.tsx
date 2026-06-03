'use client'

const TEAL = '#10B981'

interface StatsRowProps {
  matchedJobs: number
  applicationsTracked: number
  topMatchScore: number
  generationCount: number
}

export default function StatsRow({ matchedJobs, applicationsTracked, topMatchScore, generationCount }: StatsRowProps) {
  const stats = [
    { label: 'Roles matched', value: matchedJobs, suffix: '', color: TEAL, icon: '⚡' },
    { label: 'Applications tracked', value: applicationsTracked, suffix: '', color: '#3B82F6', icon: '📋' },
    { label: 'Top match score', value: topMatchScore, suffix: '%', color: '#F59E0B', icon: '🎯' },
    { label: 'Resumes generated', value: generationCount, suffix: '', color: '#7F77DD', icon: '📄' },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px',
      marginBottom: '2rem',
    }}>
      {stats.map(stat => (
        <div key={stat.label} style={{
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
            margin: '0 0 8px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {stat.icon} {stat.label}
          </p>
          <p style={{
            fontSize: '32px', fontWeight: 700,
            color: stat.color,
            margin: 0,
            letterSpacing: '-1px',
            lineHeight: 1,
          }}>
            {stat.value}{stat.suffix}
          </p>
        </div>
      ))}
    </div>
  )
}