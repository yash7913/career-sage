'use client'
import { useState, useMemo } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface Job {
  ranking_id: string
  match_percentage_score: number
  job_title: string
  company_name: string
  location: string
  skills_needed: string[]
  identified_skill_gaps: string[]
  source_link: string
  job_description: string
  posted_at?: string | null
  is_starred: boolean
  job_id: string
  estimated_salary_min: number | null
  estimated_salary_max: number | null
  estimated_interview_rounds: number | null
  interview_breakdown_notes: string | null
}

interface Filters {
  search: string
  minMatch: number
  workMode: string[]
  seniority: string[]
  skills: string[]
  starred: boolean
  locationSearch: string
}

const SENIORITY_KEYWORDS: Record<string, string[]> = {
  'Intern': ['intern', 'internship'],
  'Junior': ['junior', 'associate', 'entry'],
  'Mid': ['mid', 'analyst', 'engineer ii'],
  'Senior': ['senior', 'sr.', 'lead'],
  'Staff / Principal': ['staff', 'principal', 'architect'],
  'Director+': ['director', 'vp', 'head of', 'chief'],
}

const WORK_MODE_KEYWORDS: Record<string, string[]> = {
  'Remote': ['remote', 'work from home', 'wfh'],
  'Hybrid': ['hybrid'],
  'In-office': ['in-office', 'on-site', 'onsite', 'in office'],
}

function detectSeniority(title: string): string {
  const lower = title.toLowerCase()
  for (const [level, keywords] of Object.entries(SENIORITY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return level
  }
  return 'Mid'
}

function detectWorkMode(job: Job): string {
  const text = `${job.location} ${job.job_description}`.toLowerCase()
  for (const [mode, keywords] of Object.entries(WORK_MODE_KEYWORDS)) {
    if (keywords.some(k => text.includes(k))) return mode
  }
  return 'In-office'
}

export function useJobFilters(jobs: Job[]) {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    minMatch: 0,
    workMode: [],
    seniority: [],
    skills: [],
    starred: false,
    locationSearch: '',
  })

  const allSkills = useMemo(() => {
    const skillSet = new Set<string>()
    jobs.forEach(j => j.skills_needed?.forEach(s => {
      if (s.length < 30 && !s.includes('\n') && /^[A-Za-z]/.test(s)) {
        skillSet.add(s)
      }
    }))
    return Array.from(skillSet).sort()
  }, [jobs])

  const allLocations = useMemo(() => {
    const cities = new Set<string>()
    const countries = new Set<string>()
    jobs.forEach(j => {
      if (!j.location) return
      const parts = j.location.split(',').map(p => p.trim())
      if (parts.length >= 1) cities.add(parts[0])
      if (parts.length >= 3) countries.add(parts[parts.length - 1])
      else if (parts.length === 2) countries.add(parts[1])
    })
    return {
      cities: Array.from(cities).filter(Boolean).sort(),
      countries: Array.from(countries).filter(Boolean).sort(),
    }
  }, [jobs])

  const filtered = useMemo(() => {
    return jobs.filter(job => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!job.job_title.toLowerCase().includes(q) &&
            !job.company_name.toLowerCase().includes(q) &&
            !job.job_description?.toLowerCase().includes(q)) return false
      }
      if (filters.minMatch > 0 && job.match_percentage_score < filters.minMatch) return false
      if (filters.starred && !job.is_starred) return false
      if (filters.workMode.length > 0) {
        const mode = detectWorkMode(job)
        if (!filters.workMode.includes(mode)) return false
      }
      if (filters.seniority.length > 0) {
        const level = detectSeniority(job.job_title)
        if (!filters.seniority.includes(level)) return false
      }
      if (filters.skills.length > 0) {
        const jobSkills = new Set(job.skills_needed?.map(s => s.toLowerCase()))
        if (!filters.skills.some(s => jobSkills.has(s.toLowerCase()))) return false
      }
      if (filters.locationSearch) {
        const locQ = filters.locationSearch.toLowerCase()
        if (!job.location?.toLowerCase().includes(locQ)) return false
      }
      return true
    })
  }, [jobs, filters])

  return { filters, setFilters, filtered, allSkills, allLocations }
}

