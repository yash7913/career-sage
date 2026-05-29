'use client'

export default function PaywallModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#13131a', border: '0.5px solid rgba(255,255,255,0.12)',
        borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '420px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          background: 'rgba(127,119,221,0.15)', margin: '0 auto 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px'
        }}>🔒</div>
        <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, margin: '0 0 8px' }}>
          Generation limit reached
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
          You've used your 2 free generations this month. Upgrade to Pro for unlimited resume and cover letter generation.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button style={{
            padding: '12px', borderRadius: '8px',
            background: '#7F77DD', color: '#fff',
            border: 'none', fontSize: '15px', fontWeight: 500, cursor: 'pointer'
          }}>
            Upgrade to Pro — ₹999/mo
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px', borderRadius: '8px',
              background: 'transparent', color: 'rgba(255,255,255,0.4)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              fontSize: '14px', cursor: 'pointer'
            }}>
            Maybe later
          </button>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', margin: '1rem 0 0' }}>
          Student with a .edu or .ac.in email? Sign in to unlock unlimited access free.
        </p>
      </div>
    </div>
  )
}