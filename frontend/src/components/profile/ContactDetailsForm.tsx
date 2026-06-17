'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

export default function ContactDetailsForm({ userId }: { userId: string }) {
  const [fullName, setFullName]       = useState('')
  const [phone, setPhone]             = useState('')
  const [location, setLocation]       = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  // LinkedIn import states
  const [importStatus, setImportStatus] = useState<'idle' | 'pasting' | 'parsing' | 'done' | 'error'>('idle')
  const [pastedText, setPastedText]     = useState('')
  const [importMessage, setImportMessage] = useState('')
  const [urlFoundInResume, setUrlFoundInResume] = useState(false)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/${userId}`)
      .then(r => r.json())
      .then(data => {
        setFullName(data.full_name || '')
        setPhone(data.phone || '')
        setLocation(data.location || '')
        setLinkedinUrl(data.linkedin_url || '')
        if (data.linkedin_url) setUrlFoundInResume(true)
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

  const handleImportPaste = async () => {
    if (!pastedText.trim()) return
    setImportStatus('parsing')
    setImportMessage('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/import-linkedin-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          linkedin_text: pastedText,
          linkedin_url: linkedinUrl,
        }),
      })
      const data = await res.json()
      if (data.status === 'ok') {
        setImportStatus('done')
        setImportMessage(`Imported — ${data.skills_added} skills added, ${data.roles_found} roles found`)
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setImportStatus('error')
        setImportMessage(data.detail || 'Import failed. Try again.')
      }
    } catch {
      setImportStatus('error')
      setImportMessage('Import failed. Check your connection.')
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
          {urlFoundInResume && linkedinUrl && (
            <p style={{ fontSize: '10px', color: TEAL, margin: '0 0 4px', fontWeight: 600 }}>
              ✓ Found in resume
            </p>
          )}
          <input value={linkedinUrl} onChange={e => { setLinkedinUrl(e.target.value); setUrlFoundInResume(false) }}
            placeholder="linkedin.com/in/yourprofile" style={inputStyle} />
        </div>
      </div>

      {/* LinkedIn import section */}
      <div style={{
        margin: '0 0 14px',
        padding: '14px',
        borderRadius: '10px',
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${BORDER}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Import from LinkedIn
          </p>
          {importStatus === 'idle' && (
            <button
              onClick={() => setImportStatus('pasting')}
              style={{
                fontSize: '11px', padding: '4px 12px', borderRadius: '6px',
                background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`,
                color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 600,
              }}
            >
              Upload LinkedIn PDF
            </button>
          )}
          {importStatus === 'done' && (
            <span style={{ fontSize: '11px', color: TEAL, fontWeight: 600 }}>✓ Done</span>
          )}
        </div>

        {importStatus === 'idle' && (
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0, lineHeight: 1.5 }}>
            Go to your LinkedIn profile → select all text (Ctrl+A) → copy (Ctrl+C) → paste below.
            Career Sage will extract your work history, skills, and education automatically.
          </p>
        )}

        {importStatus === 'pasting' && (
          <div>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)', border: `1px dashed rgba(255,255,255,0.15)`,
              color: 'rgba(255,255,255,0.5)', fontSize: '12px',
            }}>
              <span style={{ fontSize: '20px' }}>📄</span>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                  Upload LinkedIn PDF export
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                  On LinkedIn: click <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Me</strong> (top right)
                  → <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Settings & Privacy</strong>
                  → <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Data Privacy</strong>
                  → <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Get a copy of your data</strong>
                  → <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Want something in particular?</strong>
                  → tick <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Profile</strong>
                  → <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Request archive</strong>.
                  Usually ready in under a minute.
                </p>
              </div>
              <input
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setImportStatus('parsing')
                  const formData = new FormData()
                  formData.append('file', file)
                  formData.append('user_id', userId)
                  if (linkedinUrl) formData.append('linkedin_url', linkedinUrl)
                  try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/import-linkedin-pdf`, {
                      method: 'POST',
                      body: formData,
                    })
                    const data = await res.json()
                    if (data.status === 'ok') {
                      setImportStatus('done')
                      setImportMessage(`Imported — ${data.skills_added} skills added, ${data.roles_found} roles found`)
                      setTimeout(() => window.location.reload(), 2000)
                    } else {
                      setImportStatus('error')
                      setImportMessage(data.detail || 'Import failed. Try again.')
                    }
                  } catch {
                    setImportStatus('error')
                    setImportMessage('Import failed. Check your connection.')
                  }
                }}
              />
            </label>
            <button
              onClick={() => setImportStatus('idle')}
              style={{
                marginTop: '8px', padding: '6px 14px', borderRadius: '7px',
                background: 'transparent', border: `1px solid ${BORDER}`,
                color: 'rgba(255,255,255,0.3)', fontSize: '12px', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {importStatus === 'parsing' && (
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            ⏳ Parsing your LinkedIn profile...
          </p>
        )}

        {importMessage && (
          <p style={{
            fontSize: '11px', margin: '8px 0 0',
            color: importStatus === 'done' ? TEAL : '#EF4444',
          }}>
            {importMessage}
          </p>
        )}
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