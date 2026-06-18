'use client'
import { useState, useEffect } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

interface Project {
  project_id: string
  title: string
  description: string | null
  outcomes: string | null
  tech_stack: string[]
  doc_ids: string[]
  links: { label: string; url: string }[]
  synthesized_summary: string | null
  include_in_resume: boolean
  created_at: string
}

interface VaultDoc {
  doc_id: string
  file_name: string
  doc_tag: string
}

export default function ProjectManager({ userId }: { userId: string }) {
  const [projects, setProjects]     = useState<Project[]>([])
  const [vaultDocs, setVaultDocs]   = useState<VaultDoc[]>([])
  const [loading, setLoading]       = useState(true)
  const [adding, setAdding]         = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const [synthesizing, setSynthesizing] = useState<string | null>(null)

  // New project form
  const [newTitle,     setNewTitle]     = useState('')
  const [newDesc,      setNewDesc]      = useState('')
  const [newOutcomes,  setNewOutcomes]  = useState('')
  const [newTechStack, setNewTechStack] = useState('')
  const [newDocIds,    setNewDocIds]    = useState<string[]>([])
  const [newLinks,     setNewLinks]     = useState<{ label: string; url: string }[]>([])
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const [newLinkUrl,   setNewLinkUrl]   = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/projects/${userId}`)
        .then(r => r.json()).then(d => setProjects(d.projects || [])),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/documents/${userId}`)
        .then(r => r.json()).then(d => setVaultDocs(d.documents || [])),
    ]).finally(() => setLoading(false))
  }, [userId])

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:     userId,
          title:       newTitle.trim(),
          description: newDesc.trim() || null,
          outcomes:    newOutcomes.trim() || null,
          tech_stack:  newTechStack ? newTechStack.split(',').map(s => s.trim()).filter(Boolean) : [],
          doc_ids:     newDocIds,
          links:       newLinks,
        }),
      })
      const data = await res.json()
      if (data.project) {
        setProjects(prev => [data.project, ...prev])
        setNewTitle(''); setNewDesc(''); setNewOutcomes('')
        setNewTechStack(''); setNewDocIds([]); setNewLinks([])
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

  const handleSynthesize = async (projectId: string) => {
    setSynthesizing(projectId)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile/projects/${projectId}/synthesize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, project_id: projectId }),
        }
      )
      const data = await res.json()
      if (data.result?.summary) {
        setProjects(prev => prev.map(p =>
          p.project_id === projectId
            ? { ...p, synthesized_summary: data.result.summary }
            : p
        ))
      }
    } catch {}
    setSynthesizing(null)
  }

  const handleToggleResume = async (projectId: string, current: boolean) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile/projects/${projectId}/toggle-resume`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, project_id: projectId }),
        }
      )
      setProjects(prev => prev.map(p =>
        p.project_id === projectId ? { ...p, include_in_resume: !current } : p
      ))
    } catch {}
  }

  const addLink = () => {
    if (!newLinkUrl.trim()) return
    setNewLinks(prev => [...prev, { label: newLinkLabel || newLinkUrl, url: newLinkUrl }])
    setNewLinkLabel(''); setNewLinkUrl('')
  }

  const toggleDoc = (docId: string) => {
    setNewDocIds(prev =>
      prev.includes(docId) ? prev.filter(d => d !== docId) : [...prev, docId]
    )
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: '8px',
    background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
    color: '#fff', fontSize: '13px', outline: 'none',
    fontFamily: 'system-ui', boxSizing: 'border-box' as const,
  }

  const Label = ({ text }: { text: string }) => (
    <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 6px' }}>{text}</p>
  )

  if (loading) return <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Loading projects...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {projects.length === 0 && !adding && (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
          No projects yet. Upload a PRD or case study in the vault, or add one manually.
        </p>
      )}

      {/* Project cards */}
      {projects.map(p => (
        <div key={p.project_id} style={{
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.02)',
          border: `1px solid ${expandedId === p.project_id ? 'rgba(16,185,129,0.2)' : BORDER}`,
          overflow: 'hidden',
          transition: 'border 0.15s',
        }}>
          {/* Card header */}
          <div style={{
            padding: '12px 14px', display: 'flex',
            alignItems: 'center', gap: '10px', cursor: 'pointer',
          }} onClick={() => setExpandedId(expandedId === p.project_id ? null : p.project_id)}>

            {/* Resume toggle */}
            <div
              onClick={e => { e.stopPropagation(); handleToggleResume(p.project_id, p.include_in_resume) }}
              title={p.include_in_resume ? 'Included in resume — click to exclude' : 'Excluded from resume — click to include'}
              style={{
                width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0,
                background: p.include_in_resume ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${p.include_in_resume ? 'rgba(16,185,129,0.4)' : BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', cursor: 'pointer',
              }}
            >
              {p.include_in_resume ? '✓' : ''}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.title}
              </p>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                {p.tech_stack?.slice(0, 3).map(t => (
                  <span key={t} style={{
                    fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
                  }}>{t}</span>
                ))}
                {(p.tech_stack?.length || 0) > 3 && (
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
                    +{p.tech_stack.length - 3} more
                  </span>
                )}
                {p.doc_ids?.length > 0 && (
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
                    📎 {p.doc_ids.length} doc{p.doc_ids.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
              {!p.synthesized_summary && (
                <button
                  onClick={e => { e.stopPropagation(); handleSynthesize(p.project_id) }}
                  disabled={synthesizing === p.project_id}
                  style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                    color: TEAL, cursor: 'pointer',
                  }}
                >
                  {synthesizing === p.project_id ? '...' : '✨ Synthesise'}
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); handleDelete(p.project_id) }}
                style={{
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)',
                  cursor: 'pointer', fontSize: '14px', padding: '2px',
                }}
              >🗑</button>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>
                {expandedId === p.project_id ? '▴' : '▾'}
              </span>
            </div>
          </div>

          {/* Expanded content */}
          {expandedId === p.project_id && (
            <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${BORDER}` }}>

              {/* Synthesized summary */}
              {p.synthesized_summary && (
                <div style={{
                  padding: '10px 12px', borderRadius: '8px', margin: '12px 0',
                  background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
                }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: TEAL, margin: '0 0 4px', letterSpacing: '0.07em' }}>
                    ✨ AI SUMMARY
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.6 }}>
                    {p.synthesized_summary}
                  </p>
                  <button
                    onClick={() => handleSynthesize(p.project_id)}
                    disabled={synthesizing === p.project_id}
                    style={{
                      marginTop: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.3)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    }}
                  >
                    {synthesizing === p.project_id ? 'Regenerating...' : 'Regenerate →'}
                  </button>
                </div>
              )}

              {p.description && (
                <div style={{ marginTop: '10px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.07em', margin: '0 0 4px' }}>DESCRIPTION</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>{p.description}</p>
                </div>
              )}

              {p.outcomes && (
                <div style={{ marginTop: '10px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.07em', margin: '0 0 4px' }}>OUTCOMES</p>
                  <p style={{ fontSize: '12px', color: TEAL, margin: 0, lineHeight: 1.6 }}>→ {p.outcomes}</p>
                </div>
              )}

              {p.links?.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.07em', margin: '0 0 6px' }}>LINKS</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {p.links.map((l, i) => (
                      <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{
                        fontSize: '11px', padding: '3px 10px', borderRadius: '6px',
                        background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
                        color: 'rgba(255,255,255,0.5)', textDecoration: 'none',
                      }}>
                        🔗 {l.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {p.doc_ids?.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.07em', margin: '0 0 6px' }}>ATTACHED DOCUMENTS</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {p.doc_ids.map(docId => {
                      const doc = vaultDocs.find(d => d.doc_id === docId)
                      return doc ? (
                        <p key={docId} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                          📄 {doc.file_name}
                        </p>
                      ) : null
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                <div
                  onClick={() => handleToggleResume(p.project_id, p.include_in_resume)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                    padding: '5px 10px', borderRadius: '6px',
                    background: p.include_in_resume ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${p.include_in_resume ? 'rgba(16,185,129,0.25)' : BORDER}`,
                  }}
                >
                  <span style={{ fontSize: '11px', color: p.include_in_resume ? TEAL : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                    {p.include_in_resume ? '✓ Include in resume' : '○ Excluded from resume'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add project form */}
      {adding && (
        <div style={{
          padding: '16px', borderRadius: '12px',
          background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column', gap: '12px',
        }}>
          <div>
            <Label text="PROJECT TITLE *" />
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="e.g. Employee360 Platform" style={inputStyle} />
          </div>
          <div>
            <Label text="DESCRIPTION" />
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
              placeholder="What was this project?" rows={2}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <Label text="OUTCOMES & METRICS" />
            <textarea value={newOutcomes} onChange={e => setNewOutcomes(e.target.value)}
              placeholder="e.g. Improved CSAT from 3.9 to 8.7, 85,000 users impacted" rows={2}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <Label text="TECH STACK (COMMA SEPARATED)" />
            <input value={newTechStack} onChange={e => setNewTechStack(e.target.value)}
              placeholder="e.g. Python, Tableau, Spark, Salesforce" style={inputStyle} />
          </div>

          {/* Attach vault docs */}
          {vaultDocs.length > 0 && (
            <div>
              <Label text="ATTACH DOCUMENTS FROM VAULT" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {vaultDocs.map(doc => (
                  <div
                    key={doc.doc_id}
                    onClick={() => toggleDoc(doc.doc_id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 10px', borderRadius: '6px', cursor: 'pointer',
                      background: newDocIds.includes(doc.doc_id) ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${newDocIds.includes(doc.doc_id) ? 'rgba(16,185,129,0.25)' : BORDER}`,
                    }}
                  >
                    <span style={{ fontSize: '11px', color: newDocIds.includes(doc.doc_id) ? TEAL : 'rgba(255,255,255,0.4)' }}>
                      {newDocIds.includes(doc.doc_id) ? '✓' : '○'}
                    </span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{doc.file_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add links */}
          <div>
            <Label text="LINKS" />
            {newLinks.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>🔗 {l.label}</span>
                <button onClick={() => setNewLinks(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '12px' }}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '6px' }}>
              <input value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)}
                placeholder="Label (e.g. GitHub)" style={{ ...inputStyle, flex: 1 }} />
              <input value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)}
                placeholder="URL" style={{ ...inputStyle, flex: 2 }} />
              <button onClick={addLink} style={{
                padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer',
              }}>+ Add</button>
            </div>
          </div>

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
            <button onClick={() => { setAdding(false); setNewTitle(''); setNewDesc(''); setNewOutcomes(''); setNewTechStack(''); setNewDocIds([]); setNewLinks([]) }}
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
        ✓ checked projects are included in resume generation. Click the checkbox to toggle.
      </p>
    </div>
  )
}