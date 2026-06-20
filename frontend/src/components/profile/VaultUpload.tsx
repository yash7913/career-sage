'use client'
import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'

const TEAL = '#10B981'
const CARD = '#161b22'
const BORDER = 'rgba(255,255,255,0.07)'

type DocTag = 'RESUME' | 'LINKEDIN_EXPORT' | 'PROJECT_DETAIL' | 'SLIDES' | 'CERTIFICATION' | 'OTHER'

interface UploadedFile {
  name: string
  size: number
  tag: DocTag
  status: 'uploading' | 'done' | 'error'
  error?: string
}

const TAG_OPTIONS: { value: DocTag; label: string }[] = [
  { value: 'RESUME', label: 'Resume' },
  { value: 'LINKEDIN_EXPORT', label: 'LinkedIn Export' },
  { value: 'PROJECT_DETAIL', label: 'Project' },
  { value: 'SLIDES', label: 'Slides' },
  { value: 'CERTIFICATION', label: 'Certification' },
  { value: 'OTHER', label: 'Other' },
]

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
}

async function extractTextPreview(file: File): Promise<string> {
  try {
    if (file.name.endsWith('.pdf')) {
      // Read first 2KB of PDF as text — enough for classification
      const text = await file.text().catch(() => '')
      return text.slice(0, 800)
    }
    const text = await file.text()
    return text.slice(0, 800)
  } catch {
    return ''
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function VaultUpload({
  onExtractionComplete,
  isOnboarding = false,
}: {
  onExtractionComplete?: () => void
  isOnboarding?: boolean
}) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [extracting, setExtracting] = useState(false)
  const [extractionDone, setExtractionDone] = useState(false)
  const [extractProgress, setExtractProgress] = useState('')
  const [linkedinImporting, setLinkedinImporting] = useState(false)
  const [linkedinResult, setLinkedinResult] = useState<string | null>(null)
  const [pendingLinkedinFiles, setPendingLinkedinFiles] = useState<File[]>([])
  const [uploadLimitMessage, setUploadLimitMessage] = useState<string | null>(null)
  const [existingDocCount, setExistingDocCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const fetchExistingCount = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/documents/${user.id}`)
        if (res.ok) {
          const data = await res.json()
          setExistingDocCount((data.documents || []).length)
        }
      } catch {}
    }
    fetchExistingCount()
  }, [])

  const handleLinkedinPdf = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setLinkedinImporting(true)
    setLinkedinResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('user_id', user.id)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/import-linkedin-pdf`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.status === 'ok') {
        setLinkedinResult(`✓ ${data.skills_added} skills added · ${data.roles_found} roles found`)
        // Mark onboarding complete so tabs unlock immediately
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/contact`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, onboarding_complete: true }),
        })
      } else {
        setLinkedinResult(`✕ ${data.detail || 'Import failed'}`)
      }
    } catch {
      setLinkedinResult('✕ Import failed. Try again.')
    } finally {
      setLinkedinImporting(false)
    }
  }

  const MAX_DOCS = 10

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const currentCount = existingDocCount + files.length
      const remainingSlots = MAX_DOCS - currentCount

      if (remainingSlots <= 0) {
        setUploadLimitMessage(`You've reached the ${MAX_DOCS} document limit. Remove a file to add a new one.`)
        return
      }

      let filesToProcess = accepted
      if (accepted.length > remainingSlots) {
        filesToProcess = accepted.slice(0, remainingSlots)
        setUploadLimitMessage(
          `Only ${remainingSlots} more document${remainingSlots === 1 ? '' : 's'} can be added (${MAX_DOCS} max). ${accepted.length - remainingSlots} file${accepted.length - remainingSlots === 1 ? ' was' : 's were'} skipped.`
        )
      } else {
        setUploadLimitMessage(null)
      }

      for (const file of filesToProcess) {
        // Start with filename-based guess while content classification runs
        const fname = file.name.toLowerCase()
        const isSlides = fname.endsWith('.pptx') || fname.includes('slide') || fname.includes('deck')
        const initialTag = isSlides ? 'SLIDES' : 'RESUME'

        setFiles(prev => [
          ...prev,
          { name: file.name, size: file.size, tag: initialTag, status: 'uploading' },
        ])

        // Content-based classification + LinkedIn import run silently in background
        const classifyFile = async () => {
          try {
            const textPreview = await extractTextPreview(file)
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/profile/documents/classify`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_id: user.id,
                  file_name: file.name,
                  text_preview: textPreview,
                }),
              }
            )
            if (res.ok) {
              const { tag } = await res.json()
              setFiles(prev => prev.map(f =>
                f.name === file.name ? { ...f, tag } : f
              ))
              // Queue LinkedIn files — import runs when user clicks Build my profile
              if (tag === 'LINKEDIN_EXPORT') {
                setPendingLinkedinFiles(prev => [...prev, file])
              }
              // Project extraction now happens in the staged pipeline during
              // "Build my profile" — no per-file trigger needed here.
            }
          } catch {}
        }
        classifyFile()

        try {
          const arrayBuffer = await file.arrayBuffer()
          const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
          const hashArray = Array.from(new Uint8Array(hashBuffer))
          const fileHash = hashArray
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')

          const storagePath = `${user.id}/${fileHash}_${file.name}`

          const { error: uploadError } = await supabase.storage
            .from('user-documents')
            .upload(storagePath, file, {
              upsert: true,
              contentType: file.type || 'application/pdf',
            })

          if (uploadError) throw uploadError

const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/profile/document`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: user.id,
                file_name: file.name,
                file_hash: fileHash,
                storage_path: storagePath,
                doc_tag: 'RESUME',
              }),
            }
          )

          if (!res.ok) throw new Error('Failed to save document metadata')

          const docResult = await res.json()
          const isDuplicate = docResult.status === 'exists'
          const likelyDup = docResult.likely_duplicate_of

          setFiles(prev =>
            prev.map(f =>
              f.name === file.name
                ? {
                    ...f,
                    status: 'done',
                    error: isDuplicate
                      ? 'Already in your vault — no changes detected'
                      : likelyDup
                      ? `Looks similar to "${likelyDup.file_name}" already in your vault — consider removing the old one`
                      : undefined,
                  }
                : f
            )
          )
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Upload failed'
          setFiles(prev =>
            prev.map(f =>
              f.name === file.name
                ? { ...f, status: 'error', error: message }
                : f
            )
          )
        }
      }
    },
    [supabase]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 20 * 1024 * 1024,
    maxFiles: MAX_DOCS,
  })

  const updateTag = (fileName: string, tag: DocTag) => {
    setFiles(prev =>
      prev.map(f => (f.name === fileName ? { ...f, tag } : f))
    )
  }

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.name !== fileName))
  }

  const handleExtract = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || files.filter(f => f.status === 'done').length === 0) return

    setExtracting(true)
    setExtractProgress('Reading your documents...')
    try {
      setTimeout(() => setExtractProgress('Extracting skills and experience...'), 3000)
      setTimeout(() => setExtractProgress('Identifying your work history...'), 7000)
      setTimeout(() => setExtractProgress('Evaluating your projects...'), 11000)
      setTimeout(() => setExtractProgress('Personalising your Career DNA...'), 16000)
      setTimeout(() => setExtractProgress('Almost there...'), 22000)
      setTimeout(() => setExtractProgress('Just a little longer...'), 28000)

      const tasks: Promise<unknown>[] = [
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id }),
        }),
      ]

      // Process any queued LinkedIn PDFs
      for (const linkedinFile of pendingLinkedinFiles) {
        const formData = new FormData()
        formData.append('file', linkedinFile)
        formData.append('user_id', user.id)
        tasks.push(
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/import-linkedin-pdf`, {
            method: 'POST',
            body: formData,
          })
        )
      }

      await Promise.all(tasks)
      setExtractionDone(true)
      onExtractionComplete?.()
    } catch (e) {
      console.error('Extraction error:', e)
    } finally {
      setExtracting(false)
    }
  }

  const doneCount = files.filter(f => f.status === 'done').length

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Drop zone */}
      <div
        {...getRootProps()}
        style={{
          border: `1.5px dashed ${isDragActive ? TEAL : 'rgba(255,255,255,0.15)'}`,
          borderRadius: '14px',
          padding: '2.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragActive
            ? 'rgba(16,185,129,0.06)'
            : 'rgba(255,255,255,0.02)',
          transition: 'all 0.2s',
          marginBottom: '1rem',
        }}
      >
        <input {...getInputProps()} />
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
        <p
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#fff',
            margin: '0 0 6px',
          }}
        >
          {isDragActive
            ? 'Drop your files here'
            : 'Drag and drop your documents'}
        </p>
        <p
          style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.4)',
            margin: '0 0 16px',
          }}
        >
          PDF, DOCX, MD, TXT, PPTX — up to 20MB each
        </p>
        <button
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            background: TEAL,
            color: '#fff',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Browse files
        </button>
      </div>

      {uploadLimitMessage && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <p style={{ fontSize: '12px', color: 'rgba(245,158,11,0.9)', margin: 0 }}>
            ⚠ {uploadLimitMessage}
          </p>
        </div>
      )}

      {/* LinkedIn PDF import — hidden during onboarding, handled automatically */}
      {!isOnboarding && <div style={{
        border: `1px solid ${BORDER}`,
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '1rem',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px' }}>
              Also import from LinkedIn
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0, lineHeight: 1.6 }}>
              On LinkedIn: <strong style={{ color: 'rgba(255,255,255,0.45)' }}>Me</strong> → <strong style={{ color: 'rgba(255,255,255,0.45)' }}>Settings & Privacy</strong> → <strong style={{ color: 'rgba(255,255,255,0.45)' }}>Data Privacy</strong> → <strong style={{ color: 'rgba(255,255,255,0.45)' }}>Get a copy of your data</strong> → tick <strong style={{ color: 'rgba(255,255,255,0.45)' }}>Profile</strong> → <strong style={{ color: 'rgba(255,255,255,0.45)' }}>Request archive</strong>. Ready in under a minute.
            </p>
            {linkedinResult && (
              <p style={{
                fontSize: '11px', margin: '6px 0 0', fontWeight: 600,
                color: linkedinResult.startsWith('✓') ? TEAL : '#EF4444',
              }}>
                {linkedinResult}
              </p>
            )}
          </div>
          <label style={{
            padding: '7px 14px', borderRadius: '8px', cursor: 'pointer',
            background: linkedinImporting ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${linkedinImporting ? 'rgba(16,185,129,0.3)' : BORDER}`,
            color: linkedinImporting ? TEAL : 'rgba(255,255,255,0.5)',
            fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {linkedinImporting ? '⏳ Importing...' : '⬆ Upload PDF'}
            <input
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              disabled={linkedinImporting}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleLinkedinPdf(file)
              }}
            />
          </label>
        </div>
      </div>
    }

      {/* File list */}
      {files.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          {files.map(file => (
            <div
              key={file.name}
              style={{
                background: CARD,
                border: `1px solid ${
                  file.status === 'error'
                    ? 'rgba(239,68,68,0.3)'
                    : file.status === 'done'
                    ? 'rgba(16,185,129,0.25)'
                    : BORDER
                }`,
                borderRadius: '10px',
                padding: '0.875rem 1rem',
                marginBottom: '8px',
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color:
                      file.status === 'done' && !file.error
                        ? TEAL
                        : file.status === 'done' && file.error
                        ? '#F59E0B'
                        : file.status === 'error'
                        ? 'rgba(239,68,68,0.9)'
                        : '#fff',
                    margin: '0 0 3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {file.status === 'done'
                    ? '✓ '
                    : file.status === 'error'
                    ? '✕ '
                    : '⟳ '}
                  {file.name}
                </p>
                <p
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.35)',
                    margin: 0,
                  }}
                >
                  {formatSize(file.size)}
{file.error && (
                    <span style={{
                      color: file.status === 'done'
                        ? 'rgba(245,158,11,0.8)'
                        : 'rgba(239,68,68,0.8)',
                      marginLeft: '8px',
                    }}>
                      {file.error}
                    </span>
                  )}
                </p>
              </div>

              <select
                value={file.tag}
                onChange={e =>
                  updateTag(file.name, e.target.value as DocTag)
                }
                style={{
                fontSize: '12px',
                padding: '4px 8px',
                borderRadius: '6px',
                background: '#1c2128',
                border: `1px solid rgba(255,255,255,0.15)`,
                color: '#fff',
                cursor: 'pointer',
                colorScheme: 'dark',
              }}
              >
                {TAG_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => removeFile(file.name)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '0 4px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Extract button */}
      {!isOnboarding && files.some(f => f.status === 'done' && f.tag === 'LINKEDIN_EXPORT') && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '8px',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          fontSize: '12px', color: 'rgba(245,158,11,0.8)', lineHeight: 1.5,
        }}>
          💡 LinkedIn Export detected — use the <strong>Upload PDF</strong> button in the LinkedIn section above to import it. The extract button below is for resumes only.
        </div>
      )}

      {doneCount > 0 && !extractionDone && (
        <div>
          <button
            onClick={handleExtract}
            disabled={extracting}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              background: extracting ? 'rgba(16,185,129,0.4)' : TEAL,
              color: '#fff',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: extracting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.2s',
            }}
          >
            {extracting ? (
              <>⟳ {extractProgress || 'Building your profile...'}</>
            ) : (
              <>
                ⚡ Build my profile from {doneCount} document{doneCount > 1 ? 's' : ''}
                {pendingLinkedinFiles.length > 0 && ` + LinkedIn import`}
              </>
            )}
          </button>
          {extracting && (
            <div style={{
              height: '3px', background: 'rgba(255,255,255,0.06)',
              borderRadius: '2px', overflow: 'hidden', marginTop: '8px',
            }}>
              <div style={{
                height: '100%', background: TEAL, borderRadius: '2px',
                animation: 'progress-pulse 2s ease-in-out infinite',
                width: '40%',
              }} />
            </div>
          )}
        </div>
      )}

      {/* Success state */}
      {extractionDone && (
        <div style={{
          padding: '1rem 1.25rem', borderRadius: '10px',
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.25)',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: TEAL, margin: '0 0 4px' }}>
            ✓ Profile extracted successfully
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '0 0 12px' }}>
            Your skills and summary have been saved. Moving to next step...
          </p>
          <div style={{
            height: '3px', background: 'rgba(255,255,255,0.08)',
            borderRadius: '2px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: TEAL,
              borderRadius: '2px',
              animation: 'progress-fill 2s linear forwards',
            }} />
          </div>
        </div>
      )}
    </div>
  )
}