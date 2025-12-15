'use client'

import { Menu } from 'lucide-react'

interface MobileHeaderProps {
  onToggleSidebar: () => void
  darkMode?: boolean
}

export default function MobileHeader({ onToggleSidebar, darkMode = false }: MobileHeaderProps) {
  return (
    <header className={`md:hidden border-b px-4 py-3 flex items-center justify-between ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <button
        onClick={onToggleSidebar}
        className={`p-2 rounded-lg transition-colors ${
          darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
        }`}
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      
      <h1 className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Study Tutor
      </h1>
      
      <div className="w-10" />
    </header>
  )
}
