'use client'

import { useState } from 'react'
import { 
  MessageSquare, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  X
} from 'lucide-react'

interface BrutalistSidebarProps {
  currentView: 'chat' | 'notes'
  onViewChange: (view: 'chat' | 'notes') => void
  sessions?: Array<{ id: string; name: string }>
  onSessionSelect?: (sessionId: string) => void
  onNewChat?: () => void
  isOpen: boolean
  onToggle: () => void
  isMobile?: boolean
  onClose?: () => void
  darkMode?: boolean
}

export default function BrutalistSidebar({
  currentView,
  onViewChange,
  sessions = [],
  onSessionSelect,
  onNewChat,
  isOpen,
  onToggle,
  isMobile = false,
  onClose,
  darkMode = false
}: BrutalistSidebarProps) {
  const navigationItems = [
    {
      title: 'Chat',
      value: 'chat' as const,
      icon: MessageSquare,
      color: 'red'
    },
    {
      title: 'Notes',
      value: 'notes' as const,
      icon: FileText,
      color: 'yellow'
    },
  ]

  const SidebarContent = () => (
    <>
      {/* Logo Section */}
      <div className={`p-4 border-b-4 border-black ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative w-12 h-12">
            <div className="absolute top-0 left-0 w-6 h-6 bg-red-600 rounded-full"></div>
            <div className="absolute top-0 right-0 w-6 h-6 bg-yellow-400"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 bg-blue-600"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-black"></div>
          </div>
          {isOpen && (
            <div>
              <h2 className={`font-black text-xl uppercase tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>STUDY</h2>
              <p className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>TUTOR</p>
            </div>
          )}
        </div>
        
        {isOpen && onNewChat && (
          <button
            onClick={onNewChat}
            className={`w-full font-bold uppercase tracking-wider h-12 transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
              darkMode ? 'bg-gray-700 hover:bg-red-600 text-white' : 'bg-black hover:bg-red-600 text-white'
            }`}
          >
            <Plus className="w-5 h-5 inline mr-2" />
            New Chat
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className={`flex-1 overflow-y-auto p-3 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`text-[10px] font-black uppercase tracking-widest mb-3 ${!isOpen && 'text-center'} ${darkMode ? 'text-gray-400' : 'text-black'}`}>
          {isOpen ? 'Navigate' : '•'}
        </div>
        
        {navigationItems.map((item) => {
          const isActive = currentView === item.value
          const bgColor = item.color === 'red' ? 'bg-red-600' : 
                         item.color === 'yellow' ? 'bg-yellow-400' : 
                         'bg-blue-600'
          
          return (
            <button
              key={item.title}
              onClick={() => onViewChange(item.value)}
              className={`w-full flex items-center gap-3 mb-2 p-3 border-2 border-black transition-all ${
                isActive
                  ? `${bgColor} text-${item.color === 'yellow' ? 'black' : 'white'} translate-x-1 -translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
                  : darkMode 
                    ? 'bg-gray-800 text-white hover:translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-black hover:translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              } ${!isOpen && 'justify-center'}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span className="font-bold uppercase text-sm tracking-wide">{item.title}</span>}
            </button>
          )
        })}

        {/* Sessions List */}
        {isOpen && sessions.length > 0 && (
          <>
            <div className={`text-[10px] font-black uppercase tracking-widest mt-6 mb-3 ${darkMode ? 'text-gray-400' : 'text-black'}`}>
              Sessions
            </div>
            {sessions.slice(0, 5).map((session, idx) => (
              <button
                key={session.id}
                onClick={() => onSessionSelect?.(session.id)}
                className={`w-full text-left p-2 mb-1 border-2 border-black transition-colors ${
                  darkMode ? 'bg-gray-800 hover:bg-yellow-400 hover:text-black' : 'bg-white hover:bg-yellow-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 ${idx % 3 === 0 ? 'bg-red-600' : idx % 3 === 1 ? 'bg-yellow-400' : 'bg-blue-600'}`}></div>
                  <div className={`text-xs font-bold truncate uppercase ${darkMode ? 'text-white' : 'text-black'}`}>
                    {session.name}
                  </div>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </>
  )

  // Desktop Sidebar
  if (!isMobile) {
    return (
      <aside 
        className={`hidden md:flex flex-col border-r-4 border-black transition-all duration-300 relative ${
          isOpen ? 'w-64' : 'w-20'
        } ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
      >
        <SidebarContent />
        
        <button
          onClick={onToggle}
          className={`absolute top-4 -right-4 w-8 h-8 border-2 border-black flex items-center justify-center transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10 ${
            darkMode ? 'bg-yellow-400 text-black hover:bg-red-600 hover:text-white' : 'bg-yellow-400 hover:bg-red-600 hover:text-white'
          }`}
        >
          {isOpen ? <ChevronLeft className="w-4 h-4 font-black" /> : <ChevronRight className="w-4 h-4 font-black" />}
        </button>
      </aside>
    )
  }

  // Mobile Sidebar
  return (
    <>
      {isOpen && (
        <>
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <aside className={`md:hidden fixed top-0 left-0 bottom-0 w-64 z-50 flex flex-col border-r-4 border-black ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-red-600 text-white border-2 border-black z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  )
}
