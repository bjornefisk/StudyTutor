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
import { Send } from 'lucide-react'

import type { Message } from '@/types'

interface ChatInterfaceProps {
  messages: Message[]
  isLoading: boolean
  onSend: (message: string) => Promise<void>
  suggestions: string[]
  onSuggestionSelect: (suggestion: string) => void
  onSuggestionSearch: (prefix: string) => void
  darkMode?: boolean
}

export default function ChatInterface({
  messages,
  isLoading,
  onSend,
  suggestions,
  onSuggestionSelect,
  onSuggestionSearch,
  darkMode = false
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
    <div className={`flex h-full flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Messages Area - Scrollable */}
      <div
        ref={containerRef}
        className="flex-1 space-y-5 overflow-y-auto px-4 py-6 md:px-6"
        aria-live="polite"
      >
        <div className="mx-auto max-w-4xl space-y-4">
          {messages.length === 0 && !isLoading ? (
            <div className="flex h-full flex-col items-center justify-center py-20 text-center">
              <div className="relative mb-8 h-24 w-24">
                <div className="absolute left-0 top-0 h-16 w-16 border-4 border-black bg-red-600"></div>
                <div className="absolute bottom-0 right-0 h-16 w-16 border-4 border-black bg-yellow-400"></div>
                <div className="absolute left-8 top-8 h-8 w-8 rounded-full border-4 border-black bg-blue-600"></div>
              </div>
              <h2 className={`mb-3 font-black text-3xl uppercase tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>
                Start Session
              </h2>
              <p className={`max-w-md font-bold text-sm uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Upload documents and ask questions
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={`${message.role}-${message.timestamp}`}
                className={clsx('flex transition-all duration-200', {
                  'justify-end': message.role === 'user',
                  'justify-start': message.role !== 'user'
                })}
              >
                <div
                  className={clsx(
                    'max-w-2xl border-4 border-black px-6 py-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
                    message.role === 'user'
                      ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <div className={`prose max-w-none text-sm prose-headings:font-black prose-headings:uppercase prose-strong:font-black prose-a:font-bold prose-a:text-red-600 prose-a:underline md:text-base ${
                      darkMode ? 'prose-invert' : ''
                    }`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm font-bold leading-relaxed md:text-base">
                      {message.content}
                    </p>
                  )}

                  <div
                    className={clsx('mt-3 font-bold text-xs uppercase tracking-wide', 
                      message.role === 'user' ? 'text-white/70' : darkMode ? 'text-gray-400' : 'text-black/50'
                    )}
                  >
                    {new Date(message.timestamp).toLocaleString()}
                  </div>

                  {message.sources && message.sources.length > 0 && (
                    <div className={`mt-4 space-y-3 border-2 border-black p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                      darkMode ? 'bg-yellow-400' : 'bg-yellow-400'
                    }`}>
                      <div className="font-black text-xs uppercase tracking-wide text-black">
                        Sources
                      </div>
                      {message.sources.map((source) => (
                        <div
                          key={`${source.source}-${source.chunk_index}`}
                          className={`border-2 border-black p-3 text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'
                          }`}
                        >
                          <div className={`font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
                            {source.source} • page {source.page}, chunk {source.chunk_index}
                          </div>
                          <div className={`mt-1 line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-black/70'}`}>
                            {source.text}
                          </div>
                          <div className={`mt-2 font-bold text-[11px] uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-black/60'}`}>
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
              <div className={`flex items-center gap-3 border-2 border-black px-4 py-3 text-sm font-bold uppercase tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'
              }`}>
                <span className="h-2 w-2 animate-ping rounded-full bg-red-600" />
                <span>Thinking…</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div className={`border-t-4 border-black px-4 py-5 md:px-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="suggestion-search">
            Search prompts
          </label>
          <input
            id="suggestion-search"
            value={suggestionQuery}
            onChange={(event) => setSuggestionQuery(event.target.value)}
            placeholder="SEARCH PROMPTS"
            className={`h-11 border-2 border-black px-4 text-sm font-bold uppercase tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:border-black focus:outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
              darkMode ? 'bg-gray-700 text-white placeholder:text-gray-400' : 'bg-white text-black placeholder:text-black/40'
            }`}
          />
          <div className="flex flex-1 flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                onClick={() => onSuggestionSelect(suggestion)}
                className={`group border-2 border-black px-3 py-1 text-xs font-bold uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-yellow-400 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-white text-black'
                }`}
              >
                {suggestion}
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
            placeholder="TYPE YOUR MESSAGE HERE..."
            className={`max-h-40 min-h-[64px] flex-1 resize-none border-4 border-black px-4 py-3 text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] placeholder:font-bold placeholder:uppercase placeholder:tracking-wide focus:border-black focus:outline-none focus:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 md:text-base ${
              darkMode ? 'bg-gray-700 text-white placeholder:text-gray-400' : 'bg-white text-black placeholder:text-black/40'
            }`}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={isLoading || !draft.trim()}
            className="group flex h-14 w-full items-center justify-center border-4 border-black bg-black text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-red-600 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-16"
            aria-label="Send message"
          >
            <Send className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
        <p className={`mt-3 text-center font-bold text-xs uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-black/60'}`}>
          Press Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </div>
  )
}
