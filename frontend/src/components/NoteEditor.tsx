'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { getNoteSuggestions, createNote, updateNote, addSourceToNote } from '@/lib/api'
import type { Note, NoteSuggestion } from '@/types'

interface NoteEditorProps {
  note?: Note | null
  onSave?: (note: Note) => void
  onCancel?: () => void
}

export default function NoteEditor({ note, onSave, onCancel }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')
  const [tags, setTags] = useState<string[]>(note?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [suggestions, setSuggestions] = useState<NoteSuggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [linkedSources, setLinkedSources] = useState(note?.linked_sources || [])

  // Debounced suggestion fetching
  useEffect(() => {
    if (content.length < 20) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoadingSuggestions(true)
      try {
        const results = await getNoteSuggestions(content, 3)
        setSuggestions(results)
      } catch (error) {
        console.error('Failed to fetch suggestions:', error)
      } finally {
        setIsLoadingSuggestions(false)
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timer)
  }, [content])

  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  const handleAddSource = async (suggestion: NoteSuggestion, savedNote: Note) => {
    try {
      const updated = await addSourceToNote(
        savedNote.id,
        suggestion.source,
        suggestion.page,
        suggestion.chunk_index,
        suggestion.text,
        suggestion.score
      )
      setLinkedSources(updated.linked_sources)
    } catch (error) {
      console.error('Failed to add source:', error)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title')
      return
    }

    setIsSaving(true)
    try {
      let savedNote: Note
      
      if (note) {
        // Update existing note
        savedNote = await updateNote(note.id, {
          title: title.trim(),
          content,
          tags,
          linked_sources: linkedSources
        })
      } else {
        // Create new note
        savedNote = await createNote({
          title: title.trim(),
          content,
          tags,
          linked_sources: linkedSources
        })
      }

      if (onSave) {
        onSave(savedNote)
      }
    } catch (error) {
      console.error('Failed to save note:', error)
      alert('Failed to save note')
    } finally {
      setIsSaving(false)
    }
  }

  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {/* Main Editor */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{note ? 'Edit Note' : 'New Note'}</CardTitle>
            <CardDescription>
              Start typing to get suggestions from your documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Note title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-semibold"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Content</label>
                <span className="text-xs text-muted-foreground">
                  {wordCount} words
                </span>
              </div>
              <Textarea
                placeholder="Start writing your notes here. As you type, related content from your documents will appear in the suggestions panel..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                />
                <Button onClick={handleAddTag} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving || !title.trim()}
                className="flex-1"
              >
                {isSaving ? 'Saving...' : note ? 'Update Note' : 'Save Note'}
              </Button>
              {onCancel && (
                <Button onClick={onCancel} variant="outline">
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Linked Sources */}
        {linkedSources.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Linked Sources ({linkedSources.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {linkedSources.map((source, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-border bg-accent/10 text-sm"
                  >
                    <div className="font-medium">{source.source}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Page {source.page} • Score: {(source.score * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs mt-2 line-clamp-2">{source.text}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Suggestions Sidebar */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Related Content</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(!showSuggestions)}
              >
                {showSuggestions ? 'Hide' : 'Show'}
              </Button>
            </div>
            <CardDescription>
              Suggestions from your documents
            </CardDescription>
          </CardHeader>
          {showSuggestions && (
            <CardContent>
              {isLoadingSuggestions ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Finding related content...</p>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {content.length < 20
                    ? 'Start typing to see suggestions...'
                    : 'No related content found'}
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        suggestion.relevance === 'high'
                          ? 'border-green-500/50 bg-green-500/5'
                          : suggestion.relevance === 'medium'
                          ? 'border-yellow-500/50 bg-yellow-500/5'
                          : 'border-border bg-accent/10'
                      }`}
                      onClick={() => note && handleAddSource(suggestion, note)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-sm">{suggestion.source}</div>
                        <Badge
                          variant={
                            suggestion.relevance === 'high'
                              ? 'default'
                              : 'outline'
                          }
                          className="text-xs"
                        >
                          {suggestion.relevance}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Page {suggestion.page} • {(suggestion.score * 100).toFixed(0)}% match
                      </div>
                      <div className="text-xs line-clamp-3">{suggestion.text}</div>
                      {note && (
                        <div className="mt-2 text-xs text-primary">
                          Click to add as source
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">💡 Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>• Suggestions update as you type</p>
            <p>• Click suggestions to link sources</p>
            <p>• Use tags to organize notes</p>
            <p>• Export notes with citations</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

