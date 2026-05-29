import Navbar from '@/components/ui/navbar'

const features = [
  { icon: '⚡', title: 'Zero-effort discovery', desc: 'AI-ranked jobs matched to your profile from LinkedIn, Naukri, and 250+ company career pages.' },
  { icon: '🎯', title: 'Multi-track profiles', desc: 'Apply as an Analytics lead and a PM simultaneously — separate feeds, separate resumes.' },
  { icon: '📄', title: 'Instant resume generation', desc: 'Claude rewrites your resume for every job in seconds, streamed live as you watch.' },
  { icon: '📋', title: 'Pipeline tracker', desc: 'Kanban board auto-updates the moment you download a tailored resume. No manual logging.' },
]

const tiers = [
  { name: 'Free', price: '₹0', desc: '2 generation runs per month', features: ['1 career track', 'Ranked job feed', '2 resume generations', 'Kanban tracker'], highlight: false },
  { name: 'Student', price: '₹0', desc: 'Verified .edu or .ac.in email', features: ['Unlimited tracks', 'Unlimited generations', 'All features unlocked', 'Emerald tier badge'], highlight: true },
  { name: 'Pro', price: '₹999/mo', desc: 'Full platform access', features: ['Unlimited tracks', 'Unlimited generations', 'Deep analytics dashboard', 'Priority support'], highlight: false },
]

export default function LandingPage() {
  return (
    <main style={{ background: '#0a0a0f', minHeight: '100vh', color: '#fff' }}>
      <Navbar />

      {/* Hero */}
      <section style={{ maxWidth: '800px', margin: '0 auto', padding: '7rem 2rem 5rem', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block', fontSize: '12px', fontWeight: 500,
          padding: '4px 12px', borderRadius: '20px', marginBottom: '1.5rem',
          background: 'rgba(127,119,221,0.15)', color: '#AFA9EC',
          border: '0.5px solid rgba(127,119,221,0.3)'
        }}>
          AI-powered job search — built for serious candidates
        </div>
        <h1 style={{ fontSize: '56px', fontWeight: 500, lineHeight: 1.15, margin: '0 0 1.5rem', letterSpacing: '-1px' }}>
          Your career,<br />
          <span style={{ color: '#7F77DD' }}>orchestrated by AI</span>
        </h1>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 0 2.5rem', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
          Discover matched jobs, generate tailored resumes, and track your pipeline — all from one command center.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            id="hero-cta"
            onClick={() => document.getElementById('auth-trigger')?.click()}
            style={{
              padding: '14px 32px', borderRadius: '8px',
              background: '#7F77DD', color: '#fff',
              border: 'none', fontSize: '16px', fontWeight: 500, cursor: 'pointer'
            }}>
            Get started free
          </button>
          <a href="#features" style={{
            padding: '14px 32px', borderRadius: '8px',
            background: 'transparent', color: 'rgba(255,255,255,0.7)',
            border: '0.5px solid rgba(255,255,255,0.15)', fontSize: '16px',
            textDecoration: 'none', display: 'inline-block'
          }}>
            See how it works
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 2rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '32px', fontWeight: 500, margin: '0 0 3rem', color: '#fff' }}>
          Everything you need, nothing you don't
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {features.map((f) => (
            <div key={f.title} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: '12px', padding: '1.5rem'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>{f.icon}</div>
              <p style={{ fontSize: '15px', fontWeight: 500, color: '#fff', margin: '0 0 8px' }}>{f.title}</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 2rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '32px', fontWeight: 500, margin: '0 0 3rem', color: '#fff' }}>
          Simple pricing
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {tiers.map((t) => (
            <div key={t.name} style={{
              background: t.highlight ? 'rgba(127,119,221,0.08)' : 'rgba(255,255,255,0.03)',
              border: t.highlight ? '2px solid rgba(127,119,221,0.5)' : '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: '12px', padding: '1.5rem'
            }}>
              {t.highlight && (
                <div style={{
                  fontSize: '11px', fontWeight: 500, padding: '3px 10px',
                  borderRadius: '20px', background: 'rgba(127,119,221,0.2)',
                  color: '#AFA9EC', display: 'inline-block', marginBottom: '12px'
                }}>Student verified</div>
              )}
              <p style={{ fontSize: '18px', fontWeight: 500, color: '#fff', margin: '0 0 4px' }}>{t.name}</p>
              <p style={{ fontSize: '24px', fontWeight: 500, color: '#7F77DD', margin: '0 0 4px' }}>{t.price}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 1.5rem' }}>{t.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {t.features.map((feat) => (
                  <li key={feat} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', padding: '4px 0', display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#5DCAA5' }}>✓</span> {feat}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', margin: 0 }}>
          © 2026 Career Sage. Built for serious job seekers.
        </p>
      </footer>
    </main>
  )
}