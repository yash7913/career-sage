'use client'
import { useState, useEffect, useRef, ReactNode } from 'react'
import AuthModal from '@/components/ui/auth-modal'

const TEAL = '#10B981'
const TEAL_DIM = 'rgba(16,185,129,0.08)'
const TEAL_BORDER = 'rgba(16,185,129,0.2)'
const BG = '#0d1117'
const CARD = '#161b22'
const CARD2 = '#1c2128'
const BORDER = 'rgba(255,255,255,0.07)'

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [v, setV] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true) }, { threshold: 0.06 })
    o.observe(el); return () => o.disconnect()
  }, [])
  return (
    <div ref={ref} style={{
      opacity: v ? 1 : 0,
      transform: v ? 'translateY(0)' : 'translateY(22px)',
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      willChange: 'opacity, transform',
    }}>{children}</div>
  )
}

function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true) }, { threshold: 0.5 })
    o.observe(el); return () => o.disconnect()
  }, [])
  useEffect(() => {
    if (!started) return
    let start = 0
    const duration = 1800
    const step = 16
    const increment = target / (duration / step)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, step)
    return () => clearInterval(timer)
  }, [started, target])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

const NAV_SECTIONS = [
  ['Platform', 'platform'],
  ['How it works', 'how-it-works'],
  ['Telemetry', 'telemetry'],
  ['Pricing', 'pricing'],
]

const jobCards = [
  { company: 'Google', location: 'Remote · India', title: 'Lead AI Product Manager', match: 94, salaryMin: '₹48L', salaryMax: '₹72L', skills: ['LLM', 'Vector DB', 'PM'], top: true, rounds: '4 rounds · 1 System Design' },
  { company: 'Razorpay', location: 'Hybrid · Bangalore', title: 'Senior Data Analyst', match: 89, salaryMin: '₹28L', salaryMax: '₹42L', skills: ['SQL', 'Python', 'dbt'], top: false, rounds: '3 rounds · 1 Case Study' },
  { company: 'Anthropic', location: 'Remote · US', title: 'Staff ML Engineer', match: 82, salaryMin: '$340K', salaryMax: '$520K', skills: ['RLHF', 'PyTorch', 'Distributed'], top: false, rounds: '5 rounds · 2 Technical' },
]

const modules = [
  { num: '01', title: 'Distributed ingest engine', desc: 'Crawls 250+ ATS portals, LinkedIn, and Naukri every 12 hours — deduplicates cross-posted listings into a single canonical record.' },
  { num: '02', title: 'Unified profile graph', desc: 'Upload resumes, decks, or notes in any format. Extracts skills, education, and impact metrics into a semantic profile in under 4.5 seconds.' },
  { num: '03', title: 'Semantic match and rank', desc: 'Vector embeddings per career track rank every role by skill overlap (40%), seniority (30%), and impact correlation (30%).' },
  { num: '04', title: 'Generative asset workspace', desc: 'CareerSage rewrites your resume and cover letter per job description in a live-streamed split pane. First token in 1.2 seconds.' },
  { num: '05', title: 'Auto-synced pipeline tracker', desc: 'Downloading a tailored resume auto-logs a Kanban card. Drag through Draft → Applied → Interviewing → Offer.' },
]

const steps = [
  { num: '01', title: 'Drop your portfolio', desc: 'Resumes, decks, project briefs — any format. Profile graph built in under 4.5 seconds. Set up multiple career tracks from the same documents.' },
  { num: '02', title: 'Discover ranked roles', desc: 'Pre-sorted feed with match scores, Levels.fyi salary ranges, interview round telemetry, and skill-gap analysis per role.' },
  { num: '03', title: 'Stream tailored assets', desc: 'Set a custom direction, click generate, watch tokens stream in 1.2 seconds. Download triggers your tracker automatically.' },
]

const faqs = [
  { q: 'How is this different from LinkedIn or Naukri?', a: 'Those platforms surface publicly listed roles. Career Sage also crawls 250+ company career pages directly — roles that never reach aggregators. Every role is then ranked against your specific track using vector embeddings, not just keyword filters.' },
  { q: 'What are career tracks and why do I need them?', a: 'A career track is a lens on your experience. Targeting Analytics and Product Management simultaneously? Each track emphasises different skills from the same uploaded documents, runs its own ranked feed, and generates track-specific resumes — without managing two separate accounts.' },
  { q: 'Where does the salary data come from?', a: 'Compensation ranges are pulled from Levels.fyi and mapped to the company, job title, and seniority level of each matched role. You see estimated base, equity, and bonus breakdowns inside the job card — before you apply.' },
  { q: 'How does the Academic tier work?', a: 'Sign in with a verified .edu or .ac.in email and Career Sage automatically assigns you the Academic tier — infinite generation cycles, profile vector analytics, and full platform access at no cost. No application or approval needed.' },
  { q: 'Can I control how the AI writes my resume?', a: 'Yes. Before every generation, type a custom direction — for example "prioritise my large-scale data pipeline work over generic delivery metrics." That constraint is injected directly into the CareerSage prompt so the output reflects your intent, not just the JD.' },
]

