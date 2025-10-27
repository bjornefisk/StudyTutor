'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import NoteEditor from './NoteEditor'
import { listNotes, deleteNote, exportNote, exportAllNotes } from '@/lib/api'
import type { Note } from '@/types'

type View = 'list' | 'edit' | 'create'

export default function NotesManager() {
  const [view, setView] = useState<View>('list')
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    try {
      setIsLoading(true)
      const data = await listNotes()
      setNotes(data)
    } catch (error) {
      console.error('Failed to load notes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return
    }

    try {
      await deleteNote(noteId)
      await loadNotes()
    } catch (error) {
      console.error('Failed to delete note:', error)
      alert('Failed to delete note')
    }
  }

  const handleExport = async (note: Note) => {
    try {
      await exportNote(note.id, note.title)
    } catch (error) {
      console.error('Failed to export note:', error)
      alert('Failed to export note')
    }
  }

  const handleExportAll = async () => {
    try {
      await exportAllNotes()
    } catch (error) {
      console.error('Failed to export all notes:', error)
      alert('Failed to export all notes')
    }
  }

  const handleEdit = (note: Note) => {
    setSelectedNote(note)
    setView('edit')
  }

  const handleSave = async () => {
    await loadNotes()
    setView('list')
    setSelectedNote(null)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Get all unique tags
  const allTags = Array.from(
    new Set(notes.flatMap(note => note.tags))
  ).sort()

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchTerm ||
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTag = !selectedTag || note.tags.includes(selectedTag)
    
    return matchesSearch && matchesTag
  })

  // List View
  if (view === 'list') {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Study Notes</h2>
            <p className="text-muted-foreground mt-1">
              Smart note-taking with AI-powered suggestions
            </p>
          </div>
          {notes.length > 0 && (
            <div className="flex gap-2">
              <Button onClick={handleExportAll} variant="outline">
                📥 Export All
              </Button>
              <Button onClick={() => setView('create')}>
                ✍️ New Note
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Search and Filters */}
        <div className="flex gap-4">
          <Input
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          {allTags.length > 0 && (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">Tags:</span>
              <Button
                variant={selectedTag === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTag(null)}
              >
                All
              </Button>
              {allTags.slice(0, 5).map(tag => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Notes Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center space-y-4">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground">Loading notes...</p>
            </div>
          </div>
        ) : filteredNotes.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">
              {notes.length === 0 ? 'No Notes Yet' : 'No Matching Notes'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {notes.length === 0
                ? 'Start taking notes with AI-powered suggestions from your documents'
                : 'Try a different search or filter'}
            </p>
            {notes.length === 0 && (
              <Button onClick={() => setView('create')}>
                Create First Note
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => (
              <Card key={note.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">
                    {note.title}
                  </CardTitle>
                  <CardDescription>
                    {formatDate(note.updated_at)} • {note.word_count} words
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Preview */}
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {note.content || 'Empty note'}
                  </p>

                  {/* Tags */}
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {note.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{note.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Sources Badge */}
                  {note.linked_sources.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      🔗 {note.linked_sources.length} linked {note.linked_sources.length === 1 ? 'source' : 'sources'}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      onClick={() => handleEdit(note)}
                      className="w-full"
                      size="sm"
                    >
                      ✏️ Edit Note
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleExport(note)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        📥 Export
                      </Button>
                      <Button
                        onClick={() => handleDelete(note.id)}
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Edit/Create View
  return (
    <div className="space-y-6 p-6">
      <div>
        <Button
          onClick={() => {
            setView('list')
            setSelectedNote(null)
          }}
          variant="ghost"
          className="mb-4"
        >
          ← Back to Notes
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">
          {view === 'create' ? 'New Note' : 'Edit Note'}
        </h2>
        <p className="text-muted-foreground mt-1">
          AI will suggest related content from your documents as you type
        </p>
      </div>

      <Separator />

      <NoteEditor
        note={selectedNote}
        onSave={handleSave}
        onCancel={() => {
          setView('list')
          setSelectedNote(null)
        }}
      />
    </div>
  )
}

