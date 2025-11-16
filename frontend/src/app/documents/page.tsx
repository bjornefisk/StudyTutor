"use client"

import DocumentsGallery from '@/components/DocumentsGallery'

export default function DocumentsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-6xl py-6">
        <DocumentsGallery />
      </div>
    </div>
  )
}