const BILLING = [
  { label: 'Bi-weekly', key: 'biweekly', discount: null },
  { label: 'Monthly', key: 'monthly', discount: '15% off' },
  { label: 'Annual', key: 'annual', discount: '40% off' },
]

const PRICES: Record<string, Record<string, { symbol: string; pro: string }>> = {
  INR: { biweekly: { symbol: '₹', pro: '59' }, monthly: { symbol: '₹', pro: '99' }, annual: { symbol: '₹', pro: '999/yr' } },
  USD: { biweekly: { symbol: '$', pro: '0.99' }, monthly: { symbol: '$', pro: '1.99' }, annual: { symbol: '$', pro: '19.99/yr' } },
  SGD: { biweekly: { symbol: 'S$', pro: '1.29' }, monthly: { symbol: 'S$', pro: '2.49' }, annual: { symbol: 'S$', pro: '24.99/yr' } },
  GBP: { biweekly: { symbol: '£', pro: '0.79' }, monthly: { symbol: '£', pro: '1.59' }, annual: { symbol: '£', pro: '15.99/yr' } },
  EUR: { biweekly: { symbol: '€', pro: '0.89' }, monthly: { symbol: '€', pro: '1.79' }, annual: { symbol: '€', pro: '17.99/yr' } },
  AUD: { biweekly: { symbol: 'A$', pro: '1.49' }, monthly: { symbol: 'A$', pro: '2.99' }, annual: { symbol: 'A$', pro: '29.99/yr' } },
}

function detectCurrency(): string {
  try {
    const locale = navigator.language || 'en-IN'
    if (locale.includes('IN')) return 'INR'
    if (locale.includes('GB')) return 'GBP'
    if (locale.includes('SG')) return 'SGD'
    if (locale.includes('AU')) return 'AUD'
    if (['de','fr','it','es','nl','pt'].some(l => locale.startsWith(l))) return 'EUR'
    return 'USD'
  } catch { return 'INR' }
}

const FEATURE_ROWS: { feature: string; free: string | null; academic: string | null; pro: string | null }[] = [
  { feature: 'Resume generations',     free: '2 per 30 days',     academic: 'Unlimited',              pro: 'Unlimited' },
  { feature: 'Career tracks',          free: '1 track',           academic: 'Up to 3 tracks',         pro: 'Unlimited tracks' },
  { feature: 'Job discovery feed',     free: 'Full access',       academic: 'Full access',            pro: 'Full + priority queue' },
  { feature: 'Cover letter gen',       free: null,                academic: 'Included',               pro: 'Included' },
  { feature: 'Salary intel',           free: null,                academic: null,                     pro: 'Levels.fyi per role' },
  { feature: 'Interview intel',        free: null,                academic: 'Included',               pro: 'Full round breakdown' },
  { feature: 'Profile analytics',      free: null,                academic: 'Vector analytics',       pro: 'Deep dashboard' },
  { feature: 'Custom prompt vault',    free: null,                academic: null,                     pro: 'Edit AI instructions' },
  { feature: 'Resume version history', free: null,                academic: null,                     pro: 'Full history + rollback' },
  { feature: 'Pipeline tracker',       free: 'Kanban board',      academic: 'Kanban board',           pro: 'Kanban + List + auto-card' },
  { feature: 'Mock interview portals', free: null,                academic: null,                     pro: 'Included' },
  { feature: 'Historical data ledger', free: null,                academic: null,                     pro: 'Included' },
  { feature: 'API access',             free: null,                academic: null,                     pro: 'Full API' },
  { feature: 'Support',                free: 'Community',         academic: 'Community',              pro: 'Dedicated' },
  { feature: 'Free trial pass',        free: '1 pass, no signup', academic: null,                     pro: null },
  { feature: 'Org email badge',        free: null,                academic: 'Emerald verified badge', pro: 'Pro badge' },
]

