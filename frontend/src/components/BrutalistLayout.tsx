"use client"

import { useState } from 'react'
import BrutalistHeader from '@/components/BrutalistHeader'
import BrutalistSidebar from '@/components/BrutalistSidebar'
import ChatInterface from '@/components/ChatInterface'
import FlashcardManager from '@/components/FlashcardManager'
import NotesManager from '@/components/NotesManager'

type ViewMode = 'chat' | 'flashcards' | 'notes'

export default function BrutalistLayout() {
  const [viewMode, setViewMode] = useState<ViewMode>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <BrutalistSidebar
        currentView={viewMode}
        onViewChange={setViewMode}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isMobile={false}
        onNewChat={() => {
          setViewMode('chat')
          // Handle new chat logic here
        }}
      />

      {/* Mobile Sidebar */}
      <BrutalistSidebar
        currentView={viewMode}
        onViewChange={(view) => {
          setViewMode(view)
          setMobileSidebarOpen(false)
        }}
        isOpen={mobileSidebarOpen}
        onToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        onClose={() => setMobileSidebarOpen(false)}
        isMobile={true}
        onNewChat={() => {
          setViewMode('chat')
          setMobileSidebarOpen(false)
        }}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <BrutalistHeader onToggleSidebar={() => setMobileSidebarOpen(true)} />

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'chat' && (
            <div className="h-full">
              <ChatInterface
                messages={[]}
                isLoading={false}
                onSend={async (message) => {
                  // Handle message sending
                  console.log('Send message:', message)
                }}
                suggestions={[]}
                onSuggestionSelect={(suggestion) => {
                  console.log('Selected:', suggestion)
                }}
                onSuggestionSearch={(query) => {
                  console.log('Search:', query)
                }}
              />
            </div>
          )}
          
          {viewMode === 'flashcards' && (
            <div className="p-6">
              <FlashcardManager />
            </div>
          )}
          
          {viewMode === 'notes' && (
            <div className="p-6">
              <NotesManager />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
