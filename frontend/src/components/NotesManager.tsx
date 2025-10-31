'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FilePlus, StickyNote, PenSquare, DownloadCloud, Trash2 } from 'lucide-react'
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
      <div className="space-y-6 bg-gray-50 dark:bg-gray-900 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-3xl uppercase tracking-tight dark:text-white">Study Notes</h2>
            <p className="mt-1 font-bold text-sm uppercase tracking-wide text-black/60 dark:text-gray-400">
              Smart note-taking with AI-powered suggestions
            </p>
          </div>
          {notes.length > 0 && (
            <div className="flex gap-2">
              <Button onClick={handleExportAll} variant="outline" className="border-2 border-black bg-white dark:bg-gray-800 dark:text-white font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-yellow-400 hover:text-black dark:hover:text-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] inline-flex items-center gap-2">
                <Download className="h-4 w-4" /> Export All
              </Button>
              <Button onClick={() => setView('create')} className="border-2 border-black bg-red-600 font-bold uppercase text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] inline-flex items-center gap-2">
                <FilePlus className="h-4 w-4" /> New Note
              </Button>
            </div>
          )}
        </div>

        <div className="h-1 bg-black" />

        {/* Search and Filters */}
        <div className="flex gap-4">
          <Input
            placeholder="SEARCH NOTES..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm border-2 border-black bg-white dark:bg-gray-800 dark:text-white font-bold uppercase tracking-wide placeholder:text-black/40 dark:placeholder:text-gray-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
          />
          {allTags.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm uppercase tracking-wide text-black/60 dark:text-gray-400">Tags:</span>
              <Button
                variant={selectedTag === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTag(null)}
                className="border-2 border-black font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              >
                All
              </Button>
              {allTags.slice(0, 5).map(tag => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTag(tag)}
                  className="border-2 border-black font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
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
            <div className="space-y-4 text-center">
              <div className="mx-auto h-8 w-8 animate-spin border-4 border-black border-t-transparent"></div>
              <p className="font-bold uppercase tracking-wide text-black/60">Loading notes...</p>
            </div>
          </div>
        ) : filteredNotes.length === 0 ? (
          <Card className="border-4 border-black bg-white dark:bg-gray-800 p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <StickyNote className="mb-4 h-12 w-12 mx-auto text-black dark:text-white" />
            <h3 className="mb-2 font-black text-xl uppercase dark:text-white">
              {notes.length === 0 ? 'No Notes Yet' : 'No Matching Notes'}
            </h3>
            <p className="mb-6 font-bold text-sm uppercase tracking-wide text-black/60 dark:text-gray-400">
              {notes.length === 0
                ? 'Start taking notes with AI-powered suggestions from your documents'
                : 'Try a different search or filter'}
            </p>
            {notes.length === 0 && (
              <Button onClick={() => setView('create')} className="border-2 border-black bg-red-600 font-bold uppercase text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                Create First Note
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredNotes.map((note) => (
              <Card key={note.id} className="border-4 border-black bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <CardHeader>
                  <CardTitle className="line-clamp-2 font-black text-lg uppercase dark:text-white">
                    {note.title}
                  </CardTitle>
                  <CardDescription className="font-bold text-xs uppercase tracking-wide text-black/60 dark:text-gray-400">
                    {formatDate(note.updated_at)} • {note.word_count} words
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Preview */}
                  <p className="line-clamp-3 text-sm font-bold text-black/70 dark:text-gray-300">
                    {note.content || 'Empty note'}
                  </p>

                  {/* Tags */}
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="border-2 border-black bg-yellow-400 font-bold uppercase text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                          {tag}
                        </Badge>
                      ))}
                      {note.tags.length > 3 && (
                        <Badge variant="outline" className="border-2 border-black bg-white dark:bg-gray-700 font-bold uppercase text-black dark:text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                          +{note.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Sources Badge */}
                  {note.linked_sources.length > 0 && (
                    <div className="font-bold text-xs uppercase tracking-wide text-black/60 dark:text-gray-400">
                      🔗 {note.linked_sources.length} linked {note.linked_sources.length === 1 ? 'source' : 'sources'}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      onClick={() => handleEdit(note)}
                      className="w-full border-2 border-black bg-blue-600 font-bold uppercase text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                      size="sm"
                    >
                      <span className="inline-flex items-center gap-2"><PenSquare className="h-4 w-4" /> Edit Note</span>
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleExport(note)}
                        variant="outline"
                        size="sm"
                        className="flex-1 border-2 border-black bg-white dark:bg-gray-800 dark:text-white font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-yellow-400 hover:text-black dark:hover:text-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                      >
                        <DownloadCloud className="h-4 w-4" /> Export
                      </Button>
                      <Button
                        onClick={() => handleDelete(note.id)}
                        variant="outline"
                        size="sm"
                        className="border-2 border-black bg-white dark:bg-gray-800 font-bold text-red-600 dark:text-red-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-red-600 hover:text-white hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                      >
                        <Trash2 className="h-4 w-4" />
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
    <div className="space-y-6 bg-gray-50 dark:bg-gray-900 p-6">
      <div>
        <Button
          onClick={() => {
            setView('list')
            setSelectedNote(null)
          }}
          variant="ghost"
          className="mb-4 border-2 border-black bg-white dark:bg-gray-800 dark:text-white font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-yellow-400 hover:text-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
        >
          ← Back to Notes
        </Button>
        <h2 className="font-black text-3xl uppercase tracking-tight dark:text-white">
          {view === 'create' ? 'New Note' : 'Edit Note'}
        </h2>
        <p className="mt-1 font-bold text-sm uppercase tracking-wide text-black/60 dark:text-gray-400">
          AI will suggest related content from your documents as you type
        </p>
      </div>

      <div className="h-1 bg-black" />

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