function Cell({ value, highlight }: { value: string | null; highlight: boolean }) {
  if (!value) return (
    <div style={{
      padding: '0.75rem 1.25rem',
      background: highlight ? 'rgba(16,185,129,0.05)' : 'transparent',
      borderLeft: highlight ? `1px solid ${TEAL_BORDER}` : `1px solid ${BORDER}`,
      borderRight: highlight ? `1px solid ${TEAL_BORDER}` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '14px' }}>—</span>
    </div>
  )
  return (
    <div style={{
      padding: '0.75rem 1.25rem',
      background: highlight ? 'rgba(16,185,129,0.05)' : 'transparent',
      borderLeft: highlight ? `1px solid ${TEAL_BORDER}` : `1px solid ${BORDER}`,
      borderRight: highlight ? `1px solid ${TEAL_BORDER}` : 'none',
      display: 'flex', alignItems: 'center', gap: '8px',
    }}>
      <span style={{ color: highlight ? TEAL : 'rgba(255,255,255,0.35)', flexShrink: 0, fontSize: '11px' }}>✓</span>
      <p style={{
        fontSize: highlight ? '13px' : '12px',
        color: highlight ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.7)',
        margin: 0, lineHeight: 1.4,
        fontWeight: highlight ? 500 : 400,
      }}>{value}</p>
    </div>
  )
}

