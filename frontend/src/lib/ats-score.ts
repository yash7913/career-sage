export function parseATSFromContent(content: string): { score: number; strength: string; label: string } | null {
  if (!content) return null

  const scoreMatch = content.match(/Estimated ATS Score:\s*\**(\d+)%/i)
  const strengthMatch = content.match(/ATS Match Strength:\s*\**([A-Za-z\s]+?)[\*\n\r]/i)
    || content.match(/Estimated ATS Match Strength:\s*\**([A-Za-z\s]+?)[\*\n\r]/i)

  let score = scoreMatch ? parseInt(scoreMatch[1]) : 0
  let strength = strengthMatch ? strengthMatch[1].trim() : ''

  if (!score && strength) {
    const lower = strength.toLowerCase()
    score = lower.includes('very high') ? 90
      : lower.includes('high') ? 78
      : lower.includes('medium') ? 65
      : lower.includes('low') ? 45
      : 0
  }

  if (!score && !strength) return null

  const normalised = strength.toLowerCase().includes('very high') ? 'Very High'
    : strength.toLowerCase().includes('high') ? 'High'
    : strength.toLowerCase().includes('medium') ? 'Medium'
    : strength.toLowerCase().includes('low') ? 'Low'
    : score >= 85 ? 'Very High'
    : score >= 70 ? 'High'
    : score >= 55 ? 'Medium'
    : 'Low'

  return {
    score,
    strength: normalised,
    label: score > 0 ? `ATS: ${normalised} (${score}%)` : `ATS: ${normalised}`,
  }
}

export function atsColor(strength: string): string {
  const lower = strength.toLowerCase()
  if (lower.includes('very high')) return '#10B981'
  if (lower.includes('high')) return '#10B981'
  if (lower.includes('medium')) return '#F59E0B'
  return '#EF4444'
}