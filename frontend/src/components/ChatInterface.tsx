/**
 * ChatInterface Component
 * 
 * The main chat interface for the AI Tutor application. Features include:
 * - Real-time message display with markdown rendering
 * - Source citations with relevance scores
 * - AI-powered question suggestions
 * - Responsive design with smooth animations
 * - Keyboard shortcuts (Enter to send, Shift+Enter for new line)
 * - Auto-scrolling and auto-resizing textarea
 * 
 * Uses ReactMarkdown for rendering assistant responses and includes
 * proper accessibility features for screen readers.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'

import type { Message } from '@/types'

interface ChatInterfaceProps {
  messages: Message[]
  isLoading: boolean
  onSend: (message: string) => Promise<void>
  suggestions: string[]
  onSuggestionSelect: (suggestion: string) => void
  onSuggestionSearch: (prefix: string) => void
}

export default function ChatInterface({
  messages,
  isLoading,
  onSend,
  suggestions,
  onSuggestionSelect,
  onSuggestionSearch
}: ChatInterfaceProps) {
  const [draft, setDraft] = useState('')
  const [suggestionQuery, setSuggestionQuery] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
  }, [draft])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      onSuggestionSearch(suggestionQuery)
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [suggestionQuery, onSuggestionSearch])

  const placeholder = useMemo(
    () => 'Ask a question about your study materials… (Shift+Enter for a new line)',
    []
  )

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim()
    if (!trimmed || isLoading) return

    await onSend(trimmed)
    setDraft('')
  }, [draft, isLoading, onSend])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        void handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-purple-900/60 via-slate-900/80 to-blue-900/60" aria-hidden="true" />
      <div className="absolute -top-32 left-10 h-64 w-64 rounded-full bg-purple-500/30 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-40 right-10 h-72 w-72 rounded-full bg-blue-500/30 blur-[120px]" aria-hidden="true" />

      <div className="relative flex h-full flex-col">
        <div
          ref={containerRef}
          className="flex-1 space-y-5 overflow-y-auto px-5 py-8 sm:px-8"
          aria-live="polite"
        >
          {messages.length === 0 && !isLoading ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-200">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl shadow-lg backdrop-blur">🎓</div>
              <h2 className="bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200 bg-clip-text text-2xl font-semibold text-transparent md:text-3xl">
                Study Assistant
              </h2>
              <p className="mt-3 max-w-md text-sm text-slate-300 md:text-base">
                Upload documents, then ask questions. Responses reference the most relevant passages.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={`${message.role}-${message.timestamp}`}
                className={clsx('flex transition-all duration-300', {
                  'justify-end': message.role === 'user',
                  'justify-start': message.role !== 'user'
                })}
              >
                <div
                  className={clsx(
                    'max-w-2xl rounded-3xl px-6 py-5 shadow-xl transition-all duration-300',
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white shadow-purple-500/40'
                      : 'border border-white/10 bg-white/10 text-slate-50 backdrop-blur-xl dark:bg-slate-900/60'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-invert max-w-none text-sm md:text-base">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed md:text-base">
                      {message.content}
                    </p>
                  )}

                  <div className="mt-3 text-xs text-slate-200/70">
                    {new Date(message.timestamp).toLocaleString()}
                  </div>

                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 space-y-3 rounded-2xl border border-white/15 bg-white/5 p-4 text-slate-100 shadow-inner backdrop-blur-md">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-200/80">
                        Sources
                      </div>
                      {message.sources.map((source) => (
                        <div
                          key={`${source.source}-${source.chunk_index}`}
                          className="rounded-xl border border-white/10 bg-black/10 p-3 text-xs text-slate-100 transition hover:border-purple-300/40"
                        >
                          <div className="font-medium text-slate-100">
                            {source.source} • page {source.page}, chunk {source.chunk_index}
                          </div>
                          <div className="mt-1 line-clamp-2 text-slate-200/80">{source.text}</div>
                          <div className="mt-2 text-[11px] uppercase tracking-wide text-slate-300/70">
                            Relevance {(source.score * 100).toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white shadow-lg backdrop-blur">
                <span className="h-2 w-2 animate-ping rounded-full bg-purple-300" />
                <span>Thinking…</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 bg-black/30 px-4 py-5 shadow-inner backdrop-blur md:px-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="suggestion-search">
              Search prompts
            </label>
            <input
              id="suggestion-search"
              value={suggestionQuery}
              onChange={(event) => setSuggestionQuery(event.target.value)}
              placeholder="Search helpful prompts"
              className="h-11 rounded-xl border border-white/10 bg-white/10 px-4 text-sm text-white placeholder:text-slate-300 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400/40"
            />
            <div className="flex flex-1 flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion}
                  onClick={() => onSuggestionSelect(suggestion)}
                  className="group rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-300/40 hover:bg-white/20"
                >
                  <span className="bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200 bg-clip-text text-transparent">
                    {suggestion}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="max-h-40 min-h-[64px] flex-1 resize-none rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white shadow-lg shadow-purple-500/20 backdrop-blur focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400/40 md:text-base"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isLoading || !draft.trim()}
              className="group flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-sm font-semibold text-white shadow-xl shadow-purple-500/30 transition-all duration-300 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-16"
              aria-label="Send message"
            >
              <span className="transition-transform group-hover:translate-x-0.5">➤</span>
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-slate-300">
            Press Enter to send · Shift + Enter for a new line
          </p>
        </div>
      </div>
    </div>
  )
}
