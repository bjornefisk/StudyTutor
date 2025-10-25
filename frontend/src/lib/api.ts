/** Client for interacting with the FastAPI backend. */
import axios from 'axios'

import type {
  ChatResponse,
  FileInfo,
  HealthResponse,
  Message,
  SessionDescriptor,
  Source,
  SuggestionResponse
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
  topK?: number
): Promise<ChatResponse> {
  const { data } = await client.post<ChatResponse>('/chat', {
    message,
    session_id: sessionId,
    top_k: topK
  })
  return data
}

export async function uploadDocuments(files: File[]): Promise<{ saved: string[]; errors: string[]; count: number }> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  const { data } = await client.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
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

export type { ChatResponse, Source }
