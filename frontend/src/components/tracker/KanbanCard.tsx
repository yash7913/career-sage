'use client'
import { useState } from 'react'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'
const CARD = '#161b22'

interface TrackerCard {
  card_id: string
  job_id: string
  company_name: string
  job_title: string
  match_score: number | null
  stage: string
  notes: string
  created_at: string
  aggregated_jobs?: {
    location?: string
    source_link?: string
    skills_needed?: string[]
    estimated_interview_rounds?: number
    interview_breakdown_notes?: string
  }
}

const STAGE_COLORS: Record<string, string> = {
  DRAFT: 'rgba(255,255,255,0.3)',
  APPLIED: '#3B82F6',
  INTERVIEWING: '#F59E0B',
  OFFER: '#10B981',
  REJECTED: '#EF4444',
}

export default function KanbanCard({
  card,
  onStageChange,
  onNotesUpdate,
  isDragging,
  onDragStart,
}: {
  card: TrackerCard
  onStageChange: (cardId: string, stage: string) => void
  onNotesUpdate: (cardId: string, notes: string) => void
  isDragging: boolean
  onDragStart: (cardId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(card.notes || '')
  const [savingNotes, setSavingNotes] = useState(false)

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    await onNotesUpdate(card.card_id, notes)
    setSavingNotes(false)
  }

  const job = card.aggregated_jobs

  return (
    <div
      draggable
      onDragStart={() => onDragStart(card.card_id)}
      style={{
        background: CARD,
        border: `1px solid ${isDragging ? TEAL : BORDER}`,
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '8px',
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        transition: 'border-color 0.15s, opacity 0.15s',
        userSelect: 'none',
      }}
    >
      {/* Card header */}
      <div style={{ marginBottom: '8px' }}>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '0 0 3px' }}>
          {card.company_name}
          {job?.location ? ` · ${job.location}` : ''}
        </p>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>
          {card.job_title}
        </p>
      </div>

      {/* Match score + date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        {card.match_score && (
          <span style={{
            fontSize: '11px', fontWeight: 700,
            padding: '2px 8px', borderRadius: '999px',
            background: card.match_score >= 70 ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
            color: card.match_score >= 70 ? TEAL : 'rgba(255,255,255,0.4)',
          }}>
            ⚡ {card.match_score}%
          </span>
        )}
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
          {new Date(card.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </span>
      </div>

      {/* Expand button */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', padding: '5px', borderRadius: '6px',
          background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`,
          color: 'rgba(255,255,255,0.3)', fontSize: '11px', cursor: 'pointer',
        }}
      >
        {expanded ? '▲ Less' : '▼ Details + notes'}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ marginTop: '10px' }}>
          {/* Interview rounds */}
          {job?.estimated_interview_rounds && (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '0 0 8px' }}>
              📋 {job.estimated_interview_rounds} rounds
              {job.interview_breakdown_notes ? ` · ${job.interview_breakdown_notes}` : ''}
            </p>
          )}

          {/* Skills */}
          {job?.skills_needed && job.skills_needed.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
              {job.skills_needed.slice(0, 6).map(s => (
                <span key={s} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: `1px solid ${BORDER}` }}>
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: '8px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '0 0 5px', fontWeight: 600, letterSpacing: '0.06em' }}>NOTES</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Interview notes, follow-up actions, contacts..."
              style={{
                width: '100%', padding: '8px 10px', borderRadius: '7px',
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
                color: '#fff', fontSize: '12px', resize: 'vertical',
                boxSizing: 'border-box', outline: 'none', lineHeight: 1.5,
                fontFamily: 'system-ui, sans-serif',
              }}
            />
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              style={{
                marginTop: '5px', padding: '5px 12px', borderRadius: '6px',
                background: TEAL, color: '#fff', border: 'none',
                fontSize: '11px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {savingNotes ? 'Saving...' : 'Save notes'}
            </button>
          </div>

          {/* Source link */}
{job?.source_link && (
            <a href={job.source_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: TEAL, textDecoration: 'none' }}>View job posting ↗</a>
          )}

          {/* Move stage */}
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '0 0 6px', fontWeight: 600, letterSpacing: '0.06em' }}>MOVE TO</p>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {['DRAFT', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED'].filter(s => s !== card.stage).map(s => (
                <button
                  key={s}
                  onClick={() => onStageChange(card.card_id, s)}
                  style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '10px',
                    fontWeight: 600, cursor: 'pointer', border: 'none',
                    background: `${STAGE_COLORS[s]}20`,
                    color: STAGE_COLORS[s],
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}