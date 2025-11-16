'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getFlashcardDeck, reviewFlashcard } from '@/lib/api'
import type { FlashcardDeckDetail, Flashcard } from '@/types'

interface FlashcardReviewProps {
  deckId: string
  onComplete?: () => void
}

export default function FlashcardReview({ deckId, onComplete }: FlashcardReviewProps) {
  const [deck, setDeck] = useState<FlashcardDeckDetail | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 })
  const [showingResult, setShowingResult] = useState(false)

  useEffect(() => {
    loadDeck()
  }, [deckId])

  const loadDeck = async () => {
    try {
      const data = await getFlashcardDeck(deckId)
      setDeck(data)
      setIsLoading(false)
    } catch (err) {
      console.error('Failed to load deck:', err)
      setIsLoading(false)
    }
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleAnswer = async (correct: boolean) => {
    if (!deck || !currentCard) return

    setShowingResult(true)
    
    // Update stats
    setSessionStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1)
    }))

    // Record review
    try {
      await reviewFlashcard(deckId, currentCard.id, correct)
    } catch (err) {
      console.error('Failed to record review:', err)
    }

    // Move to next card after a brief delay
    setTimeout(() => {
      if (currentIndex < deck.flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setIsFlipped(false)
        setShowingResult(false)
      } else {
        // Deck complete
        if (onComplete) onComplete()
      }
    }, 800)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Loading flashcards...</p>
        </div>
      </div>
    )
  }

  if (!deck || deck.flashcards.length === 0) {
    return (
      <div className="text-center p-12">
        <p className="text-muted-foreground">No flashcards found in this deck.</p>
      </div>
    )
  }

  const currentCard = deck.flashcards[currentIndex]
  const progress = ((currentIndex + 1) / deck.flashcards.length) * 100
  const isComplete = currentIndex >= deck.flashcards.length - 1 && showingResult

  if (isComplete) {
    const totalReviewed = sessionStats.correct + sessionStats.incorrect
    const accuracy = totalReviewed > 0 ? (sessionStats.correct / totalReviewed) * 100 : 0

    return (
      <div className="max-w-2xl mx-auto p-8">
        <Card className="p-8 text-center space-y-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold">Deck Complete!</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="bg-green-500/10 p-4 rounded-lg">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {sessionStats.correct}
                </div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
              <div className="bg-red-500/10 p-4 rounded-lg">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {sessionStats.incorrect}
                </div>
                <div className="text-sm text-muted-foreground">Incorrect</div>
              </div>
            </div>
            <div className="text-lg">
              Accuracy: <span className="font-bold">{accuracy.toFixed(0)}%</span>
            </div>
          </div>
          <Button onClick={() => {
            setCurrentIndex(0)
            setIsFlipped(false)
            setSessionStats({ correct: 0, incorrect: 0 })
            setShowingResult(false)
          }}>
            Review Again
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Progress</span>
          <span>{currentIndex + 1} / {deck.flashcards.length}</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Session Stats */}
      <div className="flex gap-4 justify-center text-sm">
        <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400">
          ✓ {sessionStats.correct}
        </Badge>
        <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400">
          ✗ {sessionStats.incorrect}
        </Badge>
      </div>

      {/* Flashcard */}
      <div className="perspective-1000">
        <div
          className={`relative w-full min-h-[400px] transition-transform duration-500 transform-style-3d cursor-pointer ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          onClick={handleFlip}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* Front of card */}
          <Card
            className={`absolute inset-0 backface-hidden p-8 flex flex-col justify-center items-center space-y-4 ${
              showingResult ? 'opacity-50' : ''
            }`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            <div className="text-sm text-muted-foreground mb-4">Question</div>
            <div className="text-2xl text-center font-medium px-4">
              {currentCard.front}
            </div>
            <div className="flex flex-wrap gap-2 mt-6">
              {currentCard.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="text-sm text-muted-foreground mt-4">
              Click to reveal answer
            </div>
          </Card>

          {/* Back of card */}
          <Card
            className={`absolute inset-0 backface-hidden p-8 flex flex-col justify-center items-center space-y-4 ${
              showingResult ? 'opacity-50' : ''
            }`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="text-sm text-muted-foreground mb-4">Answer</div>
            <div className="text-xl text-center px-4">
              {currentCard.back}
            </div>
            <div className="flex flex-wrap gap-2 mt-6">
              {currentCard.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Answer Buttons */}
      {isFlipped && !showingResult && (
        <div className="flex gap-4 justify-center pt-4">
          <Button
            onClick={() => handleAnswer(false)}
            variant="outline"
            className="border-red-500 text-red-600 hover:bg-red-500/10 min-w-[140px]"
          >
            ✗ Incorrect
          </Button>
          <Button
            onClick={() => handleAnswer(true)}
            className="bg-green-600 hover:bg-green-700 min-w-[140px]"
          >
            ✓ Correct
          </Button>
        </div>
      )}

      {/* Card Info */}
      <div className="text-center text-sm text-muted-foreground">
        {currentCard.review_count > 0 && (
          <p>
            Reviewed {currentCard.review_count} times •{' '}
            {currentCard.correct_count > 0
              ? `${((currentCard.correct_count / currentCard.review_count) * 100).toFixed(0)}% accuracy`
              : 'No correct answers yet'}
          </p>
        )}
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  )
}