function PricingTable() {
  const [billing, setBilling] = useState('monthly')
  const [currency, setCurrency] = useState('INR')
  const [showAuth, setShowAuth] = useState(false)
  useEffect(() => { setCurrency(detectCurrency()) }, [])

  const prices = PRICES[currency]?.[billing] ?? PRICES.INR.monthly
  const sym = prices.symbol
  const proPrice = prices.pro
  const proNum = proPrice.replace('/yr', '')
  const billingLabel = billing === 'biweekly' ? 'bi-weekly' : billing === 'annual' ? 'year' : 'month'
  const CURRENCIES = ['INR', 'USD', 'SGD', 'GBP', 'EUR', 'AUD']

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '999px', padding: '3px', gap: '3px' }}>
          {BILLING.map(b => (
            <button key={b.key} onClick={() => setBilling(b.key)} style={{
              padding: '6px 16px', borderRadius: '999px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600,
              background: billing === b.key ? TEAL : 'transparent',
              color: billing === b.key ? '#fff' : 'rgba(255,255,255,0.45)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {b.label}
              {b.discount && (
                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: billing === b.key ? 'rgba(255,255,255,0.2)' : TEAL_DIM, color: billing === b.key ? '#fff' : TEAL }}>
                  {b.discount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {CURRENCIES.map(c => (
            <button key={c} onClick={() => setCurrency(c)} style={{
              padding: '5px 11px', borderRadius: '8px',
              border: `1px solid ${currency === c ? TEAL_BORDER : BORDER}`,
              background: currency === c ? TEAL_DIM : 'transparent',
              color: currency === c ? TEAL : 'rgba(255,255,255,0.4)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            }}>{c}</button>
          ))}
        </div>
      </div>

      <div style={{ borderRadius: '14px', overflow: 'hidden', border: `1px solid ${BORDER}` }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr', background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ padding: '1rem' }} />
          <div style={{ padding: '1rem', borderLeft: `1px solid ${BORDER}`, textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', margin: '0 0 3px', letterSpacing: '0.08em' }}>FREE</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: '0 0 1px', letterSpacing: '-1px' }}>{sym}0</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>always free</p>
          </div>
          <div style={{ padding: '1rem', borderLeft: `1px solid ${BORDER}`, textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', margin: '0 0 3px', letterSpacing: '0.08em' }}>ACADEMIC</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: TEAL, margin: '0 0 1px', letterSpacing: '-1px' }}>Free</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>.edu · .ac.in · .org</p>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.08)', borderLeft: `1px solid ${TEAL_BORDER}`, textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)` }} />
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: TEAL, color: '#fff', letterSpacing: '0.05em' }}>RECOMMENDED</span>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, margin: '0 0 3px', letterSpacing: '0.08em' }}>PROFESSIONAL</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: '0 0 1px', letterSpacing: '-1px' }}>
              {sym}{proNum}<span style={{ fontSize: '12px', fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>/{billingLabel}</span>
            </p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>cancel anytime</p>
          </div>
        </div>

        {FEATURE_ROWS.map((row, i) => (
          <div key={row.feature} style={{
            display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr',
            borderBottom: i < FEATURE_ROWS.length - 1 ? `1px solid ${BORDER}` : 'none',
            background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
          }}>
            <div style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', borderRight: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{row.feature}</p>
            </div>
            <Cell value={row.free} highlight={false} />
            <Cell value={row.academic} highlight={false} />
            <Cell value={row.pro} highlight={true} />
          </div>
        ))}

        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr', borderTop: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.02)' }}>
          <div />
          <div style={{ padding: '1rem', borderLeft: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => setShowAuth(true)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', color: 'rgba(255,255,255,0.65)', border: `1px solid ${BORDER}`, fontSize: '12px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
              Get started
            </button>
          </div>
          <div style={{ padding: '1rem', borderLeft: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => setShowAuth(true)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: TEAL, border: `1px solid ${TEAL_BORDER}`, fontSize: '12px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
              Verify org email
            </button>
          </div>
          <div style={{ padding: '1rem', borderLeft: `1px solid ${TEAL_BORDER}`, background: 'rgba(16,185,129,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => setShowAuth(true)} style={{ padding: '8px 16px', borderRadius: '8px', background: TEAL, color: '#fff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
              Start with Pro →
            </button>
          </div>
        </div>
      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}

function MobileLandingPage({ showAuth, setShowAuth }: { showAuth: boolean; setShowAuth: (v: boolean) => void }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0d1117', color: '#fff',
      fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column',
    }}>
      {/* Simple header */}
      <div style={{
        padding: '1.25rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
          }}>⚡</div>
          <span style={{ fontSize: '16px', fontWeight: 700 }}>Career Sage</span>
        </div>
        <button onClick={() => setShowAuth(true)} style={{
          fontSize: '13px', color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer',
        }}>
          Sign in
        </button>
      </div>

      {/* Hero — headline, one-liner, one CTA */}
      <div style={{ padding: '2.5rem 1.25rem 2rem', flex: 1 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px', borderRadius: '999px', marginBottom: '1.5rem',
          background: 'rgba(16,185,129,0.1)', border: `1px solid ${TEAL_BORDER}`,
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: TEAL }} />
          <span style={{ fontSize: '11px', color: TEAL, fontWeight: 600 }}>Live · 12,481 roles scraped today</span>
        </div>

        <h1 style={{ fontSize: '34px', fontWeight: 800, lineHeight: 1.15, margin: '0 0 1rem', letterSpacing: '-1px' }}>
          The command center for your career hunt.
        </h1>

        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: '0 0 2rem' }}>
          Career Sage ingests every relevant role across LinkedIn, Naukri, Greenhouse and Lever — ranks them against your profile, and streams tailored resumes the second you click apply.
        </p>

        <button onClick={() => setShowAuth(true)} style={{
          width: '100%', padding: '14px', borderRadius: '999px',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          color: '#fff', border: 'none', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
          marginBottom: '2.5rem',
        }}>
          ⚡ Try one free optimization
        </button>

        {/* Brief value props — three short lines instead of full module sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
          {[
            { icon: '🧬', title: 'Career DNA', desc: 'Your professional identity, scored against your cohort and the top decile.' },
            { icon: '📊', title: 'Promotion Readiness', desc: 'A live readiness score with the specific gaps holding you back.' },
            { icon: '⚡', title: 'Ranked job feed', desc: 'Every role scored by skill overlap, seniority fit, and impact correlation.' },
          ].map(item => (
            <div key={item.title} style={{
              padding: '1rem', borderRadius: '12px',
              background: '#161b22', border: `1px solid ${BORDER}`,
              display: 'flex', gap: '12px', alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>{item.icon}</span>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 3px' }}>{item.title}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Simple stats row instead of full telemetry section */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
          padding: '1rem', borderRadius: '12px',
          background: '#161b22', border: `1px solid ${BORDER}`, marginBottom: '2.5rem',
        }}>
          {[['94%', 'Avg match'], ['1.2s', 'First token'], ['250+', 'Sources']].map(([v, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '18px', fontWeight: 700, color: TEAL, margin: '0 0 2px' }}>{v}</p>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{l}</p>
            </div>
          ))}
        </div>

        {/* Simple pricing summary instead of full comparison table */}
        <div style={{
          padding: '1.25rem', borderRadius: '14px',
          background: '#161b22', border: `1px solid ${TEAL_BORDER}`, marginBottom: '2rem',
        }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.08em', margin: '0 0 8px' }}>SIMPLE PRICING</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: '0 0 12px' }}>
            Free to start — 2 resume generations a month, full job discovery feed. Upgrade to Pro for unlimited generations, unlimited tracks, and salary intelligence.
          </p>
          <button onClick={() => setShowAuth(true)} style={{
            width: '100%', padding: '11px', borderRadius: '8px',
            background: 'rgba(16,185,129,0.12)', color: TEAL,
            border: `1px solid ${TEAL_BORDER}`, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>
            See full pricing on desktop →
          </button>
        </div>

        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: 0 }}>
          For the full experience — detailed comparisons, live job feed preview — visit on desktop.
        </p>
      </div>

      <div style={{ padding: '1.5rem', textAlign: 'center', borderTop: `1px solid ${BORDER}` }}>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>© 2026 Career Sage</p>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [activeSection, setActiveSection] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

useEffect(() => {
    const observers: IntersectionObserver[] = []
    NAV_SECTIONS.forEach(([, id]) => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActiveSection(id) },
        { threshold: 0, rootMargin: '-80px 0px -55% 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })

    const handleScrollBottom = () => {
      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 100
      if (scrolledToBottom) setActiveSection('pricing')
    }

    window.addEventListener('scroll', handleScrollBottom)
    return () => {
      observers.forEach(o => o.disconnect())
      window.removeEventListener('scroll', handleScrollBottom)
    }
  }, [])
const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => setShowTop(window.scrollY > 400)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (isMobile) {
    return <MobileLandingPage showAuth={showAuth} setShowAuth={setShowAuth} />
  }

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', overflowX: 'hidden' }}>



      {/* ── Fixed navbar ── */}
      <div className="nav-fixed">
        <nav style={{
          background: 'rgba(22,27,34,0.97)',
          border: `1px solid ${BORDER}`,
          borderRadius: '999px',
          padding: '0 1.5rem',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', height: '52px',
          maxWidth: '1200px', margin: '0 auto',
        }}>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>Career Sage</span>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            {NAV_SECTIONS.map(([label, id]) => (
              <a key={id} href={`#${id}`} style={{
                fontSize: '14px',
                color: activeSection === id ? TEAL : 'rgba(255,255,255,0.4)',
                textDecoration: 'none',
                transition: 'color 0.2s',
                fontWeight: activeSection === id ? 600 : 400,
                borderBottom: activeSection === id ? `1px solid ${TEAL}` : '1px solid transparent',
                paddingBottom: '2px',
              }}>{label}</a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            
            <button onClick={() => setShowAuth(true)}
              style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Sign in
            </button>
            <button onClick={() => setShowAuth(true)}
              style={{ fontSize: '14px', fontWeight: 600, padding: '8px 20px', borderRadius: '999px', background: '#fff', color: '#000', border: 'none', cursor: 'pointer' }}>
              Launch console
            </button>
          </div>
        </nav>
      </div>

      <div style={{ height: '80px' }} />

      {/* ── Hero ── */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 5% 5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }}>
        <div>
          <Reveal>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '5px 14px', borderRadius: '999px', background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}`, color: TEAL, marginBottom: '2rem' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: TEAL, display: 'inline-block', animation: 'pulse 2s infinite' }} />
              Live ingest · 12,481 roles scraped today
            </div>
          </Reveal>
          <Reveal delay={80}>
            <h1 style={{ fontSize: '58px', fontWeight: 600, lineHeight: 1.1, margin: '0 0 1.5rem', letterSpacing: '-2px', color: '#fff' }}>
              The command center<br />
              <span className="metallic">for your career hunt.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.8, margin: '0 0 2.5rem', maxWidth: '460px' }}>
              Career Sage ingests every relevant role across LinkedIn, Naukri, Greenhouse and Lever — ranks them against your profile graph, and streams tailored resumes the second you click apply.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => setShowAuth(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 26px', borderRadius: '999px', background: TEAL, color: '#fff', border: 'none', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
                ⚡ Try one free optimization →
              </button>
              <button style={{ padding: '12px 26px', borderRadius: '999px', background: 'transparent', color: 'rgba(255,255,255,0.7)', border: `1px solid ${BORDER}`, fontSize: '15px', cursor: 'pointer' }}>
                Watch 90s demo
              </button>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <div style={{ display: 'flex', gap: '3rem', marginTop: '3rem', paddingTop: '2rem', borderTop: `1px solid ${BORDER}` }}>
              {[['1.2s', 'First token'], ['250+', 'ATS sources'], ['94%', 'Avg match score']].map(([v, l]) => (
                <div key={l}>
                  <p style={{ fontSize: '26px', fontWeight: 700, color: '#fff', margin: '0 0 3px', letterSpacing: '-0.5px' }}>{v}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Job card mockup */}
        <Reveal delay={200}>
          <div style={{ position: 'relative' }}>
            <div style={{
              borderRadius: '16px', padding: '1px',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.8) 0%, rgba(6,182,212,0.4) 40%, rgba(16,185,129,0.1) 70%, rgba(6,182,212,0.6) 100%)',
              boxShadow: `0 0 40px rgba(16,185,129,0.12), 0 0 80px rgba(6,182,212,0.06)`,
            }}>
              <div style={{ background: CARD, borderRadius: '15px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF5F57' }} />
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FEBC2E' }} />
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28C840' }} />
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginLeft: '8px', fontFamily: 'monospace' }}>discovery.feed</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>sorted by match ↓</span>
                </div>
                {jobCards.map((job, i) => (
                  <div key={job.title} style={{ padding: '1.1rem 1.25rem', borderBottom: i < jobCards.length - 1 ? `1px solid ${BORDER}` : 'none', background: i === 0 ? 'rgba(16,185,129,0.05)' : 'transparent', position: 'relative' }}>
                    {i === 0 && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '2px', background: TEAL }} />}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 3px' }}>{job.company} · {job.location}</p>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>{job.title}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: job.top ? TEAL : 'rgba(255,255,255,0.07)', color: job.top ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                          ⚡ {job.match}%
                        </span>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>{job.salaryMin} – {job.salaryMax}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '5px' }}>
                      {job.skills.map(s => (
                        <span key={s} style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', background: CARD2, color: 'rgba(255,255,255,0.55)', border: `1px solid ${BORDER}` }}>{s}</span>
                      ))}
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: job.top ? '0 0 10px' : '0' }}>📋 {job.rounds}</p>
                    {job.top && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button style={{ padding: '8px', borderRadius: '8px', background: '#fff', color: '#000', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>☐ Tailor resume</button>
                        <button style={{ padding: '8px', borderRadius: '8px', background: CARD2, color: 'rgba(255,255,255,0.7)', border: `1px solid ${BORDER}`, fontSize: '12px', cursor: 'pointer' }}>✉ Cover letter</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Platform ── */}
      <section id="platform" className="section-anchor" style={{ maxWidth: '1200px', margin: '0 auto 5rem', padding: '0 5%' }}>
        <Reveal>
          <p style={{ fontSize: '12px', fontWeight: 600, color: TEAL, letterSpacing: '0.1em', margin: '0 0 0.75rem' }}>/ PLATFORM</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'flex-end', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '40px', fontWeight: 600, margin: 0, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
              Five modules.<br />
              <span className="metallic">One operating system.</span>
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0 }}>
              Each module handles one job. Together they cover everything from discovery to offer.
            </p>
          </div>
        </Reveal>
        <div>
          {modules.map((m, i) => (
            <Reveal key={m.num} delay={i * 50}>
              <div className="module-box">
                <span style={{ fontSize: '20px', fontWeight: 700, color: 'rgba(16,185,129,0.45)', letterSpacing: '-1px', lineHeight: 1 }}>{m.num}</span>
                <div>
                  <p className="module-title" style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: '0 0 4px', transition: 'color 0.25s' }}>{m.title}</p>
                  <p className="module-desc" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6, transition: 'color 0.25s' }}>{m.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="section-anchor" style={{ maxWidth: '1200px', margin: '0 auto 8rem', padding: '0 5%' }}>
        <Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: TEAL, letterSpacing: '0.1em', margin: '0 0 0.75rem' }}>/ HOW IT WORKS</p>
              <h2 style={{ fontSize: '40px', fontWeight: 600, margin: 0, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
                From scattered tabs<br />to <span style={{ color: TEAL }}>one continuous flow.</span>
              </h2>
            </div>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, alignSelf: 'center', margin: 0 }}>
              Three steps replace the entire ritual of job hunting.
            </p>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {steps.map((s, i) => (
            <Reveal key={s.num} delay={i * 80}>
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '1.75rem', height: '100%', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)`, opacity: 0.4 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '40px', fontWeight: 700, color: TEAL, letterSpacing: '-2px', lineHeight: 1, opacity: 0.6 }}>{s.num}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em' }}>STEP</span>
                </div>
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.3px' }}>{s.title}</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Telemetry ── */}
      <section id="telemetry" className="section-anchor" style={{ maxWidth: '1200px', margin: '0 auto 5rem', padding: '0 5%' }}>
        <Reveal>
          <p style={{ fontSize: '12px', fontWeight: 600, color: TEAL, letterSpacing: '0.1em', margin: '0 0 0.75rem' }}>/ GLOBAL TELEMETRY</p>
          <h2 style={{ fontSize: '40px', fontWeight: 600, margin: '0 0 2rem', letterSpacing: '-1.5px' }}>Live platform metrics.</h2>
        </Reveal>
        <Reveal delay={80}>
          <div style={{
            borderRadius: '16px', padding: '1px',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.6) 0%, rgba(6,182,212,0.3) 40%, rgba(16,185,129,0.4) 100%)',
          }}>
            <div style={{ background: CARD, borderRadius: '15px', overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {[
                { value: 12481, suffix: '', label: 'Roles scraped today', sub: 'Updated 4 min ago', delay: '0s' },
                { value: 94, suffix: '%', label: 'Avg match score', sub: 'Across all active users', delay: '0.3s' },
                { value: 12, suffix: 's', label: 'First token latency', sub: 'Resume generation SLA', delay: '0.6s' },
                { value: 43, suffix: 's', label: 'Profile extraction', sub: 'Multi-file vault parse', delay: '0.9s' },
              ].map((s, i) => (
                <div key={s.label} className="telemetry-card" style={{
                  padding: '2rem 1.5rem', textAlign: 'center',
                  borderRight: i < 3 ? `1px solid ${BORDER}` : 'none',
                  ['--mirror-delay' as string]: s.delay,
                }}>
                  <p style={{ fontSize: '34px', fontWeight: 700, color: TEAL, margin: '0 0 6px', letterSpacing: '-1.5px' }}>
                    <CountUp target={s.value} suffix={s.suffix} />
                  </p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: '0 0 4px', fontWeight: 500 }}>{s.label}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Comparison ── */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 5rem', padding: '0 5%' }}>
        <Reveal>
          <p style={{ fontSize: '12px', fontWeight: 600, color: TEAL, letterSpacing: '0.1em', margin: '0 0 0.75rem' }}>/ THE DIFFERENCE</p>
          <h2 style={{ fontSize: '40px', fontWeight: 600, margin: '0 0 2rem', letterSpacing: '-1.5px' }}>Where Career Sage wins.</h2>
        </Reveal>
        <Reveal delay={80}>
          <div style={{ borderRadius: '14px', overflow: 'hidden', border: `1px solid ${BORDER}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr', background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ padding: '1rem' }} />
              <div style={{ padding: '1rem', textAlign: 'center', background: 'rgba(16,185,129,0.08)', borderLeft: `1px solid ${TEAL_BORDER}`, borderRight: `1px solid ${TEAL_BORDER}`, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)` }} />
                <p style={{ fontSize: '13px', fontWeight: 700, color: TEAL, margin: '0 0 1px' }}>Career Sage</p>
                <p style={{ fontSize: '10px', color: 'rgba(16,185,129,0.55)', margin: 0 }}>purpose-built AI</p>
              </div>
              <div style={{ padding: '1rem', textAlign: 'center', borderLeft: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '0 0 1px' }}>Other AI copilots</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>generic tools</p>
              </div>
              <div style={{ padding: '1rem', textAlign: 'center', borderLeft: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '0 0 1px' }}>Traditional search</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>manual effort</p>
              </div>
            </div>
            {[
              { feature: 'Job discovery', sage: '250+ ATS portals + LinkedIn + Naukri, deduplicated into one ranked feed, refreshed every 12 hours.', others: 'Job board aggregation only. Unlisted roles never appear.', traditional: 'Manual search across multiple platforms daily.' },
              { feature: 'Match scoring', sage: 'Weighted vector match per track — skills 40%, seniority 30%, impact 30%. Updates with your profile.', others: 'Keyword match against one uploaded resume.', traditional: 'You scroll and judge relevance yourself.' },
              { feature: 'Salary intel', sage: 'Live Levels.fyi base, equity, and bonus ranges mapped to every job card before you apply.', others: 'Broad market estimates. Rarely role-specific.', traditional: 'No data. Research it yourself.' },
              { feature: 'Multi-track', sage: 'Analytics and PM tracks simultaneously from the same vault. Separate feed and resume per track.', others: 'One profile for all roles.', traditional: 'One CV sent everywhere.' },
              { feature: 'Resume gen', sage: 'CareerSage rewrites every bullet per JD, guided by your direction prompt. Streams in 1.2s.', others: 'Template substitution. Same structure, different keywords.', traditional: '2+ hours tailoring each application manually.' },
              { feature: 'Interview intel', sage: 'Round breakdown and expected question types per company and role, inside every job card.', others: 'Generic tips. Not role or company specific.', traditional: 'Glassdoor research on your own time.' },
              { feature: 'Pipeline', sage: 'Kanban auto-logs a card on download. Drag through Draft → Applied → Interviewing → Offer.', others: 'Manual status updates after each action.', traditional: 'A spreadsheet, if you remember to update it.' },
            ].map((row, i) => (
              <div key={row.feature} style={{
                display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr',
                borderBottom: i < 6 ? `1px solid ${BORDER}` : 'none',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
              }}>
                <div style={{ padding: '0.9rem 1rem', display: 'flex', alignItems: 'center', borderRight: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{row.feature}</p>
                </div>
                <div style={{ padding: '0.9rem 1.1rem', background: 'rgba(16,185,129,0.05)', borderLeft: `1px solid ${TEAL_BORDER}`, borderRight: `1px solid ${TEAL_BORDER}`, display: 'flex', gap: '7px', alignItems: 'flex-start' }}>
                  <span style={{ color: TEAL, flexShrink: 0, fontSize: '11px', marginTop: '3px' }}>✓</span>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', margin: 0, lineHeight: 1.6, fontWeight: 500 }}>{row.sage}</p>
                </div>
                <div style={{ padding: '0.9rem 1.1rem', borderLeft: `1px solid ${BORDER}`, display: 'flex', gap: '7px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0, fontSize: '11px', marginTop: '3px' }}>~</span>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.72)', margin: 0, lineHeight: 1.6 }}>{row.others}</p>
                </div>
                <div style={{ padding: '0.9rem 1.1rem', borderLeft: `1px solid ${BORDER}`, display: 'flex', gap: '7px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0, fontSize: '11px', marginTop: '3px' }}>✕</span>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.72)', margin: 0, lineHeight: 1.6 }}>{row.traditional}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="section-anchor" style={{ maxWidth: '1200px', margin: '0 auto 5rem', padding: '0 5%' }}>
        <Reveal>
          <p style={{ fontSize: '12px', fontWeight: 600, color: TEAL, letterSpacing: '0.1em', margin: '0 0 0.75rem' }}>/ PRICING</p>
          <h2 style={{ fontSize: '40px', fontWeight: 600, margin: '0 0 6px', letterSpacing: '-1.5px' }}>Access tiers, built for every stage.</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '0 0 1.5rem' }}>
            Org, .edu, and academic emails unlock enhanced access automatically. The best experience is always Pro.
          </p>
        </Reveal>
        <Reveal delay={80}>
          <PricingTable />
        </Reveal>
      </section>

      {/* ── FAQ ── */}
      <section id="faqs" className="section-anchor" style={{ maxWidth: '780px', margin: '0 auto 5rem', padding: '0 5%' }}>
        <Reveal>
          <p style={{ fontSize: '12px', fontWeight: 600, color: TEAL, letterSpacing: '0.1em', margin: '0 0 0.75rem' }}>/ FAQ</p>
          <h2 style={{ fontSize: '40px', fontWeight: 600, margin: '0 0 2rem', letterSpacing: '-1.5px' }}>Common questions.</h2>
        </Reveal>
        {faqs.map((faq, i) => (
          <Reveal key={i} delay={i * 40}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '8px' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: '100%', padding: '1.1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '1rem' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#fff', lineHeight: 1.4 }}>{faq.q}</span>
                <span style={{ color: TEAL, fontSize: '18px', flexShrink: 0, fontWeight: 300 }}>{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 1.5rem 1.1rem' }}>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.8 }}>{faq.a}</p>
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </section>

      {/* ── Footer CTA ── */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 4rem', padding: '0 5%' }}>
        <Reveal>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '20px', padding: '3.5rem 4rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '500px', height: '350px', background: 'radial-gradient(ellipse at top right, rgba(16,185,129,0.1) 0%, rgba(6,182,212,0.04) 40%, transparent 65%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '300px', height: '200px', background: 'radial-gradient(ellipse at bottom left, rgba(16,185,129,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />
            <p style={{ fontSize: '12px', fontWeight: 600, color: TEAL, letterSpacing: '0.1em', margin: '0 0 0.75rem', position: 'relative' }}>/ GET STARTED</p>
            <h2 style={{ fontSize: '40px', fontWeight: 600, margin: '0 0 1rem', letterSpacing: '-2px', lineHeight: 1.1, maxWidth: '500px', position: 'relative' }}>
              Stop scouring boards.<br />
              <span className="metallic">Start orchestrating offers.</span>
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.55)', margin: '0 0 2rem', lineHeight: 1.7, position: 'relative' }}>
              One free optimisation pass. No card, no signup.<br />Watch the feed sort itself the second you drop your resume.
            </p>
            <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
              <button onClick={() => setShowAuth(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '999px', background: TEAL, color: '#fff', border: 'none', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
                ⚡ Try it free →
              </button>
              <button style={{ padding: '12px 28px', borderRadius: '999px', background: 'transparent', color: 'rgba(255,255,255,0.55)', border: `1px solid ${BORDER}`, fontSize: '15px', cursor: 'pointer' }}>
                Read the PRD
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${BORDER}` }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>© 2026 Career Sage · enterprise edition</p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.12)', margin: 0, fontFamily: 'monospace' }}>v1.0 · build 0x7jfx</p>
      </footer>

{showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position: 'fixed', bottom: '2rem', right: '2rem',
            width: '44px', height: '44px',
            borderRadius: '999px',
            background: '#0f1a16',
            color: TEAL,
            fontSize: '18px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 0 1px rgba(16,185,129,0.15), 0 0 20px rgba(16,185,129,0.15)',
            zIndex: 99,
            padding: '1px',
            backgroundImage: 'linear-gradient(#0f1a16, #0f1a16), linear-gradient(135deg, rgba(16,185,129,0.8) 0%, rgba(6,182,212,0.4) 40%, rgba(16,185,129,0.6) 100%)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            border: '1px solid transparent',
          }}
        >
          ↑
        </button>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  )
}