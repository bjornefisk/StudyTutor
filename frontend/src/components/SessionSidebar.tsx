"use client"

import clsx from 'clsx'

import type { SessionDescriptor } from '@/types'

interface SessionsProps {
  sessions: SessionDescriptor[]
  isLoading: boolean
  currentSessionId: string
  onCreate: () => void
  onSelect: (sessionId: string) => void
  onDelete: (sessionId: string) => void
  onRefresh: () => void
}

export default function Sessions({
  sessions,
  isLoading,
  currentSessionId,
  onCreate,
  onSelect,
  onDelete,
  onRefresh
}: SessionsProps) {
  return (
    <aside className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-lg transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Sessions</h2>
          <p className="text-xs text-muted-foreground">Switch between previous conversations.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground transition-all hover:border-primary hover:text-primary"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="rounded-lg bg-primary px-3 py-1 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5"
          >
            New
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground">Loading…</p>
      ) : sessions.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No saved sessions yet.</p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {sessions.map((session) => {
            const isActive = session.id === currentSessionId
            return (
              <li key={session.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => onSelect(session.id)}
                  className={clsx(
                    'card-hover flex w-full flex-col rounded-xl border px-3 py-2 text-left text-sm transition-all',
                    isActive
                      ? 'border-primary/50 bg-primary/10 text-primary shadow-lg shadow-primary/20'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-card/50'
                  )}
                >
                  <span className="font-semibold text-foreground">{session.id}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(session.timestamp).toLocaleString()}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(session.id)}
                  className="w-full rounded-lg border border-border py-1 text-xs text-muted-foreground transition-all hover:border-red-500/50 hover:text-red-500"
                >
                  Delete
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
