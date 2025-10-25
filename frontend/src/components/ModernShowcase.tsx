"use client"

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Sparkles } from 'lucide-react'

type Highlight = {
  title: string
  description: string
  metric: string
  status?: string
}

interface ModernShowcaseProps {
  heading: string
  subheading?: string
  highlights: Highlight[]
  ctaLabel?: string
  onCtaClick?: () => void
  isLoading?: boolean
}

const AUTO_ROTATE_INTERVAL = 8000

export default function ModernShowcase({
  heading,
  subheading,
  highlights,
  ctaLabel = 'Get started',
  onCtaClick,
  isLoading = false,
}: ModernShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  const cappedHighlights = useMemo(() => highlights.slice(0, 6), [highlights])
  const hasMultipleHighlights = cappedHighlights.length > 1

  useEffect(() => {
    // Cycle through highlights automatically for passive discovery.
    if (!hasMultipleHighlights) return

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % cappedHighlights.length)
    }, AUTO_ROTATE_INTERVAL)

    return () => window.clearInterval(timer)
  }, [cappedHighlights.length, hasMultipleHighlights])

  const handleSelect = (index: number) => {
    setActiveIndex(index)
  }

  const activeHighlight = cappedHighlights[activeIndex] ?? null

  return (
    <section
      className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-600/40 via-pink-500/30 to-blue-500/40 p-[1px] shadow-2xl"
      aria-labelledby="modern-showcase-heading"
    >
      <div className="absolute inset-0 -z-10 bg-black/70 dark:bg-slate-950/80" aria-hidden="true" />
      <div className="absolute -top-24 left-0 h-64 w-64 rounded-full bg-purple-500/40 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-32 right-6 h-72 w-72 rounded-full bg-blue-500/40 blur-[120px]" aria-hidden="true" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-12 px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <header className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-lg backdrop-blur-md">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Curated insights
          </span>
          <h2
            id="modern-showcase-heading"
            className="mt-6 bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200 bg-clip-text text-3xl font-bold text-transparent md:text-4xl lg:text-5xl"
          >
            {heading}
          </h2>
          {subheading ? (
            <p className="mt-4 max-w-2xl text-sm text-slate-200 md:text-base dark:text-slate-300">
              {subheading}
            </p>
          ) : null}
        </header>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Skeleton state keeps layout stable while data loads. */}
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="animate-pulse rounded-2xl bg-white/10 p-6 backdrop-blur-sm"
                aria-hidden="true"
              >
                <div className="h-4 w-24 rounded-full bg-white/20" />
                <div className="mt-4 h-6 w-32 rounded-full bg-white/20" />
                <div className="mt-6 h-16 w-full rounded-xl bg-white/10" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" role="list">
              {cappedHighlights.map((highlight, index) => {
                const isActive = index === activeIndex

                return (
                  <button
                    key={highlight.title}
                    type="button"
                    onClick={() => handleSelect(index)}
                    className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/10 p-6 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-purple-300 dark:bg-slate-900/50"
                    aria-pressed={isActive}
                    role="listitem"
                  >
                    <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-100">
                      {highlight.status ?? 'Featured'}
                      <ArrowRight className="h-4 w-4 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" aria-hidden="true" />
                    </span>
                    <h3 className="mt-6 text-lg font-semibold text-white md:text-xl">
                      {highlight.title}
                    </h3>
                    <p className="mt-3 text-sm text-slate-200 md:text-base">
                      {highlight.description}
                    </p>
                    <div className="mt-6 flex items-end justify-between">
                      <span className="bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200 bg-clip-text text-3xl font-bold text-transparent">
                        {highlight.metric}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-white/90 text-slate-900 shadow-lg'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        {isActive ? 'Active' : 'View more'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {activeHighlight ? (
              <article
                className="group relative overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-8 shadow-xl backdrop-blur-xl transition-all duration-300 hover:shadow-2xl dark:bg-slate-900/60"
                aria-live="polite"
              >
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-blue-500/20 opacity-0 transition duration-500 group-hover:opacity-100" aria-hidden="true" />
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-2xl">
                    <h3 className="text-2xl font-semibold text-white md:text-3xl">
                      {activeHighlight.title}
                    </h3>
                    <p className="mt-3 text-sm text-slate-100 md:text-base">
                      {activeHighlight.description}
                    </p>
                  </div>
                  <div className="flex min-w-[180px] flex-col items-end gap-4 text-right">
                    <span className="bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
                      {activeHighlight.metric}
                    </span>
                    <span className="flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Highlighted metric
                    </span>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-sm text-slate-200">
                    <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md" aria-hidden="true" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-300">Why it matters</p>
                      <p className="text-sm text-slate-100">Track performance across your most meaningful metrics.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onCtaClick}
                    className="group inline-flex items-center gap-2 rounded-full bg-white/90 px-5 py-2 text-sm font-semibold text-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white"
                    aria-label={ctaLabel}
                  >
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </button>
                </div>
              </article>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}
