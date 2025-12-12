export interface Source {
  source: string
  page: number
  chunk_index: number
  score: number
  text: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  sources?: Source[]
}

export interface ChatResponse {
  reply: string
  sources: Source[]
  session_id: string
  timestamp: string
}

export interface SessionDescriptor {
  id: string
  timestamp: string
  path?: string
}

export interface FileInfo {
  name: string
  size: number
  modified: string
}

export interface SuggestionResponse {
  suggestions: string[]
}

export interface HealthResponse {
  status: string
  documents: number
  embedding_backend: string
  llm_backend: string
}

export interface NoteSuggestion {
  source: string
  page: number
  chunk_index: number
  text: string
  score: number
  relevance: 'high' | 'medium' | 'low'
}

export interface LinkedSource {
  source: string
  page: number
  chunk_index: number
  text: string
  score: number
  added_at: string
}

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  linked_sources: LinkedSource[]
  created_at: string
  updated_at: string
  word_count: number
}

export interface NoteCreate {
  title: string
  content?: string
  tags?: string[]
  linked_sources?: LinkedSource[]
}

export interface NoteUpdate {
  title?: string
  content?: string
  tags?: string[]
  linked_sources?: LinkedSource[]
}
