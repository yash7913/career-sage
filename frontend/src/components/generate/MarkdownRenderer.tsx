'use client'

const TEAL = '#10B981'
const BORDER = 'rgba(255,255,255,0.07)'

interface MarkdownRendererProps {
  content: string
  variant?: 'resume' | 'cover_letter' | 'report'
}

export default function MarkdownRenderer({ content, variant = 'resume' }: MarkdownRendererProps) {
  if (!content) return null

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0
  let keyCounter = 0
  const key = () => keyCounter++

  const parseInline = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g)
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} style={{ fontWeight: 700, color: '#fff' }}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={idx} style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.7)' }}>{part.slice(1, -1)}</em>
      }
      return part
    })
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      elements.push(<div key={key()} style={{ height: '8px' }} />)
      i++
      continue
    }

    // H1
    if (trimmed.startsWith('# ')) {
      const text = trimmed.slice(2)
      elements.push(
        <div key={key()} style={{ marginBottom: '4px' }}>
          <h1 style={{
            fontSize: variant === 'resume' ? '22px' : '20px',
            fontWeight: 700, color: '#fff',
            margin: '0 0 2px', letterSpacing: '-0.5px',
            lineHeight: 1.2,
          }}>
            {text}
          </h1>
          <div style={{ height: '1px', background: `linear-gradient(90deg, ${TEAL}, transparent)`, marginTop: '6px' }} />
        </div>
      )
      i++
      continue
    }

    // H2
    if (trimmed.startsWith('## ')) {
      const text = trimmed.slice(3)
      elements.push(
        <div key={key()} style={{ marginTop: '20px', marginBottom: '6px' }}>
          <h2 style={{
            fontSize: '13px', fontWeight: 700,
            color: TEAL, margin: 0,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {text}
          </h2>
          <div style={{ height: '1px', background: BORDER, marginTop: '4px' }} />
        </div>
      )
      i++
      continue
    }

    // H3
    if (trimmed.startsWith('### ')) {
      const text = trimmed.slice(4)
      elements.push(
        <h3 key={key()} style={{
          fontSize: '14px', fontWeight: 700,
          color: '#fff', margin: '14px 0 4px',
          letterSpacing: '-0.2px',
        }}>
          {parseInline(text)}
        </h3>
      )
      i++
      continue
    }

    // Table row
    if (trimmed.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim())
        i++
      }
      const rows = tableLines.filter(l => !l.match(/^\|[-:\s|]+\|$/))
      elements.push(
        <div key={key()} style={{ overflowX: 'auto', margin: '12px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <tbody>
              {rows.map((row, ri) => {
                const cells = row.split('|').filter(c => c.trim())
                return (
                  <tr key={ri} style={{
                    background: ri === 0 ? 'rgba(16,185,129,0.08)' : ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  }}>
                    {cells.map((cell, ci) => (
                      <td key={ci} style={{
                        padding: '6px 12px',
                        border: `1px solid ${BORDER}`,
                        color: ri === 0 ? TEAL : 'rgba(255,255,255,0.75)',
                        fontWeight: ri === 0 ? 700 : 400,
                        whiteSpace: ci === 0 ? 'nowrap' : 'normal',
                      }}>
                        {parseInline(cell.trim())}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // Bullet point
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const text = trimmed.slice(2)
      elements.push(
        <div key={key()} style={{
          display: 'flex', gap: '10px',
          margin: '3px 0', paddingLeft: '4px',
        }}>
          <span style={{ color: TEAL, flexShrink: 0, marginTop: '1px', fontSize: '12px' }}>▸</span>
          <p style={{
            fontSize: '13px', color: 'rgba(255,255,255,0.8)',
            margin: 0, lineHeight: 1.65,
          }}>
            {parseInline(text)}
          </p>
        </div>
      )
      i++
      continue
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      elements.push(
        <div key={key()} style={{
          height: '1px', background: BORDER,
          margin: '16px 0',
        }} />
      )
      i++
      continue
    }

    // Contact line (contains | separators — common in resume headers)
    if (trimmed.includes(' | ') && !trimmed.startsWith('|')) {
      const parts = trimmed.split(' | ')
      elements.push(
        <p key={key()} style={{
          fontSize: '12px', color: 'rgba(255,255,255,0.5)',
          margin: '2px 0', textAlign: 'center',
          display: 'flex', gap: '8px', flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {parts.map((part, idx) => (
            <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {part.trim()}
              {idx < parts.length - 1 && (
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
              )}
            </span>
          ))}
        </p>
      )
      i++
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={key()} style={{
        fontSize: '13px', color: 'rgba(255,255,255,0.75)',
        margin: '4px 0', lineHeight: 1.7,
      }}>
        {parseInline(trimmed)}
      </p>
    )
    i++
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {elements}
    </div>
  )
}