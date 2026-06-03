'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

export default function ContactDetailsForm({ userId }: { userId: string }) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/${userId}`)
      .then(r => r.json())
      .then(data => {
        setFullName(data.full_name || '')
        setPhone(data.phone || '')
        setLocation(data.location || '')
        setLinkedinUrl(data.linkedin_url || '')
      })
      .catch(() => {})
  }, [userId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/contact`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          full_name: fullName,
          phone,
          location,
          linkedin_url: linkedinUrl,
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
    fontFamily: 'system-ui, sans-serif',
  }

  const labelStyle = {
    fontSize: '11px', color: 'rgba(255,255,255,0.4)',
    display: 'block' as const, marginBottom: '5px',
    fontWeight: 600, letterSpacing: '0.05em',
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={labelStyle}>FULL NAME</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)}
            placeholder="Yashwanth Pasupula" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>PHONE</label>
          <input value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+91 98765 43210" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>LOCATION</label>
          <input value={location} onChange={e => setLocation(e.target.value)}
            placeholder="Hyderabad, India" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>LINKEDIN URL</label>
          <input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)}
            placeholder="linkedin.com/in/yourprofile" style={inputStyle} />
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: '9px 20px', borderRadius: '8px',
          background: saved ? 'rgba(16,185,129,0.3)' : TEAL,
          color: '#fff', border: 'none',
          fontSize: '13px', fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save contact details'}
      </button>
    </div>
  )
}