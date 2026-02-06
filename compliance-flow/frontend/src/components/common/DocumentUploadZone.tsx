import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, FileType, File, X, AlertCircle } from 'lucide-react'

interface DocumentUploadZoneProps {
  multiple?: boolean
  files?: File[]
  status?: 'idle' | 'uploading' | 'parsing' | 'parsed' | 'error'
  error?: string
  onFileSelect: (files: File[]) => void
  onFileRemove?: (index: number) => void
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt']
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

function getFileIcon(name: string) {
  const ext = name.toLowerCase().split('.').pop()
  if (ext === 'pdf') return <FileText size={16} className="text-red-400" />
  if (ext === 'docx' || ext === 'doc') return <FileType size={16} className="text-blue-400" />
  return <File size={16} className="text-[var(--nomu-text-muted)]" />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentUploadZone({
  multiple = false,
  files = [],
  status = 'idle',
  error,
  onFileSelect,
  onFileRemove,
}: DocumentUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFiles = useCallback((fileList: File[]): File[] => {
    setValidationError(null)
    const valid: File[] = []

    for (const file of fileList) {
      const ext = '.' + file.name.toLowerCase().split('.').pop()
      if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXTENSIONS.includes(ext)) {
        setValidationError(`Unsupported file type: ${file.name}. Accepted: PDF, DOCX, TXT`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        setValidationError(`File too large: ${file.name} (${formatFileSize(file.size)}). Max: 100MB`)
        continue
      }
      valid.push(file)
    }

    return valid
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    const filesToAdd = multiple ? droppedFiles : droppedFiles.slice(0, 1)
    const valid = validateFiles(filesToAdd)
    if (valid.length > 0) onFileSelect(valid)
  }, [multiple, onFileSelect, validateFiles])

  const handleClick = () => inputRef.current?.click()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const selected = Array.from(e.target.files)
    const valid = validateFiles(selected)
    if (valid.length > 0) onFileSelect(valid)
    e.target.value = '' // Reset so same file can be selected again
  }

  const statusColors: Record<string, string> = {
    idle: 'border-[var(--nomu-border)]',
    uploading: 'border-[var(--nomu-primary)] bg-[var(--nomu-primary)]/5',
    parsing: 'border-[var(--nomu-primary)] bg-[var(--nomu-primary)]/5',
    parsed: 'border-green-500/50 bg-green-500/5',
    error: 'border-red-500/50 bg-red-500/5',
  }

  return (
    <div className="space-y-2">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative flex cursor-pointer flex-col items-center justify-center rounded-lg
          border-2 border-dashed p-6 transition-all duration-200
          ${isDragging ? 'border-[var(--nomu-primary)] bg-[var(--nomu-primary)]/10 scale-[1.02]' : statusColors[status] || statusColors.idle}
          hover:border-[var(--nomu-text-muted)] hover:bg-[var(--nomu-surface)]
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        <Upload size={24} className={`mb-2 ${isDragging ? 'text-[var(--nomu-primary)]' : 'text-[var(--nomu-text-muted)]'}`} />
        <p className="text-sm text-[var(--nomu-text)]">
          {isDragging ? 'Drop files here' : 'Drop files here or click to browse'}
        </p>
        <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">
          PDF, DOCX, or TXT • Max 100MB {multiple ? '• Multiple files' : ''}
        </p>

        {(status === 'uploading' || status === 'parsing') && (
          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--nomu-primary)]">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--nomu-primary)] border-t-transparent" />
            <span>{status === 'uploading' ? 'Uploading...' : 'Parsing document...'}</span>
          </div>
        )}
      </div>

      {/* Validation Error */}
      {(validationError || error) && (
        <div className="flex items-center gap-2 rounded-lg bg-red-900/20 px-3 py-2 text-xs text-red-400">
          <AlertCircle size={14} />
          <span>{validationError || error}</span>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-lg bg-[var(--nomu-surface)] px-3 py-2"
            >
              <div className="flex items-center gap-2">
                {getFileIcon(file.name)}
                <span className="max-w-[200px] truncate text-sm text-[var(--nomu-text)]">{file.name}</span>
                <span className="text-xs text-[var(--nomu-text-muted)]">{formatFileSize(file.size)}</span>
              </div>
              {onFileRemove && (
                <button
                  onClick={(e) => { e.stopPropagation(); onFileRemove(index) }}
                  className="rounded p-1 text-[var(--nomu-text-muted)] hover:bg-[var(--nomu-surface-hover)] hover:text-red-400"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
