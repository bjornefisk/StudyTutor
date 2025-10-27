'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
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
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Flashcards</h2>
            <p className="text-muted-foreground mt-1">
              AI-generated flashcards for effective studying
            </p>
          </div>
          {decks.length > 0 && (
            <Button onClick={() => setView('generate')}>
              ✨ Generate New Deck
            </Button>
          )}
        </div>

        <Separator />

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center space-y-4">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground">Loading decks...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-destructive">{error}</p>
            <Button onClick={loadDecks} variant="outline" className="mt-4">
              Retry
            </Button>
          </Card>
        ) : decks.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold mb-2">No Flashcard Decks Yet</h3>
            <p className="text-muted-foreground mb-6">
              Generate your first deck from your study materials
            </p>
            <Button onClick={() => setView('generate')}>
              Create First Deck
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck) => (
              <Card key={deck.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{deck.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {deck.card_count} cards
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {deck.card_count}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Created {formatDate(deck.created_at)}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => handleReviewDeck(deck.id)}
                      className="w-full"
                      size="sm"
                    >
                      📖 Study Now
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleExportDeck(deck.id, deck.name)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        📥 Export
                      </Button>
                      <Button
                        onClick={() => handleDeleteDeck(deck.id)}
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

  // Generate View
  if (view === 'generate') {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Button
            onClick={() => setView('list')}
            variant="ghost"
            className="mb-4"
          >
            ← Back to Decks
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Generate Flashcards</h2>
          <p className="text-muted-foreground mt-1">
            AI will extract key concepts from your documents
          </p>
        </div>

        <Separator />

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
      <div className="space-y-6 p-6">
        <div>
          <Button
            onClick={() => {
              setView('list')
              setSelectedDeckId(null)
            }}
            variant="ghost"
            className="mb-4"
          >
            ← Back to Decks
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">
            {currentDeck?.name || 'Review Flashcards'}
          </h2>
          <p className="text-muted-foreground mt-1">
            Click cards to flip • Mark your answers
          </p>
        </div>

        <Separator />

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

