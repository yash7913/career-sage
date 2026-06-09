'use client'
import { useState } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

interface OfferResult {
  verdict: string
  verdict_reason: string
  market_range: { low: number; mid: number; high: number }
  counter_offer: { base_salary_lpa: number; bonus_lpa: number; joining_bonus_lpa: number; reasoning: string }
  negotiation_script: string
  negotiation_tips: string[]
  red_flags: string[]
  green_flags: string[]
}

const VERDICT_STYLES: Record<string, { color: string; bg: string }> = {
  'Strong Offer': { color: TEAL, bg: 'rgba(16,185,129,0.1)' },
  'Fair Offer': { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  'Below Market': { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  'Lowball': { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
}

export default function OfferAnalyser({ userId }: { userId: string }) {
  const [form, setForm] = useState({
    job_title: '', company: '',
    base_salary_lpa: '', bonus_lpa: '',
    equity_percent: '', joining_bonus_lpa: '', notes: '',
  })
  const [result, setResult] = useState<OfferResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showScript, setShowScript] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async () => {
    if (!form.job_title || !form.company || !form.base_salary_lpa) {
      setError('Role, company and base salary are required')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/analyse-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          job_title: form.job_title,
          company: form.company,
          base_salary_lpa: parseFloat(form.base_salary_lpa),
          bonus_lpa: form.bonus_lpa ? parseFloat(form.bonus_lpa) : null,
          equity_percent: form.equity_percent ? parseFloat(form.equity_percent) : null,
          joining_bonus_lpa: form.joining_bonus_lpa ? parseFloat(form.joining_bonus_lpa) : null,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) { const e = await res.json(); setError(e.detail || 'Analysis failed'); return }
      setResult(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
    color: '#fff', fontSize: '13px', outline: 'none',
    boxSizing: 'border-box' as const, fontFamily: 'system-ui',
  }

  const labelStyle = {
    fontSize: '11px', fontWeight: 600 as const,
    color: 'rgba(255,255,255,0.4)', marginBottom: '4px', display: 'block' as const,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Input form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>ROLE</label>
          <input style={inputStyle} placeholder="Senior Product Manager"
            value={form.job_title} onChange={e => setForm(p => ({ ...p, job_title: e.target.value }))} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>COMPANY</label>
          <input style={inputStyle} placeholder="CRED"
            value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>BASE SALARY (LPA)</label>
          <input style={inputStyle} type="number" placeholder="35"
            value={form.base_salary_lpa} onChange={e => setForm(p => ({ ...p, base_salary_lpa: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>BONUS (LPA)</label>
          <input style={inputStyle} type="number" placeholder="5"
            value={form.bonus_lpa} onChange={e => setForm(p => ({ ...p, bonus_lpa: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>EQUITY (%)</label>
          <input style={inputStyle} type="number" placeholder="0.5"
            value={form.equity_percent} onChange={e => setForm(p => ({ ...p, equity_percent: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>JOINING BONUS (LPA)</label>
          <input style={inputStyle} type="number" placeholder="2"
            value={form.joining_bonus_lpa} onChange={e => setForm(p => ({ ...p, joining_bonus_lpa: e.target.value }))} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>NOTES (optional)</label>
          <input style={inputStyle} placeholder="e.g. remote-first, startup series B, stock vesting 4yr cliff 1yr"
            value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
      </div>

      {error && <p style={{ fontSize: '12px', color: 'rgba(239,68,68,0.8)', margin: 0 }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          padding: '11px', borderRadius: '10px',
          background: loading ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10B981, #059669)',
          color: '#fff', border: 'none', fontSize: '14px',
          fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '⟳ Analysing offer...' : '💼 Analyse this offer'}
      </button>

      {/* Results */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Verdict */}
          {(() => {
            const vs = VERDICT_STYLES[result.verdict] || VERDICT_STYLES['Fair Offer']
            return (
              <div style={{
                padding: '1rem 1.25rem', borderRadius: '12px',
                background: vs.bg, border: `1px solid ${vs.color}30`,
                display: 'flex', alignItems: 'flex-start', gap: '12px',
              }}>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: vs.color, margin: '0 0 4px' }}>
                    {result.verdict}
                  </p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>
                    {result.verdict_reason}
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Market range */}
          <div style={{
            padding: '1rem 1.25rem', borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`,
          }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 12px' }}>
              MARKET RANGE FOR YOUR COHORT
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { label: 'Low', value: result.market_range.low, color: '#EF4444' },
                { label: 'Mid', value: result.market_range.mid, color: '#F59E0B' },
                { label: 'High', value: result.market_range.high, color: TEAL },
              ].map(m => (
                <div key={m.label} style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: '8px', background: `${m.color}10`, border: `1px solid ${m.color}25` }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>{m.label}</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: m.color, margin: 0 }}>₹{m.value}L</p>
                </div>
              ))}
            </div>
          </div>

          {/* Counter offer */}
          <div style={{
            padding: '1rem 1.25rem', borderRadius: '12px',
            background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.08em', margin: '0 0 12px' }}>
              SUGGESTED COUNTER-OFFER
            </p>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              {[
                { label: 'Base', value: result.counter_offer.base_salary_lpa },
                { label: 'Bonus', value: result.counter_offer.bonus_lpa },
                { label: 'Joining', value: result.counter_offer.joining_bonus_lpa },
              ].filter(i => i.value > 0).map(item => (
                <div key={item.label} style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>{item.label}</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: TEAL, margin: 0 }}>₹{item.value}L</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.6 }}>
              {result.counter_offer.reasoning}
            </p>
          </div>

          {/* Flags */}
          {(result.green_flags.length > 0 || result.red_flags.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {result.green_flags.length > 0 && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: TEAL, margin: '0 0 8px', letterSpacing: '0.06em' }}>GREEN FLAGS</p>
                  {result.green_flags.map((f, i) => (
                    <p key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', margin: '0 0 4px', lineHeight: 1.5 }}>✓ {f}</p>
                  ))}
                </div>
              )}
              {result.red_flags.length > 0 && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#EF4444', margin: '0 0 8px', letterSpacing: '0.06em' }}>RED FLAGS</p>
                  {result.red_flags.map((f, i) => (
                    <p key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', margin: '0 0 4px', lineHeight: 1.5 }}>⚠ {f}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tips */}
          {result.negotiation_tips.length > 0 && (
            <div style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 10px' }}>NEGOTIATION TIPS</p>
              {result.negotiation_tips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ color: TEAL, flexShrink: 0 }}>→</span>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>{tip}</p>
                </div>
              ))}
            </div>
          )}

          {/* Negotiation script */}
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: `1px solid ${BORDER}` }}>
            <button
              onClick={() => setShowScript(!showScript)}
              style={{
                width: '100%', padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)', border: 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', color: '#fff',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600 }}>📝 Negotiation script</span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{showScript ? '▲' : '▼'}</span>
            </button>
            {showScript && (
              <div style={{ padding: '1rem 1.25rem', borderTop: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '0 0 12px', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                  {result.negotiation_script}
                </p>
                <button
                  onClick={() => { navigator.clipboard.writeText(result.negotiation_script); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  style={{
                    padding: '6px 16px', borderRadius: '7px',
                    background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                    color: copied ? TEAL : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : BORDER}`,
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {copied ? '✓ Copied' : 'Copy script'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}