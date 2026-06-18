'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface Project {
  project_id: string
  title: string
  description: string | null
  outcomes: string | null
  tech_stack: string[]
  doc_id: string | null
  created_at: string
}

export default function ProjectManager({ userId }: { userId: string }) {
  const [projects, setProjects]   = useState<Project[]>([])
  const [loading, setLoading]     = useState(true)
  const [adding, setAdding]       = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)

  // New project form
  const [newTitle,      setNewTitle]      = useState('')
  const [newDesc,       setNewDesc]       = useState('')
  const [newOutcomes,   setNewOutcomes]   = useState('')
  const [newTechStack,  setNewTechStack]  = useState('')

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/projects/${userId}`)
      .then(r => r.json())
      .then(data => setProjects(data.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:    userId,
          title:      newTitle.trim(),
          description: newDesc.trim() || null,
          outcomes:   newOutcomes.trim() || null,
          tech_stack: newTechStack ? newTechStack.split(',').map(s => s.trim()).filter(Boolean) : [],
        }),
      })
      const data = await res.json()
      if (data.project) {
        setProjects(prev => [data.project, ...prev])
        setNewTitle(''); setNewDesc(''); setNewOutcomes(''); setNewTechStack('')
        setAdding(false)
      }
    } catch {}
    setSaving(false)
  }

  const handleDelete = async (projectId: string) => {
    if (!confirm('Delete this project?')) return
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/projects/${projectId}`, {
        method: 'DELETE',
      })
      setProjects(prev => prev.filter(p => p.project_id !== projectId))
    } catch {}
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: '8px',
    background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
    color: '#fff', fontSize: '13px', outline: 'none',
    fontFamily: 'system-ui', boxSizing: 'border-box' as const,
  }

  if (loading) return <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Loading projects...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {projects.length === 0 && !adding && (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
          No projects yet. Upload a PRD or case study above, or add one manually.
        </p>
      )}

      {/* Project cards */}
      {projects.map(p => (
        <div key={p.project_id} style={{
          padding: '12px 14px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>
                {p.title}
              </p>
              {p.description && (
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px', lineHeight: 1.5 }}>
                  {p.description}
                </p>
              )}
              {p.outcomes && (
                <p style={{ fontSize: '12px', color: TEAL, margin: '0 0 6px', lineHeight: 1.5 }}>
                  → {p.outcomes}
                </p>
              )}
              {p.tech_stack?.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {p.tech_stack.map(t => (
                    <span key={t} style={{
                      fontSize: '10px', padding: '1px 7px', borderRadius: '4px',
                      background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
                    }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => handleDelete(p.project_id)}
              style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)',
                cursor: 'pointer', fontSize: '14px', flexShrink: 0, padding: '2px',
              }}
              title="Delete project"
            >
              🗑
            </button>
          </div>
        </div>
      ))}

      {/* Add project form */}
      {adding && (
        <div style={{
          padding: '14px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
            placeholder="Project title *" style={inputStyle} />
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
            placeholder="What was this project? (optional)" rows={2}
            style={{ ...inputStyle, resize: 'vertical' }} />
          <textarea value={newOutcomes} onChange={e => setNewOutcomes(e.target.value)}
            placeholder="Key outcomes and metrics (optional)" rows={2}
            style={{ ...inputStyle, resize: 'vertical' }} />
          <input value={newTechStack} onChange={e => setNewTechStack(e.target.value)}
            placeholder="Tech stack — comma separated (optional)" style={inputStyle} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleAdd} disabled={!newTitle.trim() || saving} style={{
              padding: '8px 16px', borderRadius: '8px',
              background: newTitle.trim() ? TEAL : 'rgba(255,255,255,0.06)',
              color: newTitle.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
              border: 'none', fontSize: '12px', fontWeight: 600,
              cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
            }}>
              {saving ? 'Saving...' : 'Save project'}
            </button>
            <button onClick={() => { setAdding(false); setNewTitle(''); setNewDesc(''); setNewOutcomes(''); setNewTechStack('') }}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                background: 'transparent', border: `1px solid ${BORDER}`,
                color: 'rgba(255,255,255,0.3)', fontSize: '12px', cursor: 'pointer',
              }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add button */}
      {!adding && (
        <button onClick={() => setAdding(true)} style={{
          padding: '8px 14px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`,
          color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer',
          textAlign: 'left',
        }}>
          + Add project manually
        </button>
      )}

      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: 0, lineHeight: 1.5 }}>
        Projects are used during resume generation to match relevant work to each job application.
      </p>
    </div>
  )
}