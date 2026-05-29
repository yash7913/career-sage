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

const NAV_SECTIONS = [
  ['How it works', 'how-it-works'],
  ['Platform', 'platform'],
  ['Telemetry', 'telemetry'],
  ['Pricing', 'pricing'],
]

const jobCards = [
  { company: 'Google', location: 'Remote · India', title: 'Lead AI Product Manager', match: 94, salaryMin: '₹48L', salaryMax: '₹72L', skills: ['LLM', 'Vector DB', 'PM'], top: true, rounds: '4 rounds · 1 System Design' },
  { company: 'Razorpay', location: 'Hybrid · Bangalore', title: 'Senior Data Analyst', match: 89, salaryMin: '₹28L', salaryMax: '₹42L', skills: ['SQL', 'Python', 'dbt'], top: false, rounds: '3 rounds · 1 Case Study' },
  { company: 'Anthropic', location: 'Remote · US', title: 'Staff ML Engineer', match: 82, salaryMin: '$340K', salaryMax: '$520K', skills: ['RLHF', 'PyTorch', 'Distributed'], top: false, rounds: '5 rounds · 2 Technical' },
]

const modules = [
  { num: '01', title: 'Distributed ingest engine', desc: 'Continuous crawlers index LinkedIn, Naukri, Instahyre, and 250+ enterprise ATS — Greenhouse, Lever, Workday — on a 12-hour delta loop. Algorithmic deduplication merges cross-posted listings into a single canonical record.', detail: '250+ sources · 12-hr cycle · auto-dedup' },
  { num: '02', title: 'Unified profile graph', desc: 'Drag in resumes, project decks, markdown notes, slide decks — any format. We synthesise a single semantic profile with normalised skills, education timelines, and quantified impact metrics. Set up multiple career tracks from the same vault.', detail: 'PDF · DOCX · MD · Slides · < 4.5s parse' },
  { num: '03', title: 'Semantic match and rank', desc: 'Vector embeddings generated per career track rank every ingested role by affinity score. Weighted by skill intersection (40%), positional seniority alignment (30%), and past impact correlation (30%). Salary intel from Levels.fyi and interview telemetry surface per card.', detail: 'pgvector · text-embedding-3-small · 0–100% score' },
  { num: '04', title: 'Generative asset workspace', desc: 'Claude reads the full job description, maps it against your active career track, and rewrites your resume and cover letter in a live-streamed split pane. Every bullet stays grounded in your real experience. Custom direction matrix guides the output.', detail: '< 1.2s first token · prompt-file driven · version history' },
  { num: '05', title: 'Auto-synced pipeline tracker', desc: 'Downloading a tailored asset automatically registers a card in your Kanban board under Draft. Drag it through Applied, Interviewing, and Offer. Interview prep resources surface per card. No manual logging. No spreadsheets.', detail: 'Kanban + List view · < 60ms drag latency · auto-card' },
]

const steps = [
  { num: '01', title: 'Drop your portfolio', desc: 'Resumes, decks, project briefs — any format. We build your profile graph in under 4.5 seconds. Create separate career tracks for Analytics, PM, Engineering — all from the same uploaded documents.' },
  { num: '02', title: 'Discover ranked roles', desc: 'Wake up to a pre-sorted feed ranked by match score. Each card shows salary intel from Levels.fyi, interview round telemetry, and a skill-gap ledger so you know exactly what to close before you apply.' },
  { num: '03', title: 'Stream tailored assets', desc: 'Tweak the direction matrix, click generate, watch tokens stream in 1.2 seconds. Downloading triggers your tracker automatically. Resume and cover letter — both ready for submission.' },
]

const comparison = [
  { feature: 'Job discovery', sage: '250+ direct ATS portals + LinkedIn + Naukri, deduplicated into one ranked feed', others: 'Job board integrations only — no direct portal crawling', traditional: 'Manual search across multiple boards every single day' },
  { feature: 'Match scoring', sage: 'Weighted vector match per career track — skills 40%, seniority 30%, impact 30%', others: 'Basic keyword match against a single uploaded resume', traditional: 'You scroll and manually judge relevance yourself' },
  { feature: 'Salary data', sage: 'Live Levels.fyi ranges — base, equity, bonus — per role, per level', others: 'Broad market estimates, rarely role-specific', traditional: 'No data at all — research it entirely on your own' },
  { feature: 'Multi-track', sage: 'Analytics and PM tracks simultaneously from the same documents', others: 'Single profile for all applications', traditional: 'One CV sent everywhere, no customisation' },
  { feature: 'Resume gen', sage: 'Claude rewrites every bullet per JD, guided by your direction prompt', others: 'Template edits — same structure, swapped keywords', traditional: '2+ hours manually tailoring each application' },
  { feature: 'Interview prep', sage: 'Round breakdown and expected questions per role, per company', others: 'Generic tips, not role-specific', traditional: 'Glassdoor research on your own time, no structure' },
]

