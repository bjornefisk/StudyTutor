"use client"

import { useState } from 'react'

import { listDocuments, triggerIngestion, uploadDocuments } from '@/lib/api'
import type { FileInfo } from '@/types'

interface FileUploadPanelProps {
  onClose: () => void
  onIngestionStarted?: () => void
}

export default function FileUploadPanel({ onClose, onIngestionStarted }: FileUploadPanelProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploaded, setUploaded] = useState<FileInfo[]>([])
  const [status, setStatus] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [isIngesting, setIsIngesting] = useState(false)

  const refreshFileList = async () => {
    const result = await listDocuments()
    setUploaded(result.files)
  }

  const handleSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return
    setFiles(Array.from(event.target.files))
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    try {
      setIsUploading(true)
      const result = await uploadDocuments(files)
      const successMessage = result.count ? `Uploaded ${result.count} file(s)` : ''
      const errorMessage = result.errors.length ? `Errors: ${result.errors.join('; ')}` : ''
      setStatus([successMessage, errorMessage].filter(Boolean).join(' — '))
      if (result.count) {
        await refreshFileList()
        setFiles([])
      }
    } catch (error) {
      setStatus('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleIngest = async () => {
    try {
      setIsIngesting(true)
      await triggerIngestion()
      setStatus('Ingestion started. This may take a minute.')
      onIngestionStarted?.()
    } catch (error) {
      setStatus('Failed to start ingestion.')
    } finally {
      setIsIngesting(false)
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-lg transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Upload study materials</h2>
          <p className="text-sm text-muted-foreground">Supported formats: PDF, DOCX, Markdown, TXT.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-transparent px-3 py-1 text-sm text-muted-foreground transition-all hover:border-border hover:text-foreground"
        >
          Close
        </button>
      </div>

      <div className="space-y-3">
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md"
          multiple
          onChange={handleSelect}
          className="block w-full cursor-pointer rounded-lg border border-dashed border-border bg-muted p-4 text-sm text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
        />

        {files.length > 0 && (
          <div className="glass rounded-xl border border-border p-3 text-sm text-foreground">
            <div className="mb-2 font-medium">Selected files ({files.length})</div>
            <ul className="max-h-32 space-y-1 overflow-y-auto text-xs">
              {files.map((file) => (
                <li key={file.name} className="flex items-center justify-between">
                  <span className="truncate">{file.name}</span>
                  <span className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void handleUpload()}
            disabled={isUploading || files.length === 0}
            className="flex-1 rounded-xl bg-primary py-2 text-center text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:transform-none"
          >
            {isUploading ? 'Uploading…' : 'Upload files'}
          </button>
          <button
            type="button"
            onClick={() => void handleIngest()}
            disabled={isIngesting}
            className="flex-1 rounded-xl bg-emerald-600 dark:bg-emerald-500 py-2 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all hover:shadow-xl hover:shadow-emerald-600/40 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:transform-none"
          >
            {isIngesting ? 'Starting…' : 'Ingest documents'}
          </button>
        </div>
      </div>

      {status && <div className="glass rounded-xl p-3 text-sm text-foreground">{status}</div>}

      {uploaded.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Existing files</h3>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
            {uploaded.map((file) => (
              <li key={file.name} className="flex justify-between">
                <span>{file.name}</span>
                <span>{(file.size / 1024).toFixed(1)} KB</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
