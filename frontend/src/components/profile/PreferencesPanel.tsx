'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

const CURRENCIES = [
  { value: 'INR', label: '₹ INR — Indian Rupee',        unit: 'LPA' },
  { value: 'USD', label: '$ USD — US Dollar',            unit: 'K/year' },
  { value: 'GBP', label: '£ GBP — British Pound',        unit: 'K/year' },
  { value: 'SGD', label: 'S$ SGD — Singapore Dollar',    unit: 'K/year' },
  { value: 'CAD', label: 'C$ CAD — Canadian Dollar',     unit: 'K/year' },
  { value: 'AUD', label: 'A$ AUD — Australian Dollar',   unit: 'K/year' },
  { value: 'AED', label: 'AED — UAE Dirham',             unit: 'K/year' },
  { value: 'EUR', label: '€ EUR — Euro',                 unit: 'K/year' },
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

const STAGE_OPTIONS = [
  { value: 'seed',       label: '🌱 Seed / Early stage',    desc: '0-to-1, builder environment' },
  { value: 'growth',     label: '📈 Series B / C — Growth', desc: 'Scaling fast, rapid hiring' },
  { value: 'late',       label: '🦄 Late stage / Pre-IPO',  desc: 'Large org, proven product' },
  { value: 'enterprise', label: '🏢 Enterprise / Public',   desc: 'Established, process-driven' },
  { value: 'any',        label: '🔀 No preference',         desc: 'Show all company stages' },
]

const WORK_MODE_OPTIONS = [
  { value: 'remote',  label: '🌐 Remote',       desc: 'Fully remote' },
  { value: 'hybrid',  label: '🏠 Hybrid',       desc: '2-3 days in office' },
  { value: 'onsite',  label: '🏢 On-site',      desc: 'Full time in office' },
  { value: 'any',     label: '🔀 No preference', desc: 'Open to all' },
]

// USD to local currency rates (for equity conversion display)
const EQUITY_RATES: Record<string, number> = {
  USD: 1, INR: 83.5, GBP: 0.79, SGD: 1.35,
  CAD: 1.37, AUD: 1.54, AED: 3.67, EUR: 0.93,
}

export default function PreferencesPanel({ userId }: { userId: string }) {
  const [salaryTarget,       setSalaryTarget]       = useState('')
  const [companyStage,       setCompanyStage]       = useState('any')
  const [workMode,           setWorkMode]           = useState('any')
  const [location,           setLocation]           = useState('')
  const [currentBase,        setCurrentBase]        = useState('')
  const [currentEquityUsd,   setCurrentEquityUsd]   = useState('')
  const [currentVariablePct, setCurrentVariablePct] = useState('')
  const [compCurrency,       setCompCurrency]       = useState('INR')
  const [prefCurrency,       setPrefCurrency]       = useState('INR')
  const [targetMarkets,      setTargetMarkets]      = useState<string[]>(['India'])
  const [saving,             setSaving]             = useState(false)
  const [saved,              setSaved]              = useState(false)

  const selectedCurrency = CURRENCIES.find(c => c.value === compCurrency) || CURRENCIES[0]
  const currencySymbol   = selectedCurrency.label.split(' ')[0]
  const currencyUnit     = selectedCurrency.unit

  // Live total comp preview — always in local currency
  const totalComp = (() => {
    const base     = parseFloat(currentBase)     || 0
    const equityUsd = parseFloat(currentEquityUsd) || 0
    const variable = parseFloat(currentVariablePct) || 0
    if (!base) return null

    const rate         = EQUITY_RATES[compCurrency] || 1
    const equityLocal  = compCurrency === 'INR'
      ? parseFloat((equityUsd / 100000 * rate).toFixed(2))    // $10000 → ₹8,35,000 → ₹8.35L
      : parseFloat((equityUsd / 1000).toFixed(2))              // $10000 → $10K
    const variableLocal = parseFloat((base * variable / 100).toFixed(2))
    const total         = parseFloat((base + equityLocal + variableLocal).toFixed(2))

    return { base, equityLocal, variableLocal, total }
  })()

  const toggleMarket = (market: string) => {
    setTargetMarkets(prev =>
      prev.includes(market)
        ? prev.filter(m => m !== market)
        : [...prev, market]
    )
  }

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/${userId}`)
      .then(r => r.json())
      .then(data => {
        setSalaryTarget(data.salary_target_lpa?.toString() || '')
        setCompanyStage(data.preferred_company_stage || 'any')
        setWorkMode(data.preferred_work_mode || 'any')
        setLocation(data.location || '')
        setCurrentBase(data.current_base_lpa?.toString() || '')
        setCurrentEquityUsd(data.current_equity_usd?.toString() || '')
        setCurrentVariablePct(data.current_variable_pct?.toString() || '')
        setCompCurrency(data.current_comp_currency || 'INR')
        setPrefCurrency(data.preferred_currency || 'INR')
        setTargetMarkets(data.target_market || ['India'])
      })
      .catch(() => {})
  }, [userId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:                userId,
          salary_target_lpa:      salaryTarget ? parseInt(salaryTarget) : null,
          preferred_company_stage: companyStage === 'any' ? null : companyStage,
          preferred_work_mode:    workMode === 'any' ? null : workMode,
          location:               location || null,
          current_base_lpa:       currentBase ? parseFloat(currentBase) : null,
          current_equity_usd:     currentEquityUsd ? parseFloat(currentEquityUsd) : null,
          current_variable_pct:   currentVariablePct ? parseFloat(currentVariablePct) : null,
          preferred_currency:     prefCurrency,
          current_comp_currency:  compCurrency,
          target_market:          targetMarkets,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${BORDER}`,
    color: '#fff', fontSize: '13px',
    boxSizing: 'border-box' as const, outline: 'none',
    fontFamily: 'system-ui',
  }

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    colorScheme: 'dark' as const,
    background: '#1c2128',
    color: '#fff',
    WebkitAppearance: 'none' as const,
    appearance: 'none' as const,
  }

  const SectionLabel = ({ label }: { label: string }) => (
    <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 8px' }}>
      {label}
    </p>
  )

  const OptionGrid = ({ options, value, onChange }: {
    options: typeof STAGE_OPTIONS
    value: string
    onChange: (v: string) => void
  }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '1.25rem' }}>
      {options.map(o => (
        <div key={o.value} onClick={() => onChange(o.value)} style={{
          padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
          background: value === o.value ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${value === o.value ? 'rgba(16,185,129,0.3)' : BORDER}`,
          transition: 'all 0.15s',
        }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: value === o.value ? TEAL : 'rgba(255,255,255,0.6)', margin: '0 0 2px' }}>
            {o.label} {value === o.value && '✓'}
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{o.desc}</p>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', colorScheme: 'dark' }}>

      {/* Target markets */}
      <SectionLabel label="TARGET MARKETS" />
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {MARKETS.map(m => (
          <div key={m.value} onClick={() => toggleMarket(m.value)} style={{
            padding: '6px 12px', borderRadius: '999px', cursor: 'pointer',
            background: targetMarkets.includes(m.value) ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${targetMarkets.includes(m.value) ? 'rgba(16,185,129,0.35)' : BORDER}`,
            fontSize: '12px', fontWeight: 500,
            color: targetMarkets.includes(m.value) ? TEAL : 'rgba(255,255,255,0.5)',
            transition: 'all 0.15s',
          }}>
            {m.label} {targetMarkets.includes(m.value) && '✓'}
          </div>
        ))}
      </div>

      {/* Current compensation */}
      <SectionLabel label="CURRENT COMPENSATION" />
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`,
        borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem',
      }}>
        {/* Currency selector */}
        <div style={{ marginBottom: '10px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.07em', margin: '0 0 5px' }}>
            COMPENSATION CURRENCY
          </p>
          <select value={compCurrency} onChange={e => setCompCurrency(e.target.value)} style={selectStyle}>
            {CURRENCIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.07em', margin: '0 0 5px' }}>
              BASE SALARY ({currencyUnit})
            </p>
            <input
              type="number" value={currentBase}
              onChange={e => setCurrentBase(e.target.value)}
              placeholder={compCurrency === 'INR' ? 'e.g. 50' : 'e.g. 180'}
              style={inputStyle}
            />
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.07em', margin: '0 0 5px' }}>
              ANNUAL EQUITY (USD)
            </p>
            <input
              type="number" value={currentEquityUsd}
              onChange={e => setCurrentEquityUsd(e.target.value)}
              placeholder="e.g. 10000"
              style={inputStyle}
            />
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: '3px 0 0' }}>
              Always in USD — stock markets price in $
            </p>
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.07em', margin: '0 0 5px' }}>
              VARIABLE (% OF BASE)
            </p>
            <input
              type="number" value={currentVariablePct}
              onChange={e => setCurrentVariablePct(e.target.value)}
              placeholder="e.g. 15"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Live total comp preview */}
        {totalComp && (
          <div style={{
            display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center',
            padding: '10px 12px', borderRadius: '8px',
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
          }}>
            <div>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: '0 0 2px' }}>Base</p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>{currencySymbol}{totalComp.base} {currencyUnit}</p>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>+</span>
            <div>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: '0 0 2px' }}>Equity</p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>{currencySymbol}{totalComp.equityLocal} {currencyUnit}</p>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>+</span>
            <div>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: '0 0 2px' }}>Variable</p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>{currencySymbol}{totalComp.variableLocal} {currencyUnit}</p>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>=</span>
            <div>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: '0 0 2px' }}>Total CTC</p>
              <p style={{ fontSize: '15px', fontWeight: 700, color: TEAL, margin: 0 }}>{currencySymbol}{totalComp.total} {currencyUnit}</p>
            </div>
            {compCurrency !== 'USD' && (
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginLeft: 'auto', alignSelf: 'flex-end' }}>
                Equity converted at ${1} = {currencySymbol}{EQUITY_RATES[compCurrency]}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Preferred display currency */}
      <div style={{ marginBottom: '1.25rem' }}>
        <SectionLabel label="PREFERRED DISPLAY CURRENCY" />
        <select value={prefCurrency} onChange={e => setPrefCurrency(e.target.value)} style={selectStyle}>
          {CURRENCIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: '4px 0 0' }}>
          All salary figures shown in this currency across Career Sage
        </p>
      </div>

      {/* Salary target + Location */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.25rem' }}>
        <div>
          <SectionLabel label={`SALARY TARGET (${currencyUnit})`} />
          <input
            type="number" value={salaryTarget}
            onChange={e => setSalaryTarget(e.target.value)}
            placeholder={compCurrency === 'INR' ? 'e.g. 80' : 'e.g. 250'}
            style={inputStyle}
          />
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: '4px 0 0' }}>
            Roles 30%+ below this get flagged
          </p>
        </div>
        <div>
          <SectionLabel label="PREFERRED LOCATION" />
          <input
            type="text" value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Bengaluru, London, Singapore"
            style={inputStyle}
          />
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: '4px 0 0' }}>
            Affects job ranking and feed sorting
          </p>
        </div>
      </div>

      {/* Company stage */}
      <SectionLabel label="PREFERRED COMPANY STAGE" />
      <OptionGrid options={STAGE_OPTIONS} value={companyStage} onChange={setCompanyStage} />

      {/* Work mode */}
      <SectionLabel label="WORK MODE" />
      <OptionGrid options={WORK_MODE_OPTIONS} value={workMode} onChange={setWorkMode} />

      <button
        onClick={handleSave} disabled={saving}
        style={{
          padding: '10px', borderRadius: '9px',
          background: saved ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg, #10B981, #059669)',
          color: '#fff', border: 'none',
          fontSize: '13px', fontWeight: 700,
          cursor: saving ? 'not-allowed' : 'pointer',
          boxShadow: saved ? 'none' : '0 4px 16px rgba(16,185,129,0.25)',
        }}
      >
        {saved ? '✓ Preferences saved' : saving ? 'Saving...' : 'Save preferences'}
      </button>
    </div>
  )
}