const faqs = [
  { q: 'How is this different from LinkedIn or Naukri?', a: 'Those platforms surface publicly listed roles. Career Sage also crawls 250+ company career pages directly — roles that never reach aggregators. Every role is then ranked against your specific track using vector embeddings, not just keyword filters.' },
  { q: 'What are career tracks and why do I need them?', a: 'A career track is a lens on your experience. Targeting Analytics and Product Management simultaneously? Each track emphasises different skills from the same uploaded documents, runs its own ranked feed, and generates track-specific resumes — without managing two separate accounts.' },
  { q: 'Where does the salary data come from?', a: 'Compensation ranges are pulled from Levels.fyi and mapped to the company, job title, and seniority level of each matched role. You see estimated base, equity, and bonus breakdowns inside the job card — before you apply.' },
  { q: 'How does the Academic tier work?', a: 'Sign in with a verified .edu or .ac.in email and Career Sage automatically assigns you the Academic tier — infinite generation cycles, profile vector analytics, and full platform access at no cost. No application or approval needed.' },
  { q: 'Can I control how the AI writes my resume?', a: 'Yes. Before every generation, type a custom direction — for example "prioritise my large-scale data pipeline work over generic delivery metrics." That constraint is injected directly into the Claude prompt so the output reflects your intent, not just the JD.' },
]

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [activeSection, setActiveSection] = useState('')

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    NAV_SECTIONS.forEach(([, id]) => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActiveSection(id) },
        { threshold: 0.3 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [])

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', overflowX: 'hidden' }}>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes shimmer {
          0% { background-position: -200% center }
          100% { background-position: 200% center }
        }
        .metallic {
          background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 20%, #94a3b8 45%, #cbd5e1 70%, #ffffff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 6s linear infinite;
        }
        .nav-fixed {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          padding: 14px 5%;
          background: rgba(13,17,23,0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .module-box {
          padding: 1.75rem 2rem;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          margin-bottom: 10px;
          background: rgba(22,27,34,0.8);
          transition: border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
          cursor: default;
        }
        .module-box:hover {
          border-color: rgba(16,185,129,0.55);
          background: rgba(16,185,129,0.05);
          box-shadow: 0 0 24px rgba(16,185,129,0.1);
        }
        .module-box:hover .module-title {
          color: #ffffff !important;
        }
        .module-box:hover .module-desc {
          color: rgba(255,255,255,0.65) !important;
        }
        .module-box:hover .module-detail {
          color: #10B981 !important;
        }
      `}</style>

      {/* ── Fixed pill navbar with active section tracking ── */}
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

        {/* Job card mockup with strong ambient glow */}
<Reveal delay={200}>
          <div style={{ position: 'relative', padding: '60px', margin: '-60px' }}>
            {/* Ambient glow layers — outside the card, unrestricted by overflow */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '100%', background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.28) 0%, rgba(6,182,212,0.12) 30%, rgba(16,185,129,0.05) 55%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
            <div style={{ position: 'absolute', top: '40%', left: '55%', transform: 'translate(-50%, -50%)', width: '80%', height: '80%', background: 'radial-gradient(ellipse at center, rgba(5,150,105,0.18) 0%, transparent 60%)', pointerEvents: 'none', zIndex: 0 }} />
            <div style={{
              position: 'relative', zIndex: 1,
              borderRadius: '16px', overflow: 'hidden',
              padding: '1px',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.8) 0%, rgba(6,182,212,0.4) 40%, rgba(16,185,129,0.1) 70%, rgba(6,182,212,0.6) 100%)',
            }}>
              <div style={{ background: CARD, borderRadius: '15px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF5F57' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FEBC2E' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28C840' }} />
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginLeft: '8px', fontFamily: 'monospace' }}>discovery.feed</span>
                </div>
		</div>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>sorted by match ↓</span>
              </div>
              {jobCards.map((job, i) => (
                <div key={job.title} style={{ padding: '1.1rem 1.25rem', borderBottom: i < jobCards.length - 1 ? `1px solid ${BORDER}` : 'none', background: i === 0 ? 'rgba(16,185,129,0.05)' : 'transparent', position: 'relative' }}>
                  {i === 0 && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '2px', background: TEAL }} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 3px' }}>
                        {job.company} · {job.location}
                      </p>
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
        </Reveal>
      </section>

      {/* ── Platform modules ── */}
      <section id="platform" style={{ maxWidth: '1200px', margin: '0 auto 6rem', padding: '0 5%' }}>
        <Reveal>
          <p style={{ fontSize: '12px', fontWeight: 600, color: TEAL, letterSpacing: '0.1em', margin: '0 0 1rem' }}>/ PLATFORM</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '44px', fontWeight: 600, margin: 0, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
              Five orchestrated modules.<br />
              <span className="metallic">One operating system.</span>
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: 0 }}>
              Every module is independently deployable, collectively orchestrated. From ingest to offer — no context switching, no scattered tabs.
            </p>
          </div>
        </Reveal>
        <div>
          {modules.map((m, i) => (
            <Reveal key={m.num} delay={i * 60}>
              <div className="module-box">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'flex-start' }}>
                  <div>
                    <p className="module-title" style={{ fontSize: '17px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', margin: '0 0 8px', letterSpacing: '-0.3px', transition: 'color 0.25s' }}>{m.title}</p>
                    <p className="module-desc" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.75, transition: 'color 0.25s' }}>{m.desc}</p>
                  </div>
                  <p className="module-detail" style={{ fontSize: '11px', color: 'rgba(16,185,129,0.6)', margin: 0, lineHeight: 1.7, textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0, paddingTop: '2px', transition: 'color 0.25s' }}>{m.detail}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ maxWidth: '1200px', margin: '0 auto 6rem', padding: '0 5%' }}>
        <Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'flex-start', marginBottom: '3rem' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: TEAL, letterSpacing: '0.1em', margin: '0 0 1rem' }}>/ HOW IT WORKS</p>
              <h2 style={{ fontSize: '44px', fontWeight: 600, margin: 0, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
                From scattered tabs<br />to <span style={{ color: TEAL }}>one continuous flow.</span>
              </h2>
            </div>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, alignSelf: 'center', margin: 0 }}>
              Three orchestrated steps replace the entire ritual of job hunting. Upload once, discover continuously, generate instantly.
            </p>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {steps.map((s, i) => (
            <Reveal key={s.num} delay={i * 80}>
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '2rem', height: '100%', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)`, opacity: 0.4 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '44px', fontWeight: 700, color: TEAL, letterSpacing: '-2px', lineHeight: 1, opacity: 0.7 }}>{s.num}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em' }}>STEP</span>
                </div>
                <p style={{ fontSize: '17px', fontWeight: 600, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.3px' }}>{s.title}</p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.75 }}>{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Telemetry ── */}
      <section id="telemetry" style={{ maxWidth: '1200px', margin: '0 auto 6rem', padding: '0 5%' }}>
        <Reveal>
          <p style={{ fontSize: '12px', fontWeight: 600, color: TEAL, letterSpacing: '0.1em', margin: '0 0 1rem' }}>/ GLOBAL TELEMETRY</p>
          <h2 style={{ fontSize: '44px', fontWeight: 600, margin: '0 0 3rem', letterSpacing: '-1.5px' }}>Live platform metrics.</h2>
        </Reveal>
        <Reveal delay={80}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: BORDER, border: `1px solid ${BORDER}`, borderRadius: '16px', overflow: 'hidden' }}>
            {[
              { value: '12,481', label: 'Roles scraped today', sub: 'Updated 4 min ago' },
              { value: '94%', label: 'Avg match score', sub: 'Across all active users' },
              { value: '1.2s', label: 'First token latency', sub: 'Resume generation SLA' },
              { value: '4.3s', label: 'Profile extraction', sub: 'Multi-file vault parse' },
            ].map((s) => (
              <div key={s.label} style={{ background: CARD, padding: '2rem 1.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: '34px', fontWeight: 700, color: TEAL, margin: '0 0 6px', letterSpacing: '-1.5px' }}>{s.value}</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', margin: '0 0 5px', fontWeight: 500 }}>{s.label}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Comparison ── */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 6rem', padding: '0 5%' }}>
        <Reveal>
          <p style={{ fontSize: '12px', fontWeight: 600, color: TEAL, letterSpacing: '0.1em', margin: '0 0 1rem' }}>/ THE DIFFERENCE</p>
          <h2 style={{ fontSize: '44px', fontWeight: 600, margin: '0 0 3rem', letterSpacing: '-1.5px' }}>Where Career Sage wins.</h2>
        </Reveal>
        <Reveal delay={80}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div />
            <div style={{ padding: '12px 16px', background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}`, borderRadius: '10px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: TEAL, margin: 0 }}>Career Sage</p>
            </div>
            <div style={{ padding: '12px 16px', background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.2)', borderRadius: '10px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(20,184,166,0.85)', margin: 0 }}>Other AI copilots</p>
            </div>
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: 0 }}>Traditional search</p>
            </div>
          </div>
        </Reveal>
        {comparison.map((row, i) => (
          <Reveal key={row.feature} delay={i * 50}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', margin: 0 }}>{row.feature}</p>
              </div>
              <div style={{ padding: '1rem 1.25rem', background: TEAL_DIM, border: `1px solid ${TEAL_BORDER}`, borderRadius: '10px', display: 'flex', gap: '8px' }}>
                <span style={{ color: TEAL, flexShrink: 0, fontSize: '13px' }}>✓</span>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.55 }}>{row.sage}</p>
              </div>
              <div style={{ padding: '1rem 1.25rem', background: 'rgba(20,184,166,0.04)', border: '1px solid rgba(20,184,166,0.15)', borderRadius: '10px', display: 'flex', gap: '8px' }}>
                <span style={{ color: 'rgba(20,184,166,0.7)', flexShrink: 0, fontSize: '13px' }}>~</span>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.55 }}>{row.others}</p>
              </div>
              <div style={{ padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', gap: '8px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0, fontSize: '13px' }}>✕</span>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.55 }}>{row.traditional}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ maxWidth: '1200px', margin: '0 auto 6rem', padding: '0 5%' }}>
        <Reveal>
          <p style={{ fontSize: '12px', fontWeight: 600, color: TEAL, letterSpacing: '0.1em', margin: '0 0 1rem' }}>/ PRICING</p>
          <h2 style={{ fontSize: '44px', fontWeight: 600, margin: '0 0 8px', letterSpacing: '-1.5px' }}>Access tiers, assigned on signup.</h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '15px', margin: '0 0 3rem' }}>No form, no approval. Your email determines your tier automatically.</p>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', alignItems: 'start' }}>

          {/* Free */}
          <Reveal delay={0}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '2rem' }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: '0 0 12px' }}>Free</p>
              <p style={{ fontSize: '38px', fontWeight: 700, color: '#fff', margin: '0 0 4px', letterSpacing: '-1.5px' }}>₹0</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '0 0 1.5rem' }}>Anonymous + general accounts</p>
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                {['1 free trial pass (no signup)', '2 optimisations / 30 days', 'Full discovery feed access', '1 career track', 'Kanban pipeline tracker'].map(f => (
                  <div key={f} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ color: TEAL, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowAuth(true)} style={{ width: '100%', padding: '11px', borderRadius: '10px', background: 'transparent', color: 'rgba(255,255,255,0.8)', border: `1px solid ${BORDER}`, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                Get started
              </button>
            </div>
          </Reveal>

          {/* Academic — elevated center */}
          <Reveal delay={80}>
            <div style={{ background: CARD, border: `2px solid ${TEAL}`, borderRadius: '16px', padding: '2rem', marginTop: '-14px', position: 'relative', overflow: 'hidden', boxShadow: `0 0 60px rgba(16,185,129,0.12)` }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)` }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '150%', height: '150%', background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: 0 }}>Academic</p>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: TEAL, color: '#fff', letterSpacing: '0.05em' }}>UNLIMITED</span>
                </div>
                <p style={{ fontSize: '38px', fontWeight: 700, color: TEAL, margin: '0 0 4px', letterSpacing: '-1.5px' }}>Free</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '0 0 1.5rem' }}>.edu / .ac.in domains auto-detected</p>
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                  {['Infinite generation cycles', 'Profile vector analytics', 'Priority match queue', 'Unlimited career tracks', 'Interview prep portals', 'Emerald verified badge'].map(f => (
                    <div key={f} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ color: TEAL, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowAuth(true)} style={{ width: '100%', padding: '11px', borderRadius: '10px', background: TEAL, color: '#fff', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                  Verify .edu
                </button>
              </div>
            </div>
          </Reveal>

          {/* Professional — with ambient glow */}
          <Reveal delay={160}>
<div style={{ background: CARD, border: `2px solid ${TEAL}`, borderRadius: '16px', padding: '2rem', marginTop: '-14px', position: 'relative', overflow: 'hidden', boxShadow: `0 0 60px rgba(16,185,129,0.12)` }}>
              {/* Glow sits outside the card boundary */}
              <div style={{ position: 'absolute', bottom: '-40px', right: '-40px', width: '280px', height: '280px', background: 'radial-gradient(ellipse at bottom right, rgba(16,185,129,0.18) 0%, rgba(6,182,212,0.08) 40%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
              <div style={{ position: 'absolute', top: '-30px', left: '-30px', width: '200px', height: '200px', background: 'radial-gradient(ellipse at top left, rgba(6,182,212,0.1) 0%, transparent 60%)', pointerEvents: 'none', zIndex: 0 }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', margin: '0 0 12px' }}>Professional</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                  <p style={{ fontSize: '38px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-1.5px' }}>₹999</p>
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)' }}>/mo</span>
		</div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '0 0 1.5rem' }}>Per month, billed monthly</p>
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                  {['Unmetered tailoring loops', 'Deep profile dashboards', 'Historical data ledger', 'Mock interview portals', 'Levels.fyi salary benchmarks', 'Resume version history'].map(f => (
                    <div key={f} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ color: TEAL, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowAuth(true)} style={{ width: '100%', padding: '11px', borderRadius: '10px', background: 'transparent', color: 'rgba(255,255,255,0.8)', border: `1px solid rgba(16,185,129,0.3)`, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                  Get started
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faqs" style={{ maxWidth: '800px', margin: '0 auto 6rem', padding: '0 5%' }}>
        <Reveal>
          <p style={{ fontSize: '12px', fontWeight: 600, color: TEAL, letterSpacing: '0.1em', margin: '0 0 1rem' }}>/ FAQ</p>
          <h2 style={{ fontSize: '44px', fontWeight: 600, margin: '0 0 3rem', letterSpacing: '-1.5px' }}>Common questions.</h2>
        </Reveal>
        {faqs.map((faq, i) => (
          <Reveal key={i} delay={i * 40}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '8px' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: '100%', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '1rem' }}>
                <span style={{ fontSize: '15px', fontWeight: 500, color: '#fff', lineHeight: 1.4 }}>{faq.q}</span>
                <span style={{ color: TEAL, fontSize: '20px', flexShrink: 0, fontWeight: 300 }}>{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 1.5rem 1.25rem' }}>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.8 }}>{faq.a}</p>
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </section>

      {/* ── Footer CTA ── */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 4rem', padding: '0 5%' }}>
        <Reveal>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '20px', padding: '4rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '600px', height: '400px', background: 'radial-gradient(ellipse at top right, rgba(16,185,129,0.12) 0%, rgba(6,182,212,0.05) 40%, transparent 65%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '300px', height: '200px', background: 'radial-gradient(ellipse at bottom left, rgba(16,185,129,0.06) 0%, transparent 65%)', pointerEvents: 'none' }} />
            <p style={{ fontSize: '12px', fontWeight: 600, color: TEAL, letterSpacing: '0.1em', margin: '0 0 1rem', position: 'relative' }}>/ GET STARTED</p>
            <h2 style={{ fontSize: '44px', fontWeight: 600, margin: '0 0 1rem', letterSpacing: '-2px', lineHeight: 1.1, maxWidth: '520px', position: 'relative' }}>
              Stop scouring boards.<br />
              <span className="metallic">Start orchestrating offers.</span>
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', margin: '0 0 2rem', lineHeight: 1.7, position: 'relative' }}>
              One free optimisation pass. No card, no signup.<br />Watch the feed sort itself the second you drop your resume.
            </p>
            <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
              <button onClick={() => setShowAuth(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '999px', background: TEAL, color: '#fff', border: 'none', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
                ⚡ Try it free →
              </button>
              <button style={{ padding: '12px 28px', borderRadius: '999px', background: 'transparent', color: 'rgba(255,255,255,0.6)', border: `1px solid ${BORDER}`, fontSize: '15px', cursor: 'pointer' }}>
                Read the PRD
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${BORDER}` }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>© 2026 Career Sage · enterprise edition</p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.15)', margin: 0, fontFamily: 'monospace' }}>v1.0 · build 0x7jfx</p>
      </footer>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  )
}