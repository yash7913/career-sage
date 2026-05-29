'use client'
import { useState } from 'react'
import AuthModal from './auth-modal'

export default function Navbar() {
  const [showAuth, setShowAuth] = useState(false)

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        padding: '0 2rem',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: '60px'
      }}>
        <span style={{ fontSize: '18px', fontWeight: 500, color: '#fff' }}>
          Career Sage
        </span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="#features" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Features</a>
          <a href="#pricing" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Pricing</a>
          <button
            onClick={() => setShowAuth(true)}
            style={{
              fontSize: '14px', fontWeight: 500,
              padding: '8px 20px', borderRadius: '8px',
              background: '#7F77DD', color: '#fff',
              border: 'none', cursor: 'pointer'
            }}>
            Sign in
          </button>
        </div>
      </nav>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}