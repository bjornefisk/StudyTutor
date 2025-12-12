'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import ChatInterface from '@/components/ChatInterface'
import NotesManager from '@/components/NotesManager'
import DocumentsGallery from '@/components/DocumentsGallery'

export default function Home() {
  const [activeView, setActiveView] = useState<'chat' | 'notes' | 'documents'>('chat')
  const [chatHistory, setChatHistory] = useState<Array<{ id: string; title: string; timestamp: Date }>>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)

  const handleNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: 'New Chat',
      timestamp: new Date()
    }
    setChatHistory([newChat, ...chatHistory])
    setActiveChatId(newChat.id)
    setActiveView('chat')
  }

  return (
    <div className="flex h-screen bg-[var(--background)]">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        chatHistory={chatHistory}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        onNewChat={handleNewChat}
      />
      <main className="flex-1 overflow-hidden">
        {activeView === 'chat' && <ChatInterface chatId={activeChatId} />}
        {activeView === 'documents' && <DocumentsGallery />}
        {activeView === 'notes' && <NotesManager />}
      </main>
    </div>
  )
}
