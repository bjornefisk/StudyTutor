/**
 * API client for interacting with the FastAPI backend.
 * 
 * This module provides typed functions for all backend API calls including:
 * - Chat interactions and message handling
 * - File uploads and document management
 * - Session management and history
 * - Health checks and status monitoring
 * - AI-powered suggestion generation
 * 
 * All functions include proper error handling and timeout configuration.
 */
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
        throw new Error('AI service is not ready. Please upload documents and run ingestion first.')
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

export type { ChatResponse, Source }
