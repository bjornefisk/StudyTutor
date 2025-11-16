"use client"

import { useEffect, useState } from 'react'
import { listDocuments } from '@/lib/api'
import type { FileInfo } from '@/types'
import DocumentCard from './DocumentCard'

export default function DocumentsGallery() {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        const { files } = await listDocuments()
        // sort by modified desc
        setFiles(files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()))
      } catch (e) {
        setError('Failed to load documents')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--foreground)]">Your Documents</h2>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)]">Loading…</div>
      ) : error ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-red-500">{error}</div>
      ) : files.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted-foreground)]">No documents uploaded yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {files.map((file) => (
            <DocumentCard key={file.name + file.modified} file={file} />
          ))}
        </div>
      )}
    </div>
  )
}
