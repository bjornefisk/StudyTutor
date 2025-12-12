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
 */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'
import { Send, Paperclip, Loader2 } from 'lucide-react'
import { postChat, fetchSessionHistory, uploadDocuments, triggerIngestion } from '@/lib/api'

import type { Message } from '@/types'

interface ChatInterfaceProps {
  chatId: string | null
}

export default function ChatInterface({ chatId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  
  const suggestions = [
    "Explain this concept in simple terms",
    "Create a summary of my notes",
    "Summarize the latest document in a few bullet points"
  ]

  // Load chat history when chatId changes
  useEffect(() => {
    if (!chatId) {
      setMessages([])
      return
    }
    
    async function loadHistory() {
      try {
        const history = await fetchSessionHistory(chatId!)
        setMessages(history)
      } catch (error) {
        console.error('Failed to load chat history:', error)
      }
    }
    
    loadHistory()
  }, [chatId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isLoading])

  // Auto-resize textarea
  useEffect(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
  }, [draft])

  const handleSend = useCallback(async (message?: string) => {
    const content = message || draft.trim()
    if (!content || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }

    setMessages((prev) => [...prev, userMessage])
    setDraft('')
    setIsLoading(true)

    try {
      const response = await postChat(content, chatId || undefined)
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
        sources: response.sources
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        timestamp: new Date().toISOString()
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [draft, isLoading, chatId])

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
    <div className="flex h-full flex-col bg-[var(--background)]">
      {/* Messages Area - Scrollable */}
      <div
        ref={containerRef}
        className="flex-1 space-y-5 overflow-y-auto px-4 py-6 md:px-6"
        aria-live="polite"
      >
        <div className="mx-auto max-w-4xl space-y-4">
          {messages.length === 0 && !isLoading ? (
            <div className="flex h-full flex-col items-center justify-center py-20 text-center">
              <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)]">
                <Send className="h-12 w-12" />
              </div>
              <h2 className="mb-3 text-3xl font-semibold text-[var(--foreground)]">
                Start a Conversation
              </h2>
              <p className="max-w-md mb-8 text-sm text-[var(--muted-foreground)]">
                Ask questions about your study materials or request help refining your notes.
              </p>
              
              {/* Centered Floating Suggestions */}
              <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
                {suggestions.map((suggestion, index) => (
                  <button
                    type="button"
                    key={`${suggestion}-${index}`}
                    onClick={() => handleSend(suggestion)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-sm text-[var(--foreground)] transition-all hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] hover:shadow-md"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${message.timestamp}-${index}`}
                className={clsx('flex transition-all duration-200', {
                  'justify-end': message.role === 'user',
                  'justify-start': message.role !== 'user'
                })}
              >
                <div
                  className={clsx(
                    'max-w-2xl rounded-lg px-4 py-3 shadow-sm',
                    message.role === 'user'
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : 'bg-[var(--muted)] text-[var(--foreground)]'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </p>
                  )}

                  <div className="mt-2 text-xs opacity-60">
                    {new Date(message.timestamp).toLocaleString()}
                  </div>

                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                      <div className="text-xs font-semibold text-[var(--muted-foreground)]">
                        Sources
                      </div>
                      {message.sources.map((source, sourceIndex) => (
                        <div
                          key={`${source.source}-${source.chunk_index}-${sourceIndex}`}
                          className="rounded border border-[var(--border)] bg-[var(--background)] p-2 text-xs"
                        >
                          <div className="font-medium text-[var(--foreground)]">
                            {source.source} • page {source.page}, chunk {source.chunk_index}
                          </div>
                          <div className="mt-1 line-clamp-2 text-[var(--muted-foreground)]">
                            {source.text}
                          </div>
                          <div className="mt-1 text-[10px] text-[var(--muted-foreground)]">
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
              <div className="flex items-center gap-2 rounded-lg bg-[var(--muted)] px-4 py-2 text-sm text-[var(--muted-foreground)]">
                <span className="h-2 w-2 animate-ping rounded-full bg-[var(--primary)]" />
                <span>Thinking…</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div className="border-t border-[var(--border)] bg-[var(--background)] px-4 py-4 md:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="max-h-40 min-h-[64px] flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)] disabled:opacity-50"
            disabled={isLoading || isUploading}
          />
          <div className="flex items-center gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              multiple
              className="hidden"
              onChange={async (event) => {
                const files = event.target.files
                if (!files || files.length === 0) return
                try {
                  setIsUploading(true)
                  setUploadStatus('Uploading…')
                  const arr = Array.from(files)
                  const result = await uploadDocuments(arr)
                  const success = result.count ? `Uploaded ${result.count} file${result.count > 1 ? 's' : ''}. ` : ''
                  const errs = result.errors?.length ? `Errors: ${result.errors.join('; ')}` : ''
                  setUploadStatus(`${success}${errs}`.trim())
                  // Kick off ingestion automatically after successful upload
                  if (result.count) {
                    const ingest = await triggerIngestion()
                    setUploadStatus((prev) => `${prev} ${ingest.message}`.trim())
                  }
                } catch (e) {
                  setUploadStatus('Upload failed. Please try again.')
                } finally {
                  setIsUploading(false)
                  // Reset the input so selecting the same files again triggers change
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }
              }}
            />

            {/* Upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Upload documents"
              title="Upload documents"
            >
              {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
            </button>

            {/* Send button */}
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isLoading || isUploading || !draft.trim()}
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-col items-center gap-1 text-xs text-[var(--muted-foreground)]">
          <p>Press Enter to send · Shift + Enter for new line</p>
          {uploadStatus ? (
            <p className="text-[var(--foreground)]/70">{uploadStatus}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
