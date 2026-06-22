'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

const TAG_LABELS: Record<string, string> = {
  RESUME: 'Resume',
  LINKEDIN_EXPORT: 'LinkedIn Export',
  PROJECT_DETAIL: 'Project',
  SLIDES: 'Slides',
  CERTIFICATION: 'Certification',
  OTHER: 'Other',
}

interface Document {
  doc_id: string
  file_name: string
  doc_tag: string
  is_active: boolean
  created_at: string
}

export default function DocumentManager({ userId, refreshKey, onDelete }: { userId: string; refreshKey?: number; onDelete?: () => void }) {
  const [docs, setDocs]       = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/documents/${userId}`)
      .then(r => r.json())
      .then(data => setDocs(data.documents || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId, refreshKey])

  const handleToggle = async (docId: string, currentActive: boolean) => {
    setToggling(docId)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/documents/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          doc_id: docId,
          is_active: !currentActive,
        }),
      })
      if (res.ok) {
        setDocs(prev => prev.map(d =>
          d.doc_id === docId ? { ...d, is_active: !currentActive } : d
        ))
      }
    } catch {}
    setToggling(null)
  }

  const handleDelete = async (docId: string, fileName: string) => {
    if (!confirm(`Permanently delete "${fileName}"? This cannot be undone.`)) return
    setToggling(docId)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/documents/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          doc_id: docId,
          storage_path: '',
        }),
      })
      if (res.ok) {
        setDocs(prev => prev.filter(d => d.doc_id !== docId))
        onDelete?.()
      }
    } catch {}
    setToggling(null)
  }

  if (loading) return (
    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Loading documents...</p>
  )

  if (!docs.length) return (
    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>No documents uploaded yet.</p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {docs.map(doc => (
        <div key={doc.doc_id} style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '10px 14px', borderRadius: '10px',
          background: doc.is_active ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
          border: `1px solid ${doc.is_active ? BORDER : 'rgba(255,255,255,0.04)'}`,
          opacity: doc.is_active ? 1 : 0.5,
          transition: 'all 0.2s',
        }}>
          {/* File icon */}
          <span style={{ fontSize: '18px', flexShrink: 0 }}>
            {doc.doc_tag === 'LINKEDIN_EXPORT' ? '🔗' :
             doc.doc_tag === 'RESUME' ? '📄' :
             doc.doc_tag === 'CERTIFICATION' ? '🏆' : '📁'}
          </span>

          {/* File info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: '13px', fontWeight: 500,
              color: doc.is_active ? '#fff' : 'rgba(255,255,255,0.4)',
              margin: '0 0 2px', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {doc.file_name}
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{
                fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px',
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
              }}>
                {TAG_LABELS[doc.doc_tag] || doc.doc_tag}
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
                {new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Status + toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <span style={{
              fontSize: '10px', fontWeight: 600,
              color: doc.is_active ? TEAL : 'rgba(255,255,255,0.25)',
            }}>
              {doc.is_active ? 'Active' : 'Ignored'}
            </span>
            <button
              onClick={() => handleToggle(doc.doc_id, doc.is_active)}
              disabled={toggling === doc.doc_id}
              style={{
                padding: '5px 12px', borderRadius: '6px', cursor: 'pointer',
                background: doc.is_active ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                border: `1px solid ${doc.is_active ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                color: doc.is_active ? '#EF4444' : TEAL,
                fontSize: '11px', fontWeight: 600,
              }}
            >
              {toggling === doc.doc_id ? '...' : doc.is_active ? 'Ignore' : 'Restore'}
            </button>

            <button
              onClick={() => handleDelete(doc.doc_id, doc.file_name)}
              disabled={toggling === doc.doc_id}
              style={{
                padding: '5px 8px', borderRadius: '6px', cursor: 'pointer',
                background: 'transparent',
                border: `1px solid rgba(255,255,255,0.06)`,
                color: 'rgba(255,255,255,0.2)',
                fontSize: '11px',
              }}
              title="Permanently delete"
            >
              🗑
            </button>
          </div>
        </div>
      ))}

      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: '4px 0 0', lineHeight: 1.5 }}>
        Ignored files are excluded from future profile extractions. Skills already extracted remain on your profile.
      </p>
    </div>
  )
}