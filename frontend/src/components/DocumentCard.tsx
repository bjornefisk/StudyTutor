"use client"

import { useEffect, useRef, useState } from 'react'
import { FileText, File as FileIcon, FileType, FileArchive, AlertCircle } from 'lucide-react'
import type { FileInfo } from '@/types'
import { getFileContentURL } from '@/lib/api'
// PDF.js (legacy build for compatibility)
import { GlobalWorkerOptions, getDocument, version as pdfjsVersion } from 'pdfjs-dist'
import { renderAsync } from 'docx-preview'

const logger = {
  info: (...args: any[]) => console.log('[DocumentCard]', ...args),
  error: (...args: any[]) => console.error('[DocumentCard]', ...args),
}

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
  const [pdfError, setPdfError] = useState(false)
  const docxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    let renderTask: any = null

    async function renderPdfThumbnail() {
      try {
        if (!canvasRef.current) return
        
        // Set up worker from local public directory
        GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        logger.info('PDF worker configured:', GlobalWorkerOptions.workerSrc)
        
        const url = getFileContentURL(file.name)
        logger.info('Loading PDF from:', url)
        
        // Fetch PDF as blob
        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        if (cancelled) return
        
        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()
        if (cancelled) return
        
        const loadingTask = getDocument({ data: arrayBuffer })
        const pdf = await loadingTask.promise
        if (cancelled) return
        
        const page = await pdf.getPage(1)
        if (cancelled) return
        
        const viewport = page.getViewport({ scale: 2 })
        const canvas = canvasRef.current
        if (!canvas || cancelled) return
        
        const context = canvas.getContext('2d')
        if (!context) {
          logger.error('Failed to get canvas context')
          setPdfError(true)
          return
        }
        canvas.width = viewport.width
        canvas.height = viewport.height
        
        renderTask = page.render({ canvasContext: context, viewport })
        await renderTask.promise
        if (!cancelled) {
          logger.info('PDF rendered successfully')
        }
      } catch (error) {
        if (!cancelled) {
          logger.error('PDF preview error:', error)
          setPdfError(true)
        }
      }
    }

    async function loadTextPreview() {
      try {
        const url = getFileContentURL(file.name)
        logger.info('Loading text from:', url)
        const res = await fetch(url)
        if (!res.ok) {
          logger.error(`HTTP ${res.status}: ${res.statusText}`)
          throw new Error(`HTTP ${res.status}`)
        }
        const text = await res.text()
        if (!cancelled) {
          const firstLines = text.split(/\r?\n/).slice(0, 12).join('\n')
          setTextPreview(firstLines)
          logger.info('Text preview loaded, length:', firstLines.length)
        }
      } catch (error) {
        logger.error('Text preview error:', error)
        setTextPreview(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
          logger.info('Loading DOCX from:', url)
          const res = await fetch(url)
          if (!res.ok) {
            logger.error(`HTTP ${res.status}: ${res.statusText}`)
            throw new Error(`HTTP ${res.status}`)
          }
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
          logger.info('DOCX rendered successfully')
        } catch (error) {
          logger.error('DOCX preview error:', error)
        }
      })()
    }

    return () => {
      cancelled = true
      if (renderTask) {
        renderTask.cancel().catch(() => {})
      }
    }
  }, [ext, file.name])

  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-10 bg-gradient-to-r ${gradient} text-white`}></div>
      {/* Preview area */}
      <div className="relative mt-10 aspect-[4/3] w-full overflow-hidden bg-[var(--background)]">
        {ext === '.pdf' ? (
          pdfError ? (
            <div className="flex h-full w-full items-center justify-center text-[var(--muted-foreground)] text-sm">
              Preview unavailable
            </div>
          ) : (
            <canvas ref={canvasRef} className="h-full w-full" style={{ display: 'block' }} />
          )
        ) : ext === '.txt' || ext === '.md' ? (
          <div className="h-full w-full overflow-hidden p-3 text-[10px] leading-4 text-[var(--foreground)]">
            <pre className="line-clamp-10 whitespace-pre-wrap font-mono text-xs">{textPreview ?? 'Loading preview…'}</pre>
          </div>
        ) : ext === '.docx' ? (
          <div className="h-full w-full overflow-hidden bg-white dark:bg-slate-950">
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
