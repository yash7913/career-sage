'use client'
import { useState, useEffect } from 'react'
import VaultUpload from '@/components/profile/VaultUpload'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

const CURRENCIES = [
  { value: 'INR', label: '₹ INR — Indian Rupee',      unit: 'LPA' },
  { value: 'USD', label: '$ USD — US Dollar',          unit: 'K/year' },
  { value: 'GBP', label: '£ GBP — British Pound',      unit: 'K/year' },
  { value: 'SGD', label: 'S$ SGD — Singapore Dollar',  unit: 'K/year' },
  { value: 'CAD', label: 'C$ CAD — Canadian Dollar',   unit: 'K/year' },
  { value: 'AUD', label: 'A$ AUD — Australian Dollar', unit: 'K/year' },
  { value: 'AED', label: 'AED — UAE Dirham',           unit: 'K/year' },
  { value: 'EUR', label: '€ EUR — Euro',               unit: 'K/year' },
]

const MARKETS = [
  { value: 'India',     label: '🇮🇳 India' },
  { value: 'US',        label: '🇺🇸 United States' },
  { value: 'UK',        label: '🇬🇧 United Kingdom' },
  { value: 'Singapore', label: '🇸🇬 Singapore' },
  { value: 'Canada',    label: '🇨🇦 Canada' },
  { value: 'Australia', label: '🇦🇺 Australia' },
  { value: 'UAE',       label: '🇦🇪 UAE' },
]

const WORK_MODES = [
  { value: 'remote',  label: '🌐 Remote' },
  { value: 'hybrid',  label: '🏠 Hybrid' },
  { value: 'onsite',  label: '🏢 On-site' },
]

const COMPANY_STAGES = [
  { value: 'seed',       label: '🌱 Seed / Early' },
  { value: 'growth',     label: '📈 Series B/C' },
  { value: 'late',       label: '🦄 Late Stage' },
  { value: 'enterprise', label: '🏢 Enterprise' },
]

const EQUITY_RATES: Record<string, number> = {
  USD: 1, INR: 83.5, GBP: 0.79, SGD: 1.35,
  CAD: 1.37, AUD: 1.54, AED: 3.67, EUR: 0.93,
}

const LEVEL_OPTIONS = [
  'L3', 'L4', 'L5', 'L6', 'L7', 'L8',
  'Associate', 'Junior', 'Mid-level', 'Senior', 'Staff', 'Principal',
  'Lead', 'Manager', 'Senior Manager', 'Director', 'VP', 'C-Suite',
]

const TOTAL_STEPS = 8

interface OnboardingFlowProps {
  userId: string
  userName: string
  onComplete: () => void
}

