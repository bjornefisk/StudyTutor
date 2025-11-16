"use client"

import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  Loader2,
  Moon,
  PenSquare,
  Plus,
  RefreshCw,
  Sparkles,
  Sun,
  UploadCloud,
  Wand2
} from 'lucide-react'

import type { Message } from '@/types'

import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Separator } from './ui/separator'
import { Textarea } from './ui/textarea'
import { Select, SelectItem } from './ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

interface SessionSummary {
  id: string
  name: string
  summary?: string
  updatedAt?: string
}

type Personality = 'academic' | 'casual' | 'humorous'

interface TutorDashboardProps {
  sessions: SessionSummary[]
  currentSessionId: string | null
  onCreateSession: () => void
  onSelectSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  onRenameSession: (sessionId: string, nextName: string) => Promise<void>
  onRefreshSessions: () => void
  messages: Message[]
  isSending: boolean
  onSendMessage: (message: string, personality: Personality) => Promise<void>
  suggestions: string[]
  followUps: string[]
  onSuggestionSelect: (prompt: string) => void
  onFollowUpSelect: (prompt: string) => void
  onUploadFiles: (files: FileList) => Promise<void>
  isUploading: boolean
  uploadProgress: number | null
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  aiPersonality: Personality
  onPersonalityChange: (next: Personality) => void
}

const quickActions = ['Summarize key points', 'Explain this topic', 'Quiz me']

