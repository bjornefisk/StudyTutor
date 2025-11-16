"use client"

import { useEffect, useRef, useState } from 'react'
import { FileText, File as FileIcon, FileType, FileArchive } from 'lucide-react'
import type { FileInfo } from '@/types'
import { getFileContentURL } from '@/lib/api'
// PDF.js (legacy build for compatibility)
import { GlobalWorkerOptions, getDocument, version as pdfjsVersion } from 'pdfjs-dist'
import { renderAsync } from 'docx-preview'

function extToLabel(ext: string): string {
  switch (ext) {
    case '.pdf':
      return 'PDF'
    case '.docx':
      return 'DOCX'
    case '.md':
      return 'MARKDOWN'
    case '.txt':
      return 'TEXT'
    default:
      return ext.replace('.', '').toUpperCase() || 'FILE'
  }
}

function extToColor(ext: string): string {
  switch (ext) {
    case '.pdf':
      return 'from-rose-500 to-red-500'
    case '.docx':
      return 'from-blue-500 to-indigo-500'
    case '.md':
      return 'from-emerald-500 to-teal-500'
    case '.txt':
      return 'from-zinc-500 to-slate-500'
    default:
      return 'from-purple-500 to-fuchsia-500'
  }
}

export default function DocumentCard({ file }: { file: FileInfo }) {
  const ext = (file.name.match(/\.[^.]+$/)?.[0] || '').toLowerCase()
  const label = extToLabel(ext)
  const gradient = extToColor(ext)
  const date = new Date(file.modified)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [textPreview, setTextPreview] = useState<string | null>(null)
  const docxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false

    async function renderPdfThumbnail() {
      try {
        if (!canvasRef.current) return
        // Configure worker
        GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`
        const url = getFileContentURL(file.name)
        const loadingTask = getDocument({ url })
        const pdf = await loadingTask.promise
        const page = await pdf.getPage(1)
        const viewport = page.getViewport({ scale: 1 })
        const targetWidth = 280 // desired thumbnail width
        const scale = targetWidth / viewport.width
        const scaled = page.getViewport({ scale })
        const canvas = canvasRef.current
        const context = canvas!.getContext('2d')!
        canvas!.width = Math.floor(scaled.width)
        canvas!.height = Math.floor(scaled.height)
        await page.render({ canvasContext: context, viewport: scaled }).promise
      } catch (_) {
        // swallow rendering errors; fallback is no preview
      }
    }

    async function loadTextPreview() {
      try {
        const url = getFileContentURL(file.name)
        const res = await fetch(url)
        const text = await res.text()
        if (!cancelled) {
          const firstLines = text.split(/\r?\n/).slice(0, 12).join('\n')
          setTextPreview(firstLines)
        }
      } catch (_) {
        // ignore
      }
    }

    if (ext === '.pdf') {
      void renderPdfThumbnail()
    } else if (ext === '.txt' || ext === '.md') {
      void loadTextPreview()
    } else if (ext === '.docx') {
      ;(async () => {
        try {
          if (!docxRef.current) return
          const url = getFileContentURL(file.name)
          const res = await fetch(url)
          const buf = await res.arrayBuffer()
          if (cancelled) return
          // Render DOCX content into the container. We clamp via container styles to make it a thumbnail.
          await renderAsync(buf, docxRef.current, undefined, {
            inWrapper: false,
            ignoreWidth: true,
            ignoreHeight: true,
            breakPages: true,
            experimental: true,
            useBase64URL: true
          })
        } catch (_) {
          // ignore docx preview errors
        }
      })()
    }

    return () => {
      cancelled = true
    }
  }, [ext, file.name])

  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-10 bg-gradient-to-r ${gradient} text-white`}></div>
      {/* Preview area */}
      <div className="relative mt-10 aspect-[4/3] w-full overflow-hidden bg-[var(--muted)]">
        {ext === '.pdf' ? (
          <canvas ref={canvasRef} className="h-full w-full object-cover" />
        ) : ext === '.txt' || ext === '.md' ? (
          <div className="h-full w-full overflow-hidden p-3 text-[10px] leading-4 text-[var(--foreground)]/80">
            <pre className="line-clamp-10 whitespace-pre-wrap">{textPreview ?? 'Loading preview…'}</pre>
          </div>
        ) : ext === '.docx' ? (
          <div className="h-full w-full overflow-hidden">
            <div ref={docxRef} className="docx-thumb h-full w-full scale-[0.8] origin-top-left p-2 [*]:!m-0 [*]:!p-0 [*]:!w-auto" />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--muted-foreground)]">
            No preview available
          </div>
        )}
      </div>
      <div className="relative p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white shadow`}> 
            {ext === '.pdf' ? (
              <FileText className="h-5 w-5" />
            ) : ext === '.docx' ? (
              <FileType className="h-5 w-5" />
            ) : ext === '.md' || ext === '.txt' ? (
              <FileIcon className="h-5 w-5" />
            ) : (
              <FileArchive className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
              {label}
            </div>
            <div className="truncate text-sm font-medium text-[var(--foreground)]">
              {file.name}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <span>{(file.size / 1024).toFixed(1)} KB</span>
          <span>{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  )
}
