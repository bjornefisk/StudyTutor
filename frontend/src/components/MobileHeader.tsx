'use client'

import { Menu, Circle, Square } from 'lucide-react'

interface MobileHeaderProps {
  onToggleSidebar: () => void
  darkMode?: boolean
}

export default function MobileHeader({ onToggleSidebar, darkMode = false }: MobileHeaderProps) {
  return (
    <header className={`md:hidden border-b-4 border-black px-4 py-3 flex items-center justify-between ${
      darkMode ? 'bg-gray-800' : 'bg-white'
    }`}>
      <button
        onClick={onToggleSidebar}
        className="p-2 bg-yellow-400 border-2 border-black hover:bg-red-600 hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      
      <div className="flex items-center gap-2">
        <Circle className="w-3 h-3 fill-red-600 text-red-600" />
        <Square className="w-3 h-3 fill-blue-600 text-blue-600" />
        <span className={`font-black uppercase text-sm tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>Study</span>
      </div>
      
      <div className="w-10" />
    </header>
  )
}
