'use client'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'

const TEAL = '#10B981'
const CARD = '#161b22'
const BORDER = 'rgba(255,255,255,0.07)'

type DocTag = 'RESUME' | 'PROJECT_DETAIL' | 'SLIDES' | 'CERTIFICATION' | 'OTHER'

interface UploadedFile {
  name: string
  size: number
  tag: DocTag
  status: 'uploading' | 'done' | 'error'
  error?: string
}

const TAG_OPTIONS: { value: DocTag; label: string }[] = [
  { value: 'RESUME', label: 'Resume' },
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

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function VaultUpload({
  onExtractionComplete,
}: {
  onExtractionComplete?: () => void
}) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [extracting, setExtracting] = useState(false)
  const [extractionDone, setExtractionDone] = useState(false)
  const supabase = createClient()

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      for (const file of accepted) {
        setFiles(prev => [
          ...prev,
          { name: file.name, size: file.size, tag: 'RESUME', status: 'uploading' },
        ])

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
            .upload(storagePath, file, { upsert: true })

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

          setFiles(prev =>
            prev.map(f =>
              f.name === file.name
                ? {
                    ...f,
                    status: 'done',
                    error: isDuplicate
                      ? 'Already in your vault — no changes detected'
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
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile/extract`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id }),
        }
      )
      if (res.ok) {
        setExtractionDone(true)
        onExtractionComplete?.()
      } else {
        const err = await res.json()
        console.error('Extraction failed:', err)
      }
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
      {doneCount > 0 && !extractionDone && (
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
            <>⟳ Extracting your profile — takes about 5 seconds...</>
          ) : (
            <>
              ⚡ Build my profile from {doneCount} document
              {doneCount > 1 ? 's' : ''}
            </>
          )}
        </button>
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