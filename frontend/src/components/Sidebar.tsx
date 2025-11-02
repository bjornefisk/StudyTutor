'use client'

import { MessageSquare, FileText, Brain, Plus, Clock, Files } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  activeView: 'chat' | 'notes' | 'flashcards' | 'documents'
  setActiveView: (view: 'chat' | 'notes' | 'flashcards' | 'documents') => void
  chatHistory: Array<{ id: string; title: string; timestamp: Date }>
  activeChatId: string | null
  setActiveChatId: (id: string) => void
  onNewChat: () => void
}

export function Sidebar({
  activeView,
  setActiveView,
  chatHistory,
  activeChatId,
  setActiveChatId,
  onNewChat,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--sidebar-border)]">
        <h1 className="text-lg font-semibold text-[var(--sidebar-foreground)]">
          AI Tutor
        </h1>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1 border-b border-[var(--sidebar-border)]">
        <button
          onClick={() => setActiveView('chat')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
            activeView === 'chat'
              ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
              : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]'
          )}
        >
          <MessageSquare className="w-5 h-5" />
          <span>Chat</span>
        </button>

        <button
          onClick={() => setActiveView('documents')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
            activeView === 'documents'
              ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
              : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]'
          )}
        >
          <Files className="w-5 h-5" />
          <span>Documents</span>
        </button>

        <button
          onClick={() => setActiveView('notes')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
            activeView === 'notes'
              ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
              : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]'
          )}
        >
          <FileText className="w-5 h-5" />
          <span>Notes</span>
        </button>

        <button
          onClick={() => setActiveView('flashcards')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
            activeView === 'flashcards'
              ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
              : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]'
          )}
        >
          <Brain className="w-5 h-5" />
          <span>Flashcards</span>
        </button>
      </nav>

      {/* Chat History - Takes remaining space */}
      {activeView === 'chat' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chatHistory.length > 0 ? (
            chatHistory.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg transition-colors group',
                  activeChatId === chat.id
                    ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
                    : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]'
                )}
              >
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-60" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{chat.title}</p>
                    <p className="text-xs opacity-60">
                      {chat.timestamp.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-sm text-[var(--sidebar-foreground)] opacity-60">
              No chat history yet
            </div>
          )}
        </div>
      )}

      {/* New Chat Button - Fixed at Bottom */}
      {activeView === 'chat' && (
        <div className="p-4 border-t border-[var(--sidebar-border)]">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:opacity-90 transition-opacity font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>New Chat</span>
          </button>
        </div>
      )}
    </aside>
  )
}