export default function JobFilters({
  filters,
  setFilters,
  totalJobs,
  filteredCount,
  allSkills,
  allLocations,
}: {
  filters: Filters
  setFilters: (f: Filters) => void
  totalJobs: number
  filteredCount: number
  allSkills: string[]
  allLocations: { cities: string[]; countries: string[] }
}) {
  const [showSkillPicker, setShowSkillPicker] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [skillSearch, setSkillSearch] = useState('')
  const [locationSearch, setLocationSearch] = useState('')

  const activeFilterCount = [
    filters.search,
    filters.minMatch > 0,
    filters.workMode.length > 0,
    filters.seniority.length > 0,
    filters.skills.length > 0,
    filters.starred,
    filters.locationSearch,
  ].filter(Boolean).length

  const clearAll = () => setFilters({
    search: '', minMatch: 0, workMode: [], seniority: [],
    skills: [], starred: false, locationSearch: '',
  })

  const toggleArray = (key: 'workMode' | 'seniority', value: string) => {
    const current = filters[key]
    setFilters({
      ...filters,
      [key]: current.includes(value) ? current.filter(v => v !== value) : [...current, value],
    })
  }

  const toggleSkill = (skill: string) => {
    const current = filters.skills
    setFilters({
      ...filters,
      skills: current.includes(skill) ? current.filter(s => s !== skill) : [...current, skill],
    })
  }

  const filteredSkills = allSkills.filter(s =>
    s.toLowerCase().includes(skillSearch.toLowerCase())
  )

  const filteredLocations = useMemo(() => {
    const q = locationSearch.toLowerCase()
    const cities = allLocations.cities.filter(c => c.toLowerCase().includes(q)).slice(0, 20)
    const countries = allLocations.countries.filter(c => c.toLowerCase().includes(q)).slice(0, 10)
    return { cities, countries }
  }, [allLocations, locationSearch])

  return (
    <div style={{ marginBottom: '1rem' }}>
      {/* Row 1 — Search + match + starred */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <input
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search roles, companies..."
            style={{
              width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
              color: '#fff', fontSize: '13px', boxSizing: 'border-box', outline: 'none',
            }}
          />
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>🔍</span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${filters.minMatch > 0 ? 'rgba(16,185,129,0.3)' : BORDER}`,
          borderRadius: '8px',
        }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>Min match</span>
          <input
            type="range" min={0} max={90} step={10}
            value={filters.minMatch}
            onChange={e => setFilters({ ...filters, minMatch: parseInt(e.target.value) })}
            style={{ width: '80px', accentColor: TEAL }}
          />
          <span style={{ fontSize: '12px', color: TEAL, fontWeight: 600, minWidth: '30px' }}>
            {filters.minMatch > 0 ? `${filters.minMatch}%+` : 'Any'}
          </span>
        </div>

        <button
          onClick={() => setFilters({ ...filters, starred: !filters.starred })}
          style={{
            padding: '8px 14px', borderRadius: '8px',
            background: filters.starred ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${filters.starred ? 'rgba(245,158,11,0.4)' : BORDER}`,
            color: filters.starred ? '#F59E0B' : 'rgba(255,255,255,0.4)',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}
        >★ Starred</button>
      </div>

      {/* Row 2 — Filter chips */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' }}>
        {/* Work mode */}
        {['Remote', 'Hybrid', 'In-office'].map(mode => (
          <button key={mode} onClick={() => toggleArray('workMode', mode)} style={{
            padding: '5px 12px', borderRadius: '999px',
            background: filters.workMode.includes(mode) ? 'rgba(16,185,129,0.1)' : 'transparent',
            border: `1px solid ${filters.workMode.includes(mode) ? 'rgba(16,185,129,0.35)' : BORDER}`,
            color: filters.workMode.includes(mode) ? TEAL : 'rgba(255,255,255,0.4)',
            fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
          }}>{mode}</button>
        ))}

        <div style={{ width: '1px', background: BORDER, margin: '0 2px', height: '20px' }} />

        {/* Seniority */}
        {['Junior', 'Mid', 'Senior', 'Staff / Principal', 'Director+'].map(level => (
          <button key={level} onClick={() => toggleArray('seniority', level)} style={{
            padding: '5px 12px', borderRadius: '999px',
            background: filters.seniority.includes(level) ? 'rgba(59,130,246,0.1)' : 'transparent',
            border: `1px solid ${filters.seniority.includes(level) ? 'rgba(59,130,246,0.35)' : BORDER}`,
            color: filters.seniority.includes(level) ? '#3B82F6' : 'rgba(255,255,255,0.4)',
            fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
          }}>{level}</button>
        ))}

        <div style={{ width: '1px', background: BORDER, margin: '0 2px', height: '20px' }} />

        {/* Location picker */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowLocationPicker(!showLocationPicker); setShowSkillPicker(false) }}
            style={{
              padding: '5px 12px', borderRadius: '999px',
              background: filters.locationSearch ? 'rgba(236,72,153,0.1)' : 'transparent',
              border: `1px solid ${filters.locationSearch ? 'rgba(236,72,153,0.35)' : BORDER}`,
              color: filters.locationSearch ? '#EC4899' : 'rgba(255,255,255,0.4)',
              fontSize: '12px', cursor: 'pointer',
            }}
          >
            📍 {filters.locationSearch || 'Location ▾'}
          </button>

          {showLocationPicker && (
            <div style={{
              position: 'absolute', top: '34px', left: 0,
              background: CARD, border: `1px solid ${BORDER}`,
              borderRadius: '12px', padding: '10px',
              width: '280px', zIndex: 100,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              <input
                value={locationSearch}
                onChange={e => setLocationSearch(e.target.value)}
                placeholder="Search city or country..."
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: '7px', marginBottom: '8px',
                  background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
                  color: '#fff', fontSize: '12px', boxSizing: 'border-box', outline: 'none',
                }}
              />
              {filters.locationSearch && (
                <button
                  onClick={() => { setFilters({ ...filters, locationSearch: '' }); setShowLocationPicker(false) }}
                  style={{
                    width: '100%', padding: '6px', borderRadius: '6px', marginBottom: '6px',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    color: 'rgba(239,68,68,0.7)', fontSize: '11px', cursor: 'pointer',
                  }}
                >
                  ✕ Clear location filter
                </button>
              )}
              {filteredLocations.cities.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', margin: '0 0 5px', letterSpacing: '0.06em' }}>CITIES</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {filteredLocations.cities.map(city => (
                      <button key={city} onClick={() => { setFilters({ ...filters, locationSearch: city }); setShowLocationPicker(false) }} style={{
                        padding: '3px 9px', borderRadius: '5px',
                        background: filters.locationSearch === city ? 'rgba(236,72,153,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${filters.locationSearch === city ? 'rgba(236,72,153,0.3)' : BORDER}`,
                        color: filters.locationSearch === city ? '#EC4899' : 'rgba(255,255,255,0.5)',
                        fontSize: '11px', cursor: 'pointer',
                      }}>{city}</button>
                    ))}
                  </div>
                </div>
              )}
              {filteredLocations.countries.length > 0 && (
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', margin: '0 0 5px', letterSpacing: '0.06em' }}>COUNTRIES</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {filteredLocations.countries.map(country => (
                      <button key={country} onClick={() => { setFilters({ ...filters, locationSearch: country }); setShowLocationPicker(false) }} style={{
                        padding: '3px 9px', borderRadius: '5px',
                        background: filters.locationSearch === country ? 'rgba(236,72,153,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${filters.locationSearch === country ? 'rgba(236,72,153,0.3)' : BORDER}`,
                        color: filters.locationSearch === country ? '#EC4899' : 'rgba(255,255,255,0.5)',
                        fontSize: '11px', cursor: 'pointer',
                      }}>{country}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Skills picker */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowSkillPicker(!showSkillPicker); setShowLocationPicker(false) }}
            style={{
              padding: '5px 12px', borderRadius: '999px',
              background: filters.skills.length > 0 ? 'rgba(127,119,221,0.1)' : 'transparent',
              border: `1px solid ${filters.skills.length > 0 ? 'rgba(127,119,221,0.35)' : BORDER}`,
              color: filters.skills.length > 0 ? '#7F77DD' : 'rgba(255,255,255,0.4)',
              fontSize: '12px', cursor: 'pointer',
            }}
          >
            Skills {filters.skills.length > 0 ? `(${filters.skills.length})` : '▾'}
          </button>

          {showSkillPicker && (
            <div style={{
              position: 'absolute', top: '34px', left: 0,
              background: CARD, border: `1px solid ${BORDER}`,
              borderRadius: '12px', padding: '10px',
              width: '260px', zIndex: 100,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              <input
                value={skillSearch}
                onChange={e => setSkillSearch(e.target.value)}
                placeholder="Search skills..."
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: '7px', marginBottom: '8px',
                  background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
                  color: '#fff', fontSize: '12px', boxSizing: 'border-box', outline: 'none',
                }}
              />
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {filteredSkills.slice(0, 50).map(skill => (
                  <button key={skill} onClick={() => toggleSkill(skill)} style={{
                    padding: '3px 9px', borderRadius: '5px',
                    background: filters.skills.includes(skill) ? 'rgba(127,119,221,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${filters.skills.includes(skill) ? 'rgba(127,119,221,0.3)' : BORDER}`,
                    color: filters.skills.includes(skill) ? '#7F77DD' : 'rgba(255,255,255,0.5)',
                    fontSize: '11px', cursor: 'pointer',
                  }}>{skill}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results count + active filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          {filteredCount === totalJobs ? `${totalJobs} roles` : `${filteredCount} of ${totalJobs} roles`}
          {activeFilterCount > 0 && (
            <button onClick={clearAll} style={{
              background: 'none', border: 'none', color: 'rgba(239,68,68,0.6)',
              fontSize: '12px', cursor: 'pointer', marginLeft: '10px',
            }}>Clear filters ✕</button>
          )}
        </p>

        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {filters.locationSearch && (
            <span style={{
              fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
              background: 'rgba(236,72,153,0.1)', color: '#EC4899',
              border: '1px solid rgba(236,72,153,0.2)',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              📍 {filters.locationSearch}
              <button onClick={() => setFilters({ ...filters, locationSearch: '' })} style={{ background: 'none', border: 'none', color: '#EC4899', cursor: 'pointer', padding: 0, fontSize: '10px' }}>✕</button>
            </span>
          )}
          {filters.skills.map(skill => (
            <span key={skill} style={{
              fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
              background: 'rgba(127,119,221,0.1)', color: '#7F77DD',
              border: '1px solid rgba(127,119,221,0.2)',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              {skill}
              <button onClick={() => toggleSkill(skill)} style={{ background: 'none', border: 'none', color: '#7F77DD', cursor: 'pointer', padding: 0, fontSize: '10px' }}>✕</button>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
