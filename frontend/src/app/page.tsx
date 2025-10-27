"use client"

/**
 * Main HomePage Component
 * 
 * The primary page component for the AI Tutor application. Manages:
 * - Session state and message history
 * - File upload and document ingestion
 * - Health monitoring and status display
 * - Suggestion generation and management
 * - Responsive layout with sidebar and main chat area
 * 
 * Uses React hooks for state management and includes proper error
 * handling for API failures and network issues.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { v4 as uuid } from 'uuid'

import Header from '@/components/Header'
import ChatInterface from '@/components/ChatInterface'
import FileUploadPanel from '@/components/FileUploadPanel'
import SessionSidebar from '@/components/SessionSidebar'
import {
  createSession,
  deleteSession,
  fetchHealth,
  fetchSessionHistory,
  fetchSessions,
  fetchSuggestions,
  postChat
} from '@/lib/api'
import type { HealthResponse, Message, SessionDescriptor } from '@/types'

export default function HomePage() {
  const [sessionId, setSessionId] = useState<string>(() => uuid().slice(0, 12))
  const [messages, setMessages] = useState<Message[]>([])
  const [sessions, setSessions] = useState<SessionDescriptor[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showUploader, setShowUploader] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [banner, setBanner] = useState<string>('')
  const [useMultiQuery, setUseMultiQuery] = useState<boolean>(true)

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true)
    try {
      const data = await fetchSessions()
      setSessions(data)
    } catch (error) {
      setBanner('Unable to load sessions. Please ensure the backend is running.')
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async (id: string) => {
    try {
      const history = await fetchSessionHistory(id)
      setMessages(history)
    } catch (error) {
      setMessages([])
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const info = await fetchHealth()
        setHealth(info)
      } catch (error) {
        setBanner('Backend is unreachable. Start the FastAPI server and refresh.')
      }
    })()
    void loadSessions()
    void fetchSuggestions('').then(setSuggestions).catch(() => {})
  }, [loadSessions])

  const handleSend = useCallback(
    async (prompt: string) => {
      const userMessage: Message = {
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString()
      }
  setMessages((prev: Message[]) => [...prev, userMessage])
      setIsSending(true)
      try {
        const response = await postChat(prompt, sessionId, undefined, useMultiQuery)
        setSessionId(response.session_id)
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.reply,
          timestamp: response.timestamp,
          sources: response.sources
        }
  setMessages((prev: Message[]) => [...prev, assistantMessage])
        await loadSessions()
      } catch (error) {
        const failureMessage: Message = {
          role: 'assistant',
          content: 'Sorry, something went wrong while generating a response.',
          timestamp: new Date().toISOString()
        }
  setMessages((prev: Message[]) => [...prev, failureMessage])
      } finally {
        setIsSending(false)
      }
    },
      [loadSessions, sessionId, useMultiQuery]
  )

  const handleSuggestionSearch = useCallback(async (prefix: string) => {
    try {
      const data = await fetchSuggestions(prefix)
      setSuggestions(data)
    } catch (error) {
      /* ignore */
    }
  }, [])

  const handleSuggestionSelect = useCallback(
    (text: string) => {
      void handleSend(text)
    },
    [handleSend]
  )

  const handleCreateSession = useCallback(async () => {
    const { session_id } = await createSession()
    setSessionId(session_id)
    setMessages([])
    await loadSessions()
  }, [loadSessions])

  const handleSelectSession = useCallback(
    async (id: string) => {
      setSessionId(id)
      await loadHistory(id)
    },
    [loadHistory]
  )

  const handleDeleteSession = useCallback(
    async (id: string) => {
      if (!confirm('Delete this session?')) return
      await deleteSession(id)
      await loadSessions()
      if (id === sessionId) {
        await handleCreateSession()
      }
    },
    [handleCreateSession, loadSessions, sessionId]
  )

  const healthStatus = useMemo(() => {
    if (!health) return 'Backend status: unknown'
    return `Backend: ${health.status} • Documents indexed: ${health.documents}`
  }, [health])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Status Banner */}
        {banner && (
          <div className="border-b border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-900/50 px-4 py-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">{banner}</p>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Upload Button */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className={`h-2 w-2 rounded-full ${health?.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                <span>{healthStatus}</span>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={useMultiQuery}
                  onChange={(e) => setUseMultiQuery(e.target.checked)}
                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-muted-foreground font-medium">🔍 Multi-Query</span>
              </label>
            </div>
            <button
              type="button"
              onClick={() => setShowUploader((prev) => !prev)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5"
            >
              {showUploader ? 'Hide Upload' : '📁 Upload Files'}
            </button>
          </div>

          {/* Upload Panel */}
          {showUploader && (
            <div className="mb-6 animate-slide-up">
              <FileUploadPanel
                onClose={() => setShowUploader(false)}
                onIngestionStarted={() => setBanner('Ingestion started. Refresh sessions after it completes.')}
              />
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            {/* Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-20">
                <SessionSidebar
                  sessions={sessions}
                  isLoading={sessionsLoading}
                  currentSessionId={sessionId}
                  onCreate={() => void handleCreateSession()}
                  onSelect={(id) => void handleSelectSession(id)}
                  onDelete={(id) => void handleDeleteSession(id)}
                  onRefresh={() => void loadSessions()}
                />
              </div>
            </aside>

            {/* Chat Interface */}
            <section className="relative min-h-[calc(100vh-16rem)] overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl dark:bg-slate-900/40">
              <ChatInterface
                messages={messages}
                isLoading={isSending}
                onSend={handleSend}
                suggestions={suggestions}
                onSuggestionSelect={handleSuggestionSelect}
                onSuggestionSearch={handleSuggestionSearch}
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
