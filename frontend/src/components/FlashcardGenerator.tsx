'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { generateFlashcards, listDocuments } from '@/lib/api'
import type { FileInfo } from '@/types'

interface FlashcardGeneratorProps {
  onDeckCreated?: (deckId: string) => void
}

export default function FlashcardGenerator({ onDeckCreated }: FlashcardGeneratorProps) {
  const [documents, setDocuments] = useState<FileInfo[]>([])
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [deckName, setDeckName] = useState('')
  const [numCards, setNumCards] = useState(10)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      const { files } = await listDocuments()
      setDocuments(files)
    } catch (err) {
      console.error('Failed to load documents:', err)
    }
  }

  const toggleDocument = (docName: string) => {
    setSelectedDocs(prev =>
      prev.includes(docName)
        ? prev.filter(d => d !== docName)
        : [...prev, docName]
    )
  }

  const handleGenerate = async () => {
    if (selectedDocs.length === 0) {
      setError('Please select at least one document')
      return
    }
    if (!deckName.trim()) {
      setError('Please enter a deck name')
      return
    }

    setIsGenerating(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await generateFlashcards({
        document_names: selectedDocs,
        num_cards: numCards,
        difficulty,
        deck_name: deckName.trim()
      })

      setSuccess(`Successfully generated ${response.cards_generated} flashcards!`)
      setDeckName('')
      setSelectedDocs([])
      
      if (onDeckCreated) {
        onDeckCreated(response.deck_id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate flashcards')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generate Flashcards</CardTitle>
        <CardDescription>
          AI will extract key concepts from your documents and create study flashcards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Deck Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Deck Name</label>
          <Input
            placeholder="e.g., Biology Chapter 3"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            disabled={isGenerating}
          />
        </div>

        {/* Document Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Select Documents ({selectedDocs.length} selected)
          </label>
          <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents available. Upload some first!</p>
            ) : (
              documents.map((doc) => (
                <label
                  key={doc.name}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedDocs.includes(doc.name)}
                    onChange={() => toggleDocument(doc.name)}
                    disabled={isGenerating}
                    className="rounded"
                  />
                  <span className="text-sm flex-1">{doc.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {(doc.size / 1024).toFixed(1)} KB
                  </Badge>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Number of Cards */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Number of Cards</label>
          <Input
            type="number"
            min={1}
            max={50}
            value={numCards}
            onChange={(e) => setNumCards(parseInt(e.target.value) || 10)}
            disabled={isGenerating}
          />
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Difficulty Level</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
            disabled={isGenerating}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="easy">Easy - Basic definitions and recall</option>
            <option value="medium">Medium - Mixed concepts and applications</option>
            <option value="hard">Hard - Complex analysis and synthesis</option>
          </select>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-3 rounded-md text-sm">
            {success}
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || selectedDocs.length === 0 || !deckName.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            '✨ Generate Flashcards'
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          This may take a minute depending on document size and complexity
        </p>
      </CardContent>
    </Card>
  )
}