export default function OnboardingFlow({ userId, userName, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1 — Opportunity status
  const [searchStatus, setSearchStatus] = useState('ACTIVE')

  // Step 3 — Basic profile
  const [fullName, setFullName] = useState(userName || '')
  const [location, setLocation] = useState('')
  const [currentRole, setCurrentRole] = useState('')

  // Step 4 — Career status
  const [careerStatus, setCareerStatus] = useState('')

  // Step 5 — Company + level
  const [currentCompany, setCurrentCompany] = useState('')
  const [currentLevel, setCurrentLevel] = useState('')

  // Step 6 — Compensation
  const [compCurrency, setCompCurrency] = useState('INR')
  const [currentBase, setCurrentBase] = useState('')
  const [currentEquityUsd, setCurrentEquityUsd] = useState('')
  const [currentVariablePct, setCurrentVariablePct] = useState('')

  // Step 7 — Preferences
  const [targetMarkets, setTargetMarkets] = useState<string[]>(['India'])
  const [workMode, setWorkMode] = useState('hybrid')
  const [companyStage, setCompanyStage] = useState('any')
  const [salaryTarget, setSalaryTarget] = useState('')

  const selectedCurrency = CURRENCIES.find(c => c.value === compCurrency) || CURRENCIES[0]
  const currencySymbol   = selectedCurrency.label.split(' ')[0]
  const currencyUnit     = selectedCurrency.unit

  const totalComp = (() => {
    const base      = parseFloat(currentBase) || 0
    const equityUsd = parseFloat(currentEquityUsd) || 0
    const variable  = parseFloat(currentVariablePct) || 0
    if (!base) return null
    const rate         = EQUITY_RATES[compCurrency] || 1
    const equityLocal  = compCurrency === 'INR'
      ? parseFloat((equityUsd / 100000 * rate).toFixed(2))
      : parseFloat((equityUsd / 1000).toFixed(2))
    const variableLocal = parseFloat((base * variable / 100).toFixed(2))
    return { base, equityLocal, variableLocal, total: parseFloat((base + equityLocal + variableLocal).toFixed(2)) }
  })()

  const toggleMarket = (market: string) => {
    setTargetMarkets(prev =>
      prev.includes(market) ? prev.filter(m => m !== market) : [...prev, market]
    )
  }

  const saveStep = async (stepData: Record<string, unknown>) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/contact`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...stepData }),
    })
  }

  const savePreferences = async (prefData: Record<string, unknown>) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...prefData }),
    })
  }

  const handleNext = async () => {
    setSaving(true)
    try {
      if (step === 1) {
        await saveStep({ search_status: searchStatus })
      } else if (step === 3) {
        await saveStep({ full_name: fullName, location })
      } else if (step === 4) {
        await saveStep({ career_status: careerStatus })
      } else if (step === 5) {
        await saveStep({ current_company: currentCompany, current_level: currentLevel })
      } else if (step === 6) {
        await savePreferences({
          current_base_lpa:     currentBase ? parseFloat(currentBase) : null,
          current_equity_usd:   currentEquityUsd ? parseFloat(currentEquityUsd) : null,
          current_variable_pct: currentVariablePct ? parseFloat(currentVariablePct) : null,
          current_comp_currency: compCurrency,
          preferred_currency:   compCurrency,
        })
      } else if (step === 7) {
        await savePreferences({
          target_market:          targetMarkets,
          preferred_work_mode:    workMode,
          preferred_company_stage: companyStage === 'any' ? null : companyStage,
          salary_target_lpa:      salaryTarget ? parseInt(salaryTarget) : null,
        })
      } else if (step === 8) {
        await saveStep({ onboarding_complete: true })
        onComplete()
        return
      }
      setStep(s => s + 1)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const canProceed = () => {
    if (step === 1) return !!searchStatus
    if (step === 3) return !!fullName.trim()
    if (step === 4) return !!careerStatus
    if (step === 5) return !!currentCompany.trim()
    return true
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
    color: '#fff', fontSize: '14px', outline: 'none',
    fontFamily: 'system-ui', boxSizing: 'border-box' as const,
  }

  const selectStyle = {
    ...inputStyle, cursor: 'pointer', colorScheme: 'dark' as const,
    background: '#1c2128',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0d1117',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', padding: '3rem 1rem',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2.5rem' }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
        }}>⚡</div>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Career Sage</span>
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: '540px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Step {step} of {TOTAL_STEPS}</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)' }}>
          <div style={{
            height: '4px', borderRadius: '999px', background: TEAL,
            width: `${(step / TOTAL_STEPS) * 100}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Step content */}
      <div style={{
        width: '100%', maxWidth: '540px',
        background: CARD, border: `1px solid ${BORDER}`,
        borderRadius: '20px', padding: '2rem',
      }}>

        {/* ── Step 1: Opportunity status ── */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 8px' }}>LET'S GET STARTED</p>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Are you open to new opportunities?</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: '0 0 1.5rem' }}>This helps Career Sage prioritise what to show you.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {[
                { key: 'ACTIVE',  icon: '🔍', label: 'Actively looking' },
                { key: 'OPEN',    icon: '👋', label: 'Open to the right opportunity' },
                { key: 'PAUSED',  icon: '😌', label: "Not looking right now" },
              ].map(opt => (
                <div key={opt.key} onClick={() => setSearchStatus(opt.key)} style={{
                  padding: '1.25rem 1rem', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                  background: searchStatus === opt.key ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1.5px solid ${searchStatus === opt.key ? TEAL : BORDER}`,
                  transition: 'all 0.15s',
                }}>
                  <p style={{ fontSize: '24px', margin: '0 0 8px' }}>{opt.icon}</p>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: searchStatus === opt.key ? TEAL : 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.4 }}>{opt.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Resume upload ── */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 8px' }}>STEP 2 OF 8</p>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Upload your documents</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: '0 0 1.5rem' }}>
              Career Sage extracts your skills, experience, and summary automatically. You can also import your LinkedIn PDF.
            </p>
            <VaultUpload onExtractionComplete={() => setStep(3)} />
            <button
              onClick={() => setStep(3)}
              style={{
                marginTop: '12px', width: '100%', padding: '10px',
                background: 'transparent', border: `1px solid ${BORDER}`,
                borderRadius: '10px', color: 'rgba(255,255,255,0.3)',
                fontSize: '13px', cursor: 'pointer',
              }}
            >
              Skip for now →
            </button>
          </div>
        )}

        {/* ── Step 3: Basic profile ── */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 8px' }}>YOUR PROFILE</p>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Tell us about yourself</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: '0 0 1.5rem' }}>This appears in your generated resumes automatically.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>FULL NAME</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Yashwanth P" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>LOCATION</label>
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Hyderabad, India" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>CURRENT OR MOST RECENT ROLE</label>
                <input value={currentRole} onChange={e => setCurrentRole(e.target.value)} placeholder="Senior Product Manager" style={inputStyle} />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Career status ── */}
        {step === 4 && (
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 8px' }}>CAREER STATUS</p>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Where are you in your career?</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: '0 0 1.5rem' }}>Helps Career Sage personalise your experience.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {[
                { key: 'employed',    icon: '💼', label: 'Employed' },
                { key: 'student',     icon: '🎓', label: 'Student' },
                { key: 'unemployed',  icon: '🔎', label: 'Between roles' },
              ].map(opt => (
                <div key={opt.key} onClick={() => setCareerStatus(opt.key)} style={{
                  padding: '1.25rem 1rem', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                  background: careerStatus === opt.key ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1.5px solid ${careerStatus === opt.key ? TEAL : BORDER}`,
                  transition: 'all 0.15s',
                }}>
                  <p style={{ fontSize: '24px', margin: '0 0 8px' }}>{opt.icon}</p>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: careerStatus === opt.key ? TEAL : 'rgba(255,255,255,0.6)', margin: 0 }}>{opt.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 5: Company + level ── */}
        {step === 5 && (
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 8px' }}>COMPANY & LEVEL</p>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Where do you work?</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: '0 0 1.5rem' }}>Used to calibrate your compensation and career benchmarks.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>CURRENT COMPANY</label>
                <input value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} placeholder="e.g. Salesforce, Google, Stripe" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>YOUR LEVEL</label>
                <select value={currentLevel} onChange={e => setCurrentLevel(e.target.value)} style={selectStyle}>
                  <option value="">Select your level</option>
                  <optgroup label="IC Levels (FAANG-style)">
                    {['L3', 'L4', 'L5', 'L6', 'L7', 'L8+'].map(l => <option key={l} value={l}>{l}</option>)}
                  </optgroup>
                  <optgroup label="Title-based">
                    {['Associate', 'Junior', 'Mid-level', 'Senior', 'Staff', 'Principal', 'Lead', 'Manager', 'Senior Manager', 'Associate Director', 'Director', 'Senior Director', 'VP', 'SVP', 'EVP', 'C-Suite'].map(l => <option key={l} value={l}>{l}</option>)}
                  </optgroup>
                </select>
              </div>
            </div>
            {careerStatus !== 'employed' && (
              <button onClick={() => setStep(6)} style={{
                marginTop: '12px', width: '100%', padding: '10px',
                background: 'transparent', border: `1px solid ${BORDER}`,
                borderRadius: '10px', color: 'rgba(255,255,255,0.3)',
                fontSize: '13px', cursor: 'pointer',
              }}>
                Skip — not currently employed →
              </button>
            )}
          </div>
        )}

        {/* ── Step 6: Compensation ── */}
        {step === 6 && (
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 8px' }}>COMPENSATION</p>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>What are you currently earning?</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: '0 0 1.5rem' }}>Used to benchmark your market position. Never shared with employers.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>CURRENCY</label>
                <select value={compCurrency} onChange={e => setCompCurrency(e.target.value)} style={selectStyle}>
                  {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>BASE ({currencyUnit})</label>
                  <input type="number" value={currentBase} onChange={e => setCurrentBase(e.target.value)} placeholder={compCurrency === 'INR' ? '50' : '180'} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>EQUITY (USD/yr)</label>
                  <input type="number" value={currentEquityUsd} onChange={e => setCurrentEquityUsd(e.target.value)} placeholder="10000" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>VARIABLE %</label>
                  <input type="number" value={currentVariablePct} onChange={e => setCurrentVariablePct(e.target.value)} placeholder="15" style={inputStyle} />
                </div>
              </div>
              {totalComp && (
                <div style={{
                  padding: '12px 14px', borderRadius: '10px',
                  background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
                  display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{currencySymbol}{totalComp.base} base</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>+</span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{currencySymbol}{totalComp.equityLocal} equity</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>+</span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{currencySymbol}{totalComp.variableLocal} variable</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>=</span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: TEAL }}>{currencySymbol}{totalComp.total} {currencyUnit} total</span>
                </div>
              )}
            </div>
            <button onClick={() => setStep(7)} style={{
              marginTop: '12px', width: '100%', padding: '10px',
              background: 'transparent', border: `1px solid ${BORDER}`,
              borderRadius: '10px', color: 'rgba(255,255,255,0.3)',
              fontSize: '13px', cursor: 'pointer',
            }}>
              Skip compensation →
            </button>
          </div>
        )}

        {/* ── Step 7: Job preferences ── */}
        {step === 7 && (
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 8px' }}>JOB PREFERENCES</p>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>What are you looking for?</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: '0 0 1.5rem' }}>Shapes your job feed and match scoring.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', display: 'block', marginBottom: '8px' }}>TARGET MARKETS</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {MARKETS.map(m => (
                    <div key={m.value} onClick={() => toggleMarket(m.value)} style={{
                      padding: '6px 12px', borderRadius: '999px', cursor: 'pointer',
                      background: targetMarkets.includes(m.value) ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${targetMarkets.includes(m.value) ? 'rgba(16,185,129,0.35)' : BORDER}`,
                      fontSize: '12px', fontWeight: 500,
                      color: targetMarkets.includes(m.value) ? TEAL : 'rgba(255,255,255,0.5)',
                    }}>
                      {m.label} {targetMarkets.includes(m.value) && '✓'}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', display: 'block', marginBottom: '8px' }}>WORK MODE</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {WORK_MODES.map(m => (
                    <div key={m.value} onClick={() => setWorkMode(m.value)} style={{
                      flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
                      background: workMode === m.value ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${workMode === m.value ? TEAL : BORDER}`,
                      fontSize: '12px', fontWeight: 600,
                      color: workMode === m.value ? TEAL : 'rgba(255,255,255,0.5)',
                    }}>
                      {m.label}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>SALARY TARGET ({selectedCurrency.unit})</label>
                  <input type="number" value={salaryTarget} onChange={e => setSalaryTarget(e.target.value)} placeholder={compCurrency === 'INR' ? '80' : '250'} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>COMPANY STAGE</label>
                  <select value={companyStage} onChange={e => setCompanyStage(e.target.value)} style={selectStyle}>
                    <option value="any">No preference</option>
                    {COMPANY_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 8: Done ── */}
        {step === 8 && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🎉</p>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>You're all set!</h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', margin: '0 0 6px', lineHeight: 1.6 }}>
              Career Sage is now building your Career DNA.
            </p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', margin: '0 0 2rem', lineHeight: 1.6 }}>
              Your personalised job feed, promotion readiness score, and market position are ready to explore.
            </p>
            <div style={{
              padding: '14px', borderRadius: '12px', marginBottom: '1.5rem',
              background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
            }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 8px' }}>What's waiting for you</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  '🧬 Career DNA — your professional identity',
                  '📊 Promotion Readiness score',
                  '💰 Market compensation positioning',
                  '⚡ Matched job feed',
                ].map(item => (
                  <p key={item} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>{item}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
          {step > 1 && step < 8 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              padding: '12px 20px', borderRadius: '10px',
              background: 'transparent', border: `1px solid ${BORDER}`,
              color: 'rgba(255,255,255,0.4)', fontSize: '14px', cursor: 'pointer',
            }}>
              ← Back
            </button>
          )}
          {step !== 2 && (
            <button
              onClick={handleNext}
              disabled={saving || !canProceed()}
              style={{
                flex: 1, padding: '13px', borderRadius: '10px',
                background: canProceed() ? TEAL : 'rgba(255,255,255,0.06)',
                color: canProceed() ? '#fff' : 'rgba(255,255,255,0.25)',
                border: 'none', fontSize: '14px', fontWeight: 600,
                cursor: canProceed() && !saving ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              {saving ? 'Saving...' : step === 8 ? '🚀 Go to Career DNA' : 'Continue →'}
            </button>
          )}
        </div>
      </div>

      {/* Skip onboarding entirely */}
      {step < 8 && (
        <button
          onClick={async () => {
            await saveStep({ onboarding_complete: true })
            onComplete()
          }}
          style={{
            marginTop: '16px', background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.2)', fontSize: '12px', cursor: 'pointer',
          }}
        >
          Skip setup and go straight to Career Sage →
        </button>
      )}
    </div>
  )
}