"use client"

import { useState } from 'react'
import MobileHeader from '@/components/MobileHeader'
import Navigation from '@/components/Navigation'
import Chat from '@/components/Chat'
import Notes from '@/components/Notes'

type ViewMode = 'chat' | 'notes'

export default function AppLayout() {
  const [viewMode, setViewMode] = useState<ViewMode>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <Navigation
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
      <Navigation
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
        <MobileHeader onToggleSidebar={() => setMobileSidebarOpen(true)} />

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'chat' && (
            <div className="h-full">
              <Chat chatId={null} />
            </div>
          )}
          
          {viewMode === 'notes' && (
            <div className="p-6">
              <Notes />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