export default function TutorDashboard({
  sessions,
  currentSessionId,
  onCreateSession,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onRefreshSessions,
  messages,
  isSending,
  onSendMessage,
  suggestions,
  followUps,
  onSuggestionSelect,
  onFollowUpSelect,
  onUploadFiles,
  isUploading,
  uploadProgress,
  theme,
  onToggleTheme,
  aiPersonality,
  onPersonalityChange
}: TutorDashboardProps) {
  const [draft, setDraft] = useState('')
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === currentSessionId) ?? null,
    [sessions, currentSessionId]
  )

  const visibleSuggestions = useMemo(() => suggestions.slice(0, 3), [suggestions])
  const visibleFollowUps = useMemo(() => followUps.slice(0, 3), [followUps])

  const handleSend = async () => {
    const trimmed = draft.trim()
    if (!trimmed || isSending) return
    await onSendMessage(trimmed, aiPersonality)
    setDraft('')
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    await onUploadFiles(files)
  }

  const handleRename = async () => {
    if (!editingSessionId) return
    const next = editingValue.trim() || 'Untitled session'
    await onRenameSession(editingSessionId, next)
    setEditingSessionId(null)
    setEditingValue('')
  }

  return (
    <TooltipProvider>
      <section className="relative min-h-screen overflow-hidden bg-[#0b0d18]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(109,40,217,0.35),_transparent_55%)] opacity-100 transition-opacity duration-700" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(147,51,234,0.25),_transparent_60%)] opacity-100 transition-opacity duration-1000" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200 bg-clip-text text-3xl font-semibold text-transparent md:text-4xl">
                AI Tutor
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-300 md:text-base">
                Continue your study sessions, ingest new material, and explore insights.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-100 backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                Running locally
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleTheme}
                    className="h-10 w-10 rounded-full border border-white/10 bg-white/10 text-slate-100 transition hover:bg-white/20"
                    aria-label="Toggle theme"
                  >
                    {theme === 'dark' ? <Moon className="h-5 w-5 transition-transform duration-200" /> : <Sun className="h-5 w-5 transition-transform duration-200" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent sideOffset={8}>Toggle light / dark theme</TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white/10 text-xs font-medium text-purple-100">
                  Personality
                </Badge>
                <Select
                  value={aiPersonality}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onPersonalityChange(e.target.value as Personality)}
                  className="h-10 w-[150px] rounded-xl border border-white/10 bg-white/10 text-sm text-white backdrop-blur"
                >
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="humorous">Humorous</SelectItem>
                </Select>
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur-md">
                <div>
                  <p className="text-sm font-medium text-white">Sessions</p>
                  <p className="text-xs text-slate-300">Pick up where you left off</p>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRefreshSessions}
                        className="h-10 w-10 rounded-xl border border-white/10 bg-white/10 text-slate-100 transition hover:-translate-y-0.5 hover:bg-white/20"
                        aria-label="Refresh sessions"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8}>Refresh session list</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        size="icon"
                        onClick={onCreateSession}
                        className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 text-white shadow-lg shadow-purple-500/30 transition hover:-translate-y-0.5 hover:shadow-purple-500/40"
                        aria-label="New session"
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8}>Start a new session</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="space-y-3">
                {sessions.map((session) => {
                    const isActive = session.id === currentSessionId
                    const isEditing = editingSessionId === session.id

                    return (
                      <div key={session.id} className="transition">
                        <Card
                          className={`group border-white/10 bg-white/5 shadow-lg shadow-purple-500/10 backdrop-blur-lg transition hover:-translate-y-1 hover:shadow-purple-500/20 ${
                            isActive ? 'border-purple-400/60 bg-purple-500/10' : ''
                          }`}
                        >
                          <CardContent className="flex flex-col gap-3 p-4">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editingValue}
                                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEditingValue(event.target.value)}
                                  className="h-9 flex-1 rounded-lg border border-white/10 bg-white/10 text-sm text-white placeholder:text-slate-300 focus:border-purple-300 focus-visible:ring-purple-400/40"
                                />
                                <Button size="sm" onClick={handleRename} className="rounded-lg bg-emerald-500 text-white">
                                  Save
                                </Button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSelectSession(session.id)}
                                className="flex w-full flex-col items-start text-left"
                              >
                                <h3 className="text-sm font-semibold text-white">
                                  {session.name || 'Untitled session'}
                                </h3>
                                <p className="mt-1 line-clamp-2 text-xs text-slate-300">
                                  {session.summary || 'No summary available yet.'}
                                </p>
                                {session.updatedAt ? (
                                  <span className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">
                                    Updated {new Date(session.updatedAt).toLocaleString()}
                                  </span>
                                ) : null}
                              </button>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-slate-300">
                                <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                                AI companion ready
                              </div>
                              <div className="flex items-center gap-2">
                                {!isEditing ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setEditingSessionId(session.id)
                                          setEditingValue(session.name || '')
                                        }}
                                        className="h-8 w-8 rounded-lg border border-white/10 bg-white/10 text-slate-200 transition hover:bg-white/20"
                                        aria-label="Rename session"
                                      >
                                        <PenSquare className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent sideOffset={8}>Rename session</TooltipContent>
                                  </Tooltip>
                                ) : null}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => onDeleteSession(session.id)}
                                      className="h-8 w-8 rounded-lg border border-white/10 bg-white/10 text-slate-200 transition hover:bg-white/20"
                                      aria-label="Delete session"
                                    >
                                      <Wand2 className="h-4 w-4 rotate-45" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent sideOffset={8}>Archive session</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                {sessions.length === 0 ? (
                  <p className="text-sm text-slate-400">No sessions yet. Create one to get started.</p>
                ) : null}
              </div>
            </aside>

            <main className="space-y-6">
              <div
                className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-purple-500/20 backdrop-blur-xl transition ${
                  isDragging ? 'ring-2 ring-purple-400/70' : ''
                }`}
                onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={async (event: React.DragEvent<HTMLDivElement>) => {
                  event.preventDefault()
                  setIsDragging(false)
                  const files = event.dataTransfer.files
                  await handleFiles(files)
                }}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white md:text-xl">
                      {activeSession ? `Continue "${activeSession.name || 'Untitled'}"` : 'Welcome aboard'}
                    </h2>
                    <p className="text-sm text-slate-300">
                      Drop PDFs, DOCX, Markdown, or TXT to enrich the AI tutor with new knowledge.
                    </p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:-translate-y-0.5 hover:shadow-purple-500/40">
                        <UploadCloud className="h-4 w-4" />
                        Upload material
                        <input
                          type="file"
                          multiple
                          hidden
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) => void handleFiles(event.target.files)}
                        />
                      </label>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8}>Upload study materials</TooltipContent>
                  </Tooltip>
                </div>

                {isUploading ? (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 transition">
                    <p className="text-sm text-slate-200">Uploading…</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 transition-all duration-300"
                        style={{ width: `${uploadProgress ?? 20}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-300">
                      {uploadProgress !== null ? `${Math.round(uploadProgress)}%` : 'Preparing files…'}
                    </p>
                  </div>
                ) : uploadProgress === 100 ? (
                  <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-400/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 transition">
                    <Check className="h-4 w-4" />
                    Files ingested successfully. Refresh sessions to see updates.
                  </div>
                ) : null}
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-purple-500/20 backdrop-blur-xl">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500" />
                <div className="grid gap-6 p-6 lg:grid-cols-[2fr_1fr] lg:gap-8">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      <Sparkles className="h-4 w-4 text-purple-300" />
                      Smart suggestions based on your library
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {quickActions.map((action) => (
                        <Button
                          key={action}
                          variant="outline"
                          onClick={() => onSuggestionSelect(action)}
                          className="rounded-full border-white/15 bg-white/10 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/20"
                        >
                          {action}
                        </Button>
                      ))}
                    </div>

                    <Textarea
                      value={draft}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(event.target.value)}
                      placeholder="Ask something about your uploaded materials…"
                      className="min-h-[140px] rounded-2xl border border-white/10 bg-black/30 text-sm text-white shadow-inner backdrop-blur focus-visible:ring-purple-400/40 md:text-base"
                    />

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        {visibleSuggestions.map((suggestion) => (
                          <Badge
                            key={suggestion}
                            variant="secondary"
                            onClick={() => onSuggestionSelect(suggestion)}
                            className="cursor-pointer rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white transition hover:-translate-y-0.5 hover:bg-white/20"
                          >
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        onClick={() => void handleSend()}
                        disabled={isSending || !draft.trim()}
                        className="group flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:translate-x-0.5 hover:shadow-purple-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        )}
                        Send message
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">Chat history</h3>
                      <Badge variant="secondary" className="bg-white/10 text-xs text-white">
                        {messages.length} messages
                      </Badge>
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="space-y-4 overflow-y-auto pr-1 text-sm max-h-[320px]">
                      {messages.length === 0 ? (
                        <p className="text-slate-300">No messages yet.</p>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={`${message.role}-${message.timestamp}`}
                            className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-slate-200"
                          >
                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span className="font-medium text-white">{message.role === 'user' ? 'You' : 'Tutor'}</span>
                              <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="mt-2 text-sm text-slate-200">{message.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                    {visibleFollowUps.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-slate-400">Follow-up ideas</p>
                        <div className="flex flex-wrap gap-2">
                          {visibleFollowUps.map((followUp) => (
                            <Button
                              key={followUp}
                              variant="ghost"
                              size="sm"
                              onClick={() => onFollowUpSelect(followUp)}
                              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white transition hover:-translate-y-0.5 hover:bg-white/20"
                            >
                              {followUp}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </section>
    </TooltipProvider>
  )
}
