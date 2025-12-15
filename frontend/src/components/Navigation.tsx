'use client'

import { 
  MessageSquare, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  X
} from 'lucide-react'

interface NavigationProps {
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

export default function Navigation({
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
}: NavigationProps) {
  const navigationItems = [
    {
      title: 'Chat',
      value: 'chat' as const,
      icon: MessageSquare
    },
    {
      title: 'Notes',
      value: 'notes' as const,
      icon: FileText
    },
  ]

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className={`p-4 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {isOpen && (
          <div className="mb-4">
            <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Study Tutor</h2>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>AI Assistant</p>
          </div>
        )}
        
        {isOpen && onNewChat && (
          <button
            onClick={onNewChat}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
              darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className={`flex-1 overflow-y-auto p-3 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {isOpen && (
          <div className={`text-xs font-medium mb-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Menu
          </div>
        )}
        
        {navigationItems.map((item) => {
          const isActive = currentView === item.value
          
          return (
            <button
              key={item.title}
              onClick={() => onViewChange(item.value)}
              className={`w-full flex items-center gap-3 mb-1 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? darkMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-600 text-white'
                  : darkMode 
                    ? 'text-gray-300 hover:bg-gray-800'
                    : 'text-gray-700 hover:bg-gray-200'
              } ${!isOpen && 'justify-center'}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span className="text-sm font-medium">{item.title}</span>}
            </button>
          )
        })}

        {/* Sessions List */}
        {isOpen && sessions.length > 0 && (
          <>
            <div className={`text-xs font-medium mt-6 mb-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Recent Sessions
            </div>
            {sessions.slice(0, 5).map((session) => (
              <button
                key={session.id}
                onClick={() => onSessionSelect?.(session.id)}
                className={`w-full text-left px-3 py-2 mb-1 rounded-lg transition-colors ${
                  darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="text-sm truncate">{session.name}</div>
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
        className={`hidden md:flex flex-col border-r transition-all duration-300 relative ${
          isOpen ? 'w-64' : 'w-16'
        } ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
      >
        <SidebarContent />
        
        <button
          onClick={onToggle}
          className={`absolute top-4 -right-3 w-6 h-6 rounded-full flex items-center justify-center transition-colors shadow-md ${
            darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
          }`}
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
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
          <aside className={`md:hidden fixed top-0 left-0 bottom-0 w-64 z-50 flex flex-col ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <button
              onClick={onClose}
              className={`absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}
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
