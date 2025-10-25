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
