"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { v4 as uuid } from 'uuid'

import BrutalistHeader from '@/components/BrutalistHeader'
import BrutalistSidebar from '@/components/BrutalistSidebar'
import ChatInterface from '@/components/ChatInterface'
import FileUploadPanel from '@/components/FileUploadPanel'
import FlashcardManager from '@/components/FlashcardManager'
import NotesManager from '@/components/NotesManager'
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

type ViewMode = 'chat' | 'flashcards' | 'notes'

export default function HomePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('chat')
  const [sessionId, setSessionId] = useState<string>(() => uuid().slice(0, 12))
  const [messages, setMessages] = useState<Message[]>([])
  const [sessions, setSessions] = useState<SessionDescriptor[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showUploader, setShowUploader] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [banner, setBanner] = useState<string>('')
  const [useMultiQuery] = useState<boolean>(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { theme, toggleTheme } = useTheme()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

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

  const handleNewChat = useCallback(() => {
    const newId = uuid().slice(0, 12)
    setSessionId(newId)
    setMessages([])
    setViewMode('chat')
  }, [])

  const healthStatus = useMemo(() => {
    if (!health) return 'Backend status: unknown'
    return `Backend: ${health.status} • Documents indexed: ${health.documents}`
  }, [health])

  const formattedSessions = sessions.map(s => ({
    id: s.id,
    name: s.id.slice(0, 8)
  }))

  const darkMode = theme === 'dark'

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Desktop Sidebar */}
      <BrutalistSidebar
        currentView={viewMode}
        onViewChange={setViewMode}
        sessions={formattedSessions}
        onSessionSelect={handleSelectSession}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isMobile={false}
        onNewChat={handleNewChat}
        darkMode={darkMode}
      />

      {/* Mobile Sidebar */}
      <BrutalistSidebar
        currentView={viewMode}
        onViewChange={(view) => {
          setViewMode(view)
          setMobileSidebarOpen(false)
        }}
        sessions={formattedSessions}
        onSessionSelect={(id) => {
          handleSelectSession(id)
          setMobileSidebarOpen(false)
        }}
        isOpen={mobileSidebarOpen}
        onToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        onClose={() => setMobileSidebarOpen(false)}
        isMobile={true}
        onNewChat={() => {
          handleNewChat()
          setMobileSidebarOpen(false)
        }}
        darkMode={darkMode}
      />

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <BrutalistHeader onToggleSidebar={() => setMobileSidebarOpen(true)} darkMode={darkMode} />

        {/* Status Banner */}
        {banner && (
          <div className={`border-b-4 border-black px-4 py-3 ${darkMode ? 'bg-yellow-400' : 'bg-yellow-400'}`}>
            <p className="text-sm font-bold uppercase text-black">{banner}</p>
          </div>
        )}

        {/* Top Bar with Upload + Theme toggle (navigation handled by sidebar) */}
        <div className={`border-b-4 border-black px-4 py-3 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            {/* Upload Button (Left) */}
            {viewMode === 'chat' && (
              <button
                type="button"
                onClick={() => setShowUploader((prev) => !prev)}
                className={`border-2 border-black px-4 py-2 text-sm font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                  darkMode ? 'bg-blue-600 text-white hover:bg-red-600' : 'bg-blue-600 text-white hover:bg-red-600'
                }`}
              >
                {showUploader ? '✕ Hide Upload' : '📁 Upload Files'}
              </button>
            )}
            {viewMode !== 'chat' && <div />}

            {/* Theme toggle (right) */}
            <div className="flex items-center gap-3">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className={`border-2 border-black px-3 py-2 text-sm font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                  darkMode ? 'bg-yellow-400 text-black' : 'bg-black text-white'
                }`}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Upload Panel */}
          {showUploader && viewMode === 'chat' && (
            <div className="border-b-4 border-black animate-slide-up">
              <FileUploadPanel
                onClose={() => setShowUploader(false)}
                onIngestionStarted={() => setBanner('Ingestion started. Refresh sessions after it completes.')}
              />
            </div>
          )}

          {/* Views */}
          {viewMode === 'chat' && (
            <div className="flex-1 overflow-hidden">
              <ChatInterface
                messages={messages}
                isLoading={isSending}
                onSend={handleSend}
                suggestions={suggestions}
                onSuggestionSelect={handleSuggestionSelect}
                onSuggestionSearch={handleSuggestionSearch}
                darkMode={darkMode}
              />
            </div>
          )}

          {viewMode === 'flashcards' && (
            <div className="flex-1 overflow-auto">
              <FlashcardManager />
            </div>
          )}

          {viewMode === 'notes' && (
            <div className="flex-1 overflow-auto">
              <NotesManager />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
