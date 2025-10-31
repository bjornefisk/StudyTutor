'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Wand2, BookOpen, Download, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import FlashcardGenerator from './FlashcardGenerator'
import FlashcardReview from './FlashcardReview'
import { listFlashcardDecks, deleteFlashcardDeck, exportDeckToAnki } from '@/lib/api'
import type { FlashcardDeck } from '@/types'

type View = 'list' | 'generate' | 'review'

export default function FlashcardManager() {
  const [view, setView] = useState<View>('list')
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDecks()
  }, [])

  const loadDecks = async () => {
    try {
      setIsLoading(true)
      const data = await listFlashcardDecks()
      setDecks(data)
      setError(null)
    } catch (err) {
      setError('Failed to load flashcard decks')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm('Are you sure you want to delete this deck? This cannot be undone.')) {
      return
    }

    try {
      await deleteFlashcardDeck(deckId)
      await loadDecks()
    } catch (err) {
      console.error('Failed to delete deck:', err)
      alert('Failed to delete deck')
    }
  }

  const handleExportDeck = async (deckId: string, deckName: string) => {
    try {
      await exportDeckToAnki(deckId, deckName)
    } catch (err) {
      console.error('Failed to export deck:', err)
      alert('Failed to export deck to Anki format')
    }
  }

  const handleReviewDeck = (deckId: string) => {
    setSelectedDeckId(deckId)
    setView('review')
  }

  const handleDeckCreated = async (deckId: string) => {
    await loadDecks()
    setSelectedDeckId(deckId)
    setView('review')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  // List View
  if (view === 'list') {
    return (
      <div className="space-y-6 bg-gray-50 dark:bg-gray-900 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-3xl uppercase tracking-tight dark:text-white">Flashcards</h2>
            <p className="mt-1 font-bold text-sm uppercase tracking-wide text-black/60 dark:text-gray-400">
              AI-generated flashcards for effective studying
            </p>
          </div>
          {decks.length > 0 && (
            <Button onClick={() => setView('generate')} className="border-2 border-black bg-red-600 font-bold uppercase text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] inline-flex items-center gap-2">
              <Wand2 className="h-4 w-4" /> Generate New Deck
            </Button>
          )}
        </div>

        <div className="h-1 bg-black" />

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="space-y-4 text-center">
              <div className="mx-auto h-8 w-8 animate-spin border-4 border-black border-t-transparent"></div>
              <p className="font-bold uppercase tracking-wide text-black/60">Loading decks...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="border-4 border-black bg-white dark:bg-gray-800 p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-bold uppercase text-red-600">{error}</p>
            <Button onClick={loadDecks} variant="outline" className="mt-4 border-2 border-black bg-white dark:bg-gray-800 dark:text-white font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-yellow-400 hover:text-black dark:hover:text-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              Retry
            </Button>
          </Card>
        ) : decks.length === 0 ? (
          <Card className="border-4 border-black bg-white dark:bg-gray-800 p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <BookOpen className="mb-4 h-12 w-12 mx-auto text-black dark:text-white" />
            <h3 className="mb-2 font-black text-xl uppercase dark:text-white">No Flashcard Decks Yet</h3>
            <p className="mb-6 font-bold text-sm uppercase tracking-wide text-black/60 dark:text-gray-400">
              Generate your first deck from your study materials
            </p>
            <Button onClick={() => setView('generate')} className="border-2 border-black bg-red-600 font-bold uppercase text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              Create First Deck
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <Card key={deck.id} className="border-4 border-black bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="font-black text-lg uppercase dark:text-white">{deck.name}</CardTitle>
                      <CardDescription className="mt-1 font-bold text-xs uppercase tracking-wide text-black/60 dark:text-gray-400">
                        {deck.card_count} cards
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="border-2 border-black bg-blue-600 font-bold text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                      {deck.card_count}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="font-bold text-xs uppercase tracking-wide text-black/60 dark:text-gray-400">
                    Created {formatDate(deck.created_at)}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => handleReviewDeck(deck.id)}
                      className="w-full border-2 border-black bg-blue-600 font-bold uppercase text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] inline-flex items-center justify-center gap-2"
                      size="sm"
                    >
                      <BookOpen className="h-4 w-4" /> Study Now
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleExportDeck(deck.id, deck.name)}
                        variant="outline"
                        size="sm"
                        className="flex-1 border-2 border-black bg-white dark:bg-gray-800 dark:text-white font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-yellow-400 hover:text-black dark:hover:text-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] inline-flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" /> Export
                      </Button>
                      <Button
                        onClick={() => handleDeleteDeck(deck.id)}
                        variant="outline"
                        size="sm"
                        className="border-2 border-black bg-white dark:bg-gray-800 font-bold text-red-600 dark:text-red-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-red-600 hover:text-white hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] inline-flex items-center justify-center"
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

  // Generate View
  if (view === 'generate') {
    return (
      <div className="space-y-6 bg-gray-50 dark:bg-gray-900 p-6">
        <div>
          <Button
            onClick={() => setView('list')}
            variant="ghost"
            className="mb-4 border-2 border-black bg-white dark:bg-gray-800 dark:text-white font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-yellow-400 hover:text-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
          >
            ← Back to Decks
          </Button>
          <h2 className="font-black text-3xl uppercase tracking-tight dark:text-white">Generate Flashcards</h2>
          <p className="mt-1 font-bold text-sm uppercase tracking-wide text-black/60 dark:text-gray-400">
            AI will extract key concepts from your documents
          </p>
        </div>

        <div className="h-1 bg-black" />

        <div className="max-w-2xl">
          <FlashcardGenerator onDeckCreated={handleDeckCreated} />
        </div>
      </div>
    )
  }

  // Review View
  if (view === 'review' && selectedDeckId) {
    const currentDeck = decks.find(d => d.id === selectedDeckId)
    
    return (
      <div className="space-y-6 bg-gray-50 dark:bg-gray-900 p-6">
        <div>
          <Button
            onClick={() => {
              setView('list')
              setSelectedDeckId(null)
            }}
            variant="ghost"
            className="mb-4 border-2 border-black bg-white dark:bg-gray-800 dark:text-white font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-yellow-400 hover:text-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
          >
            ← Back to Decks
          </Button>
          <h2 className="font-black text-3xl uppercase tracking-tight dark:text-white">
            {currentDeck?.name || 'Review Flashcards'}
          </h2>
          <p className="mt-1 font-bold text-sm uppercase tracking-wide text-black/60 dark:text-gray-400">
            Click cards to flip • Mark your answers
          </p>
        </div>

        <div className="h-1 bg-black" />

        <FlashcardReview
          deckId={selectedDeckId}
          onComplete={() => {
            setView('list')
            setSelectedDeckId(null)
          }}
        />
      </div>
    )
  }

  return null
}

