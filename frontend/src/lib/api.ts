import axios from 'axios'

import type {
  ChatResponse,
  FileInfo,
  HealthResponse,
  Message,
  SessionDescriptor,
  Source,
  SuggestionResponse,
  FlashcardDeck,
  FlashcardDeckDetail,
  FlashcardGenerateRequest,
  FlashcardGenerateResponse,
  Note,
  NoteCreate,
  NoteUpdate,
  NoteSuggestion
} from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL: API_URL,
  timeout: 120_000
})

export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await client.get<HealthResponse>('/health')
  return data
}

export async function postChat(
  message: string,
  sessionId?: string,
  topK?: number,
  useMultiQuery?: boolean
): Promise<ChatResponse> {
  if (!message.trim()) {
    throw new Error('Message cannot be empty')
  }
  
  try {
    const { data } = await client.post<ChatResponse>('/chat', {
      message,
      session_id: sessionId,
      top_k: topK,
      use_multi_query: useMultiQuery
    })
    return data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      if (status === 503) {
        throw new Error('Index not ready. Upload documents and run ingestion first.')
      }
      throw new Error(`Chat failed: ${error.response?.data?.detail || error.message}`)
    }
    throw new Error('Chat failed due to network error')
  }
}

export async function uploadDocuments(files: File[]): Promise<{ saved: string[]; errors: string[]; count: number }> {
  if (files.length === 0) {
    throw new Error('No files provided for upload')
  }
  
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  try {
    const { data } = await client.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Upload failed: ${error.response?.data?.detail || error.message}`)
    }
    throw new Error('Upload failed due to network error')
  }
}

export async function triggerIngestion(): Promise<{ status: string; message: string }> {
  const { data } = await client.post('/ingest')
  return data
}

export async function listDocuments(): Promise<{ files: FileInfo[]; count: number }> {
  const { data } = await client.get('/files')
  return data
}

export async function fetchSessions(): Promise<SessionDescriptor[]> {
  const { data } = await client.get<{ sessions: SessionDescriptor[] }>('/sessions')
  return data.sessions
}

export async function fetchSessionHistory(sessionId: string): Promise<Message[]> {
  const { data } = await client.get<{ session_id: string; messages: Message[] }>(`/sessions/${sessionId}`)
  return data.messages
}

export async function createSession(sessionId?: string): Promise<{ session_id: string; created: string }> {
  const { data } = await client.post('/sessions/new', { session_id: sessionId })
  return data
}

export async function deleteSession(sessionId: string): Promise<void> {
  await client.delete(`/sessions/${sessionId}`)
}

export async function fetchSuggestions(prefix = '', limit = 6): Promise<string[]> {
  const { data } = await client.post<SuggestionResponse>('/suggestions', { prefix, limit })
  return data.suggestions
}

// ============================================================================
// Flashcard API Functions
// ============================================================================

export async function generateFlashcards(request: FlashcardGenerateRequest): Promise<FlashcardGenerateResponse> {
  try {
    const { data } = await client.post<FlashcardGenerateResponse>('/flashcards/generate', request)
    return data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Flashcard generation failed: ${error.response?.data?.detail || error.message}`)
    }
    throw new Error('Flashcard generation failed due to network error')
  }
}

export async function listFlashcardDecks(): Promise<FlashcardDeck[]> {
  const { data } = await client.get<{ decks: FlashcardDeck[]; count: number }>('/flashcards/decks')
  return data.decks
}

export async function getFlashcardDeck(deckId: string): Promise<FlashcardDeckDetail> {
  try {
    const { data } = await client.get<FlashcardDeckDetail>(`/flashcards/decks/${deckId}`)
    return data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to load deck: ${error.response?.data?.detail || error.message}`)
    }
    throw new Error('Failed to load deck due to network error')
  }
}

export async function deleteFlashcardDeck(deckId: string): Promise<void> {
  await client.delete(`/flashcards/decks/${deckId}`)
}

export async function reviewFlashcard(deckId: string, cardId: string, correct: boolean): Promise<void> {
  await client.post(`/flashcards/decks/${deckId}/review`, {
    card_id: cardId,
    correct
  })
}

export async function exportDeckToAnki(deckId: string, deckName: string): Promise<void> {
  try {
    const response = await client.get(`/flashcards/decks/${deckId}/export`, {
      responseType: 'blob'
    })
    
    // Create a download link
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${deckName.replace(/\s+/g, '_')}.apkg`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Export failed: ${error.response?.data?.detail || error.message}`)
    }
    throw new Error('Export failed due to network error')
  }
}

// ============================================================================
// Notes API Functions
// ============================================================================

export async function createNote(note: NoteCreate): Promise<Note> {
  try {
    const { data } = await client.post<Note>('/notes', note)
    return data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to create note: ${error.response?.data?.detail || error.message}`)
    }
    throw new Error('Failed to create note due to network error')
  }
}

export async function listNotes(tags?: string, search?: string): Promise<Note[]> {
  const params = new URLSearchParams()
  if (tags) params.append('tags', tags)
  if (search) params.append('search', search)
  
  const { data } = await client.get<{ notes: Note[]; count: number }>(`/notes?${params}`)
  return data.notes
}

export async function getNote(noteId: string): Promise<Note> {
  try {
    const { data } = await client.get<Note>(`/notes/${noteId}`)
    return data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to load note: ${error.response?.data?.detail || error.message}`)
    }
    throw new Error('Failed to load note due to network error')
  }
}

export async function updateNote(noteId: string, updates: NoteUpdate): Promise<Note> {
  try {
    const { data} = await client.put<Note>(`/notes/${noteId}`, updates)
    return data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to update note: ${error.response?.data?.detail || error.message}`)
    }
    throw new Error('Failed to update note due to network error')
  }
}

export async function deleteNote(noteId: string): Promise<void> {
  await client.delete(`/notes/${noteId}`)
}

export async function getNoteSuggestions(content: string, topK: number = 3): Promise<NoteSuggestion[]> {
  try {
    const { data } = await client.post<{ suggestions: NoteSuggestion[]; count: number }>(
      '/notes/suggestions',
      { content, top_k: topK }
    )
    return data.suggestions
  } catch (error) {
    console.error('Failed to get suggestions:', error)
    return []
  }
}

export async function addSourceToNote(
  noteId: string,
  source: string,
  page: number,
  chunkIndex: number,
  text: string,
  score: number
): Promise<Note> {
  const { data } = await client.post<Note>(`/notes/${noteId}/sources`, {
    source,
    page,
    chunk_index: chunkIndex,
    text,
    score
  })
  return data
}

export async function exportNote(noteId: string, noteTitle: string): Promise<void> {
  try {
    const response = await client.get(`/notes/${noteId}/export`, {
      responseType: 'blob'
    })
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${noteTitle.replace(/\s+/g, '_')}.md`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Export failed: ${error.response?.data?.detail || error.message}`)
    }
    throw new Error('Export failed due to network error')
  }
}

export async function exportAllNotes(): Promise<void> {
  try {
    const response = await client.get('/notes/export/all', {
      responseType: 'blob'
    })
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    const timestamp = new Date().toISOString().split('T')[0]
    link.setAttribute('download', `all_notes_${timestamp}.md`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Export failed: ${error.response?.data?.detail || error.message}`)
    }
    throw new Error('Export failed due to network error')
  }
}

export type { ChatResponse, Source }
