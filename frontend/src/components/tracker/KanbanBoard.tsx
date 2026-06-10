'use client'
import { useState, useEffect } from 'react'
import KanbanCard from './KanbanCard'
import RejectionAnalysis from '@/components/tracker/RejectionAnalysis'
import OfferAnalyser from '@/components/profile/OfferAnalyser'

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

const COLUMNS = [
  { key: 'DRAFT', label: 'Draft', emoji: '📝', color: 'rgba(255,255,255,0.3)' },
  { key: 'APPLIED', label: 'Applied', emoji: '📤', color: '#3B82F6' },
  { key: 'INTERVIEWING', label: 'Interviewing', emoji: '🎯', color: '#F59E0B' },
  { key: 'OFFER', label: 'Offer', emoji: '🎉', color: '#10B981' },
]

export default function KanbanBoard({ userId }: { userId: string }) {
  const [cards, setCards] = useState<TrackerCard[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [rejectionCard, setRejectionCard] = useState<{ jobId: string; jobTitle: string; company: string } | null>(null)
  const [offerCard, setOfferCard] = useState<{ jobTitle: string; company: string } | null>(null)

  useEffect(() => {
    fetchCards()
  }, [userId])

  const fetchCards = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tracker/${userId}`
      )
      if (res.ok) {
        const data = await res.json()
        setCards(data)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStageChange = async (cardId: string, newStage: string) => {
    setCards(prev => prev.map(c =>
      c.card_id === cardId ? { ...c, stage: newStage } : c
    ))
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/tracker/card/${cardId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      }
    )
    if (newStage === 'REJECTED') {
      const card = cards.find(c => c.card_id === cardId)
      if (card?.job_id) {
        setRejectionCard({
          jobId: card.job_id,
          jobTitle: card.job_title || 'Unknown Role',
          company: card.company_name || 'Unknown Company',
        })
      }
    }
    {offerCard && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem', backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '20px', width: '100%', maxWidth: '640px',
            maxHeight: '90vh', overflow: 'auto',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#161b22', borderRadius: '20px 20px 0 0' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', margin: '0 0 4px' }}>OFFER RECEIVED 🎉</p>
                <p style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{offerCard.jobTitle}</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{offerCard.company}</p>
              </div>
              <button onClick={() => setOfferCard(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '14px', padding: '6px 10px' }}>✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
                Congratulations! Analyse your offer to see how it stacks up against market data and get a negotiation script.
              </p>
              <OfferAnalyser userId={userId} />
            </div>
          </div>
        </div>
      )}
  }

  const handleNotesUpdate = async (cardId: string, notes: string) => {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/tracker/card/${cardId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      }
    )
    setCards(prev => prev.map(c =>
      c.card_id === cardId ? { ...c, notes } : c
    ))
  }

  const handleDragStart = (cardId: string) => {
    setDraggingId(cardId)
  }

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault()
    setDragOverCol(colKey)
  }

  const handleDrop = async (e: React.DragEvent, colKey: string) => {
    e.preventDefault()
    if (draggingId && colKey) {
      await handleStageChange(draggingId, colKey)
    }
    setDraggingId(null)
    setDragOverCol(null)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverCol(null)
  }

  const getCardsForStage = (stage: string) =>
    cards.filter(c => c.stage === stage)

  const totalCards = cards.length

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'system-ui' }}>
      Loading your pipeline...
    </div>
  )

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL, letterSpacing: '0.1em', margin: '0 0 4px' }}>PIPELINE TRACKER</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            {totalCards === 0 ? 'No applications yet — download a tailored resume to start tracking' : `${totalCards} application${totalCards > 1 ? 's' : ''} tracked`}
          </p>
        </div>
        <button
          onClick={fetchCards}
          style={{ padding: '7px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer' }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Kanban columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', alignItems: 'flex-start' }}>
        {COLUMNS.map(col => {
          const colCards = getCardsForStage(col.key)
          const isOver = dragOverCol === col.key
          return (
            <div
              key={col.key}
              onDragOver={e => handleDragOver(e, col.key)}
              onDrop={e => handleDrop(e, col.key)}
              onDragLeave={() => setDragOverCol(null)}
              style={{
                background: isOver ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isOver ? 'rgba(16,185,129,0.3)' : BORDER}`,
                borderRadius: '14px',
                padding: '1rem',
                minHeight: '200px',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              {/* Column header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ fontSize: '14px' }}>{col.emoji}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: col.color }}>
                    {col.label}
                  </span>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 700,
                  padding: '2px 8px', borderRadius: '999px',
                  background: colCards.length > 0 ? `${col.color}18` : 'rgba(255,255,255,0.04)',
                  color: colCards.length > 0 ? col.color : 'rgba(255,255,255,0.2)',
                }}>
                  {colCards.length}
                </span>
              </div>

              {/* Cards */}
              {colCards.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'rgba(255,255,255,0.15)', fontSize: '12px' }}>
                  {isOver ? 'Drop here' : 'Drop cards here'}
                </div>
              ) : (
                colCards.map(card => (
                  <KanbanCard
                    key={card.card_id}
                    card={card}
                    onStageChange={handleStageChange}
                    onNotesUpdate={handleNotesUpdate}
                    isDragging={draggingId === card.card_id}
                    onDragStart={handleDragStart}
                  />
                ))
              )}
            </div>
          )
        })}
      </div>

      {rejectionCard && (
        <RejectionAnalysis
          userId={userId}
          jobId={rejectionCard.jobId}
          jobTitle={rejectionCard.jobTitle}
          company={rejectionCard.company}
          onClose={() => setRejectionCard(null)}
        />
      )}
    </div>
  )
